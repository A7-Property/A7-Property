import type { INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import request from "supertest";
import { AuthGuard } from "../src/common/auth.guard";
import { PrismaService } from "../src/prisma/prisma.service";
import { UploadsModule } from "../src/uploads/uploads.module";
import { UploadsService } from "../src/uploads/uploads.service";
import { UserRole } from "../src/generated/prisma/enums";

// Exercise real HTTP routing, JWT verification, guard ordering and rate-limit storage.
// Only persistence/image processing are mocked; no live database or files are modified.
describe("Property image upload limits", () => {
  let app: INestApplication;
  let jwt: JwtService;
  const oldSecret = process.env.JWT_ACCESS_SECRET;
  const saveImage = jest.fn().mockResolvedValue({ id: "asset", url: "/photo.webp" });
  const users = new Map([
    ["alice", { id: "alice", role: UserRole.LISTER, isActive: true, tokenVersion: 0 }],
    ["bob", { id: "bob", role: UserRole.LISTER, isActive: true, tokenVersion: 0 }],
    ["seeker", { id: "seeker", role: UserRole.SEEKER, isActive: true, tokenVersion: 0 }],
  ]);

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = "upload-throttle-test-secret";
    const testingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: process.env.JWT_ACCESS_SECRET }), ThrottlerModule.forRoot([{ limit: 60, ttl: 60_000 }]), UploadsModule],
      providers: [
        { provide: PrismaService, useValue: { user: { findUnique: jest.fn(({ where }: { where: { id: string } }) => users.get(where.id)) } } },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: AuthGuard },
      ],
    }).overrideProvider(UploadsService).useValue({ saveImage }).compile();
    app = testingModule.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    jwt = testingModule.get(JwtService);
  });

  afterEach(async () => {
    await app?.close();
    if (oldSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = oldSecret;
  });

  const token = (id: string, ver = 0) => jwt.sign({ sub: id, type: "access", ver, role: UserRole.LISTER });
  const upload = (accessToken?: string) => {
    const req = request(app.getHttpServer()).post("/api/v1/uploads/property-image");
    if (accessToken) req.set("Authorization", `Bearer ${accessToken}`);
    return req;
  };

  it("allows a full 20-photo batch and isolates accounts sharing an IP", async () => {
    const alice = token("alice");
    for (let i = 0; i < 20; i++) await upload(alice).expect(201);
    for (let i = 0; i < 10; i++) await upload(alice).expect(201);
    const blocked = await upload(alice).expect(429);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(blocked.body.message).toContain("wait one minute");
    // A different token for the same verified account cannot reset the quota.
    const renewed = jwt.sign({ sub: "alice", type: "access", ver: 0, jti: "new-session" });
    await upload(renewed).expect(429);
    for (let i = 0; i < 20; i++) await upload(token("bob")).expect(201);
    expect(saveImage).toHaveBeenCalledTimes(50);
    expect(saveImage.mock.calls.at(-1)?.[0]).toBe("bob");
  });

  it("does not trust forged, revoked, missing or wrong-role credentials", async () => {
    const forged = new JwtService({ secret: "wrong-secret" }).sign({ sub: "alice", type: "access", ver: 0 });
    await upload(forged).expect(401);
    await upload(token("alice", 1)).expect(401);
    await upload().set("X-User-Id", "alice").expect(401);
    await upload(token("seeker")).expect(403);
    expect(saveImage).not.toHaveBeenCalled();
    for (let i = 0; i < 30; i++) await upload(token("alice")).expect(201);
  });

  it("retains IP abuse protection before authentication", async () => {
    for (let i = 0; i < 120; i++) await upload().expect(401);
    const blocked = await upload().expect(429);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(saveImage).not.toHaveBeenCalled();
  });
});
