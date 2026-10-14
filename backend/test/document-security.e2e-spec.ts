import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestApp, resetDatabase, resetRateLimits, strongPassword, uniqueEmail } from "./helpers/app";
import { PropertiesService } from "../src/properties/properties.service";
import type { PrismaService } from "../src/prisma/prisma.service";

describe("Private documents and attachment integrity", () => {
  let app: INestApplication, prisma: PrismaService, directory: string;
  const server = () => app.getHttpServer();
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "a7-private-docs-"));
    process.env.UPLOAD_DIR = directory;
    ({ app, prisma } = await createTestApp());
  });
  afterAll(async () => { await app.close(); await rm(directory, { recursive: true, force: true }); });
  beforeEach(async () => { await resetDatabase(prisma); resetRateLimits(app); });
  async function actor(role: "SEEKER" | "LISTER" = "LISTER") {
    const result = await request(server()).post("/api/v1/auth/register").send({ email: uniqueEmail("document-audit"), password: strongPassword, firstName: "Document", lastName: "Test", role }).expect(201);
    return { id: result.body.data.user.id as string, token: result.body.data.accessToken as string };
  }
  async function upload(token: string, kind = "property-document") {
    const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#123B73" } }).png().toBuffer();
    const result = await request(server()).post(`/api/v1/uploads/${kind}`).set("Authorization", `Bearer ${token}`).attach("file", png, "test.png").expect(201);
    return result.body.data as { id: string; url: string; storageKey: string };
  }
  const payload = { title: "Private audit draft", description: "An isolated test draft for ownership attachment validation.", propertyType: "HOUSE", listingType: "SALE", price: 100, bedrooms: 1, bathrooms: 1, areaSqft: 100, address: "Test address", city: "Yangon", township: "Bahan" };

  it("blocks public document media, authorizes owner/admin downloads, and keeps images public", async () => {
    const owner = await actor(), other = await actor();
    for (const kind of ["property-document", "identification"]) {
      const asset = await upload(owner.token, kind);
      await request(server()).head(`/media/${asset.storageKey}`).expect(404);
      await request(server()).get("/api/v1/uploads/document").query({ url: asset.url }).expect(401);
      await request(server()).get("/api/v1/uploads/document").query({ url: asset.url }).set("Authorization", `Bearer ${other.token}`).expect(403);
      await request(server()).get("/api/v1/uploads/document").query({ url: asset.url }).set("Authorization", `Bearer ${owner.token}`).expect(200).expect("Content-Type", /image\/webp/).expect("Cache-Control", /private, no-store/);
      await prisma.user.update({ where: { id: other.id }, data: { role: "ADMIN" } });
      // Authorization uses the database role; no fabricated admin token is needed.
      await request(server()).get("/api/v1/uploads/document").query({ url: asset.url }).set("Authorization", `Bearer ${other.token}`).expect(200);
      await prisma.user.update({ where: { id: other.id }, data: { role: "LISTER" } });
    }
    const image = await upload(owner.token, "property-image");
    await request(server()).get(`/media/${image.storageKey}`).expect(200);
    await request(server()).get("/api/v1/uploads/document").query({ url: image.url }).set("Authorization", `Bearer ${owner.token}`).expect(404);
  });

  it("rejects missing, foreign, wrong-kind and URL-mismatched identity assets without creating reviews", async () => {
    const owner = await actor(), other = await actor();
    const own = await upload(owner.token, "identification");
    const foreign = await upload(other.token, "identification");
    const image = await upload(owner.token, "property-image");
    for (const input of [{ documentAssetId: "missing", documentUrl: own.url }, { documentAssetId: foreign.id, documentUrl: foreign.url }, { documentAssetId: image.id, documentUrl: image.url }, { documentAssetId: own.id, documentUrl: "https://example.invalid/not-the-upload" }]) {
      await request(server()).post("/api/v1/users/me/verification-document").set("Authorization", `Bearer ${owner.token}`).send({ ...input, documentType: "NATIONAL_ID" }).expect(400);
    }
    expect(await prisma.verificationDocument.count()).toBe(0);
    expect((await prisma.uploadedAsset.findUniqueOrThrow({ where: { id: foreign.id } })).consumedAt).toBeNull();
  });

  it("submits a real identity document as pending and exposes reviewed status without document URLs in auth", async () => {
    const owner = await actor(), asset = await upload(owner.token, "identification");
    const input = { documentAssetId: asset.id, documentUrl: asset.url, documentType: "NATIONAL_ID" };
    const [created, retried] = await Promise.all([0, 1].map(() => request(server()).post("/api/v1/users/me/verification-document").set("Authorization", `Bearer ${owner.token}`).send(input).expect(201)));
    expect(created.body.data.status).toBe("PENDING");
    expect(retried.body.data.id).toBe(created.body.data.id);
    expect(await prisma.verificationDocument.count()).toBe(1);
    expect((await prisma.uploadedAsset.findUniqueOrThrow({ where: { id: asset.id } })).consumedAt).not.toBeNull();
    await prisma.verificationDocument.update({ where: { id: created.body.data.id }, data: { status: "VERIFIED" } });
    const me = await request(server()).get("/api/v1/auth/me").set("Authorization", `Bearer ${owner.token}`).expect(200);
    expect(me.body.data.verificationDocs).toEqual([{ status: "VERIFIED" }]);
  });

  it("retains existing document IDs and review results across unrelated listing edits", async () => {
    const owner = await actor(), asset = await upload(owner.token);
    const created = await request(server()).post("/api/v1/properties").set("Authorization", `Bearer ${owner.token}`).send({ ...payload, documents: [{ documentAssetId: asset.id, documentUrl: asset.url, documentType: "OWNERSHIP" }] }).expect(201);
    const document = created.body.data.documents[0];
    await prisma.propertyDocument.update({ where: { id: document.id }, data: { status: "VERIFIED" } });
    const updated = await request(server()).patch(`/api/v1/properties/${created.body.data.id}`).set("Authorization", `Bearer ${owner.token}`).send({ title: "Updated private audit draft", documents: [{ documentId: document.id, documentUrl: document.documentUrl, documentType: document.documentType }] }).expect(200);
    expect(updated.body.data.documents[0]).toMatchObject({ id: document.id, status: "VERIFIED" });
    const second = await request(server()).post("/api/v1/properties").set("Authorization", `Bearer ${owner.token}`).send(payload).expect(201);
    await request(server()).patch(`/api/v1/properties/${second.body.data.id}`).set("Authorization", `Bearer ${owner.token}`).send({ documents: [{ documentId: document.id, documentUrl: document.documentUrl, documentType: document.documentType }] }).expect(400);
    await request(server()).patch(`/api/v1/properties/${created.body.data.id}`).set("Authorization", `Bearer ${owner.token}`).send({ documents: [] }).expect(200);
    expect(await prisma.propertyDocument.count()).toBe(0);
  });

  it("rejects ownership-document URL substitution and unsupported PDF uploads", async () => {
    const owner = await actor(), asset = await upload(owner.token);
    await request(server()).post("/api/v1/properties").set("Authorization", `Bearer ${owner.token}`).send({ ...payload, documents: [{ documentAssetId: asset.id, documentUrl: "https://example.invalid/substituted", documentType: "OWNERSHIP" }] }).expect(400);
    expect(await prisma.property.count()).toBe(0);
    await request(server()).post("/api/v1/uploads/property-document").set("Authorization", `Bearer ${owner.token}`).attach("file", Buffer.from("%PDF-1.4\n%%EOF"), { filename: "test.pdf", contentType: "application/pdf" }).expect(400);
  });
  it("rolls listing writes back when attachment consumption fails", async () => {
    const owner = await actor(), asset = await upload(owner.token);
    const service = app.get(PropertiesService) as unknown as { consumeListingAssets: (...args: unknown[]) => Promise<void> };
    const fail = () => jest.spyOn(service, "consumeListingAssets").mockRejectedValueOnce(new Error("Injected attachment failure"));
    let spy = fail();
    try {
      await request(server()).post("/api/v1/properties").set("Authorization", `Bearer ${owner.token}`).send({ ...payload, documents: [{ documentAssetId: asset.id, documentUrl: asset.url, documentType: "OWNERSHIP" }] }).expect(500);
    } finally { spy.mockRestore(); }
    expect(await prisma.property.count()).toBe(0);
    expect(await prisma.propertyDocument.count()).toBe(0);
    expect((await prisma.uploadedAsset.findUniqueOrThrow({ where: { id: asset.id } })).consumedAt).toBeNull();
    const created = await request(server()).post("/api/v1/properties").set("Authorization", `Bearer ${owner.token}`).send(payload).expect(201);
    spy = fail();
    try {
      await request(server()).patch(`/api/v1/properties/${created.body.data.id}`).set("Authorization", `Bearer ${owner.token}`).send({ title: "This edit must roll back", documents: [{ documentAssetId: asset.id, documentUrl: asset.url, documentType: "OWNERSHIP" }] }).expect(500);
    } finally { spy.mockRestore(); }
    expect((await prisma.property.findUniqueOrThrow({ where: { id: created.body.data.id } })).title).toBe(payload.title);
    expect(await prisma.propertyDocument.count()).toBe(0);
  });

});
