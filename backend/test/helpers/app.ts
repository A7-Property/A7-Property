import { assertDisposableDatabase } from "./database-safety";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ThrottlerStorage } from "@nestjs/throttler";
import type { ThrottlerStorageService } from "@nestjs/throttler/dist/throttler.service";
import cookieParser from "cookie-parser";
import express from "express";
import { AppModule } from "../../src/app.module";
import { HttpExceptionFilter } from "../../src/common/http-exception.filter";
import { PrismaService } from "../../src/prisma/prisma.service";
import { assignRequestId } from "../../src/common/request-context";
import { freshDatabaseProvider } from "./fresh-databases";
import { resolve } from "node:path";
import { UploadsService } from "../../src/uploads/uploads.service";

const freshDatabases = new WeakMap<PrismaService, () => Promise<void>>();

/**
 * Boots the real application against the real database, mirroring the
 * middleware and pipes that `main.ts` installs so the suite exercises the same
 * validation, error shape and cookie behaviour production does.
 *
 * Scheduled jobs are off: tests must not race a cleanup sweep. The throttler
 * stays active and is reset per test by `resetRateLimits`, since a suite makes
 * far more requests per minute than a real client would.
 */
export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  assertDisposableDatabase();
  process.env.ENABLE_JOBS = "false";
  process.env.MAIL_DRIVER = "log";
  process.env.STORAGE_DRIVER = "local";

  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (process.env.A7_E2E_FRESH_DATABASES === "true") {
    const fresh = await freshDatabaseProvider();
    builder.overrideProvider(PrismaService).useValue(fresh.prisma);
    freshDatabases.set(fresh.prisma, fresh.nextDatabase);
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication({ bodyParser: false });
  app.setGlobalPrefix("api/v1");
  app.use(assignRequestId);
  app.use(cookieParser());
  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.use("/media", app.get(UploadsService).publicMediaGate(), express.static(resolve(process.cwd(), process.env.UPLOAD_DIR ?? "uploads"), { index: false, dotfiles: "deny" }));
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Clears every table the API writes, leaving the schema in place. */
export async function resetDatabase(prisma: PrismaService) {
  assertDisposableDatabase();
  const nextDatabase = freshDatabases.get(prisma);
  if (nextDatabase) {
    await nextDatabase();
    return;
  }
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "AuditLog", "LoginAttempt", "Message", "Conversation", "Viewing", "Inquiry",
      "SavedProperty", "PropertyAmenity", "PropertyImage", "Property", "UploadedAsset",
      "EmailToken", "RefreshSession", "User" RESTART IDENTITY CASCADE
  `);
}

/**
 * Clears the in-memory rate-limit counters so one test cannot throttle the next.
 * The service keeps hit timestamps in a second map alongside the public one, so
 * both have to go for the counters to actually reset.
 */
export function resetRateLimits(app: INestApplication) {
  const storage = app.get<ThrottlerStorageService>(ThrottlerStorage, { strict: false });
  storage.storage?.clear();
  (storage as unknown as { hitExpirations?: Map<string, unknown> }).hitExpirations?.clear();
}

export const strongPassword = "Test-Password-2026";

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}
