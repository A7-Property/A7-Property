import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestApp, resetDatabase, resetRateLimits, strongPassword, uniqueEmail } from "./helpers/app";
import type { PrismaService } from "../src/prisma/prisma.service";

describe("Profile photo upload", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let directory: string;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "a7-avatar-test-"));
    process.env.UPLOAD_DIR = directory;
    ({ app, prisma } = await createTestApp());
  });
  afterAll(async () => { await app.close(); await rm(directory, { recursive: true, force: true }); });
  beforeEach(async () => { await resetDatabase(prisma); resetRateLimits(app); });

  it("persists a seeker avatar, replaces it and removes the previous asset", async () => {
    const registered = await request(app.getHttpServer()).post("/api/v1/auth/register").send({
      email: uniqueEmail("avatar"), password: strongPassword, firstName: "Photo", lastName: "User", address: "Test address, Yangon", role: "SEEKER",
    }).expect(201);
    const token = registered.body.data.accessToken;
    const id = registered.body.data.user.id;
    const image = await sharp({ create: { width: 80, height: 60, channels: 3, background: "blue" } }).png().toBuffer();
    const upload = () => request(app.getHttpServer()).post("/api/v1/users/me/avatar")
      .set("Authorization", `Bearer ${token}`).attach("file", image, "photo.png").expect(201);
    const first = await upload();
    const second = await upload();
    expect(second.body.data.avatarUrl).not.toBe(first.body.data.avatarUrl);
    const me = await request(app.getHttpServer()).get("/api/v1/users/me").set("Authorization", `Bearer ${token}`).expect(200);
    expect(me.body.data.avatarUrl).toBe(second.body.data.avatarUrl);
    const assets = await prisma.uploadedAsset.findMany({ where: { userId: id, kind: "AVATAR" } });
    expect(assets).toHaveLength(1);
    expect(assets[0].consumedAt).not.toBeNull();
    await expect(sharp(join(directory, assets[0].storageKey)).metadata()).resolves.toMatchObject({ width: 512, height: 512, format: "webp" });
    await request(app.getHttpServer()).post("/api/v1/users/me/avatar").set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("not an image"), "fake.png").expect(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).avatarUrl).toBe(second.body.data.avatarUrl);
  });

  it("requires authentication", async () => {
    await request(app.getHttpServer()).post("/api/v1/users/me/avatar").expect(401);
  });
});
