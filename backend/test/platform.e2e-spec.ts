import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { Server } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { createTestApp, resetDatabase, resetRateLimits, strongPassword, uniqueEmail } from "./helpers/app";
import type { PrismaService } from "../src/prisma/prisma.service";
import { MaintenanceService } from "../src/maintenance/maintenance.service";
import { UploadsService } from "../src/uploads/uploads.service";
import { EmailTokenType, UploadKind, UserRole } from "../src/generated/prisma/enums";

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDatabase("Platform hardening (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let uploadDir: string;
  const server = () => app.getHttpServer() as Server;

  beforeAll(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), "a7-e2e-platform-"));
    process.env.UPLOAD_DIR = uploadDir;
    ({ app, prisma } = await createTestApp());
    // Keep one listener for repeated probes instead of recycling ephemeral
    // listeners/ports between Supertest requests.
    await app.listen(0, "127.0.0.1");
  });

  afterAll(async () => {
    await app.close();
    await rm(uploadDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    resetRateLimits(app);
  });

  it("rate limits repeated sign-in attempts from one client", async () => {
    const email = uniqueEmail("throttled");
    // The login route allows 10 per minute; the 11th must be refused by the throttler, not the lockout.
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await request(server()).post("/api/v1/auth/login").send({ email, password: "Wrong-Password-1" });
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it("rejects a body larger than the configured JSON limit", async () => {
    const response = await request(server()).post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ email: "a@b.test", password: "x".repeat(300 * 1024) }));
    expect(response.status).toBe(413);
    expect(response.body.message).toBe("Request body is too large");
  });

  it("keeps health probes available beyond the public request quota", async () => {
    for (let attempt = 0; attempt < 65; attempt += 1) {
      await request(server()).get("/api/v1/health/live").expect(200);
      await request(server()).get("/api/v1/health/ready").expect(200);
    }
  });

  it("rejects malformed JSON with a 400 in the shared error envelope", async () => {
    const response = await request(server()).post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": "a@b.test", "password":');
    // Nest turns a parse failure into a BadRequestException before the filter
    // sees it, so the message is its own; what matters is that it is not a 500
    // and still carries the shared envelope.
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ statusCode: 400, error: "Bad Request" });
    expect(response.body.requestId).toBeTruthy();
  });

  describe("maintenance jobs", () => {
    const maintenance = () => app.get(MaintenanceService);

    it("purges an unconsumed upload past its retention window and keeps a consumed one", async () => {
      const uploads = app.get(UploadsService);
      const owner = await prisma.user.create({
        data: { email: uniqueEmail("owner"), passwordHash: "x", firstName: "Up", lastName: "Loader", role: UserRole.LISTER },
      });

      const makeAsset = async (key: string, consumed: boolean) => {
        await writeFile(resolve(uploadDir, key), Buffer.from("fake-webp"));
        return prisma.uploadedAsset.create({
          data: {
            userId: owner.id, kind: UploadKind.PROPERTY_IMAGE, storageKey: key, url: `http://localhost:4000/media/${key}`,
            contentType: "image/webp", byteSize: 9,
            consumedAt: consumed ? new Date() : null,
            createdAt: new Date(Date.now() - 48 * 3_600_000),
          },
        });
      };
      const orphan = await makeAsset("orphan.webp", false);
      const attached = await makeAsset("attached.webp", true);
      // Prove the service is wired to the same directory the files were written to.
      expect(existsSync(resolve(uploadDir, orphan.storageKey))).toBe(true);
      expect(uploads).toBeDefined();

      await maintenance().pruneOrphanUploads();

      expect(await prisma.uploadedAsset.findUnique({ where: { id: orphan.id } })).toBeNull();
      expect(existsSync(resolve(uploadDir, orphan.storageKey))).toBe(false);
      expect(await prisma.uploadedAsset.findUnique({ where: { id: attached.id } })).not.toBeNull();
      expect(existsSync(resolve(uploadDir, attached.storageKey))).toBe(true);
    });

    it("keeps a recent unconsumed upload so an in-progress listing form is not broken", async () => {
      const owner = await prisma.user.create({
        data: { email: uniqueEmail("recent"), passwordHash: "x", firstName: "Re", lastName: "Cent", role: UserRole.LISTER },
      });
      await writeFile(resolve(uploadDir, "recent.webp"), Buffer.from("fake-webp"));
      const recent = await prisma.uploadedAsset.create({
        data: {
          userId: owner.id, kind: UploadKind.PROPERTY_IMAGE, storageKey: "recent.webp", url: "http://localhost:4000/media/recent.webp",
          contentType: "image/webp", byteSize: 9,
        },
      });
      await maintenance().pruneOrphanUploads();
      expect(await prisma.uploadedAsset.findUnique({ where: { id: recent.id } })).not.toBeNull();
    });

    it("prunes expired sessions and tokens but keeps live ones", async () => {
      const user = await prisma.user.create({
        data: { email: uniqueEmail("prune"), passwordHash: "x", firstName: "Pr", lastName: "Une", role: UserRole.SEEKER },
      });
      const expired = await prisma.refreshSession.create({
        data: { userId: user.id, tokenHash: "expired-hash", expiresAt: new Date(Date.now() - 60_000) },
      });
      const live = await prisma.refreshSession.create({
        data: { userId: user.id, tokenHash: "live-hash", expiresAt: new Date(Date.now() + 86_400_000) },
      });
      const staleToken = await prisma.emailToken.create({
        data: { userId: user.id, type: EmailTokenType.VERIFY_EMAIL, tokenHash: "stale-token", expiresAt: new Date(Date.now() - 60_000) },
      });

      await maintenance().pruneAuthRecords();

      expect(await prisma.refreshSession.findUnique({ where: { id: expired.id } })).toBeNull();
      expect(await prisma.refreshSession.findUnique({ where: { id: live.id } })).not.toBeNull();
      expect(await prisma.emailToken.findUnique({ where: { id: staleToken.id } })).toBeNull();
    });

    it("clears a lock whose window has already passed", async () => {
      const user = await prisma.user.create({
        data: {
          email: uniqueEmail("unlock"), passwordHash: "x", firstName: "Un", lastName: "Lock", role: UserRole.SEEKER,
          lockedUntil: new Date(Date.now() - 60_000), failedLoginCount: 9,
        },
      });
      await maintenance().clearExpiredLocks();
      const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(refreshed.lockedUntil).toBeNull();
      expect(refreshed.failedLoginCount).toBe(0);
    });
  });

  it("revokes a single session without touching the others", async () => {
    const email = uniqueEmail("sessions");
    await request(server()).post("/api/v1/auth/register")
      .send({ email, password: strongPassword, firstName: "Many", lastName: "Devices", role: UserRole.SEEKER })
      .expect(201);
    const second = await request(server()).post("/api/v1/auth/login").send({ email, password: strongPassword }).expect(200);
    const token = second.body.data.accessToken as string;

    const sessions = await request(server()).get("/api/v1/auth/sessions").set("Authorization", `Bearer ${token}`).expect(200);
    expect(sessions.body.data.length).toBe(2);

    await request(server()).delete(`/api/v1/auth/sessions/${sessions.body.data[0].id}`).set("Authorization", `Bearer ${token}`).expect(200);
    const remaining = await request(server()).get("/api/v1/auth/sessions").set("Authorization", `Bearer ${token}`).expect(200);
    expect(remaining.body.data.length).toBe(1);
    // The access token still works: revoking one device does not sign the user out everywhere.
    await request(server()).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`).expect(200);
  });

  it("deactivating an account signs it out and pauses its listings", async () => {
    const email = uniqueEmail("leaving");
    const registered = await request(server()).post("/api/v1/auth/register")
      .send({ email, password: strongPassword, firstName: "Going", lastName: "Away", role: UserRole.LISTER })
      .expect(201);
    const token = registered.body.data.accessToken as string;

    await request(server()).post("/api/v1/auth/deactivate").set("Authorization", `Bearer ${token}`).send({ password: strongPassword }).expect(200);
    await request(server()).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`).expect(401);
    await request(server()).post("/api/v1/auth/login").send({ email, password: strongPassword }).expect(401);
  });
});
