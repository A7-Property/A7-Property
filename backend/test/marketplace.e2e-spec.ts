import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { createTestApp, resetDatabase, resetRateLimits, strongPassword, uniqueEmail } from "./helpers/app";
import type { PrismaService } from "../src/prisma/prisma.service";
import { AuditAction, PropertyStatus, UserRole, VerificationStatus } from "../src/generated/prisma/enums";

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

interface Actor { id: string; token: string; email: string }

describeIfDatabase("Marketplace (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let uploadDir: string;
  const server = () => app.getHttpServer() as Server;

  beforeAll(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), "a7-e2e-uploads-"));
    process.env.UPLOAD_DIR = uploadDir;
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
    await rm(uploadDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    resetRateLimits(app);
  });

  /** Registers an account and, by default, marks its email verified so gated routes are reachable. */
  async function actor(role: typeof UserRole.SEEKER | typeof UserRole.LISTER, options: { verified?: boolean } = {}): Promise<Actor> {
    const email = uniqueEmail(role.toLowerCase());
    const response = await request(server()).post("/api/v1/auth/register")
      .send({ email, password: strongPassword, firstName: "Test", lastName: role === UserRole.SEEKER ? "Seeker" : "Lister", address: "Test address, Yangon", role })
      .expect(201);
    const id = response.body.data.user.id as string;
    if (options.verified !== false) await prisma.user.update({ where: { id }, data: { emailVerifiedAt: new Date() } });
    return { id, token: response.body.data.accessToken as string, email };
  }

  async function admin(): Promise<Actor> {
    const seeker = await actor(UserRole.SEEKER);
    await prisma.user.update({ where: { id: seeker.id }, data: { role: UserRole.ADMIN } });
    // The role lives in the token, so sign in again to pick it up.
    const login = await request(server()).post("/api/v1/auth/login").send({ email: seeker.email, password: strongPassword }).expect(200);
    return { ...seeker, token: login.body.data.accessToken as string };
  }

  async function uploadImage(token: string) {
    const png = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#197650" } }).png().toBuffer();
    const response = await request(server()).post("/api/v1/uploads/property-image")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", png, { filename: "home.png", contentType: "image/png" })
      .expect(201);
    return response.body.data as { id: string; url: string; storageKey: string };
  }

  const draftPayload = (overrides: Record<string, unknown> = {}) => ({
    title: "Bright condo near Inya Lake",
    description: "A calm two bedroom condo with lake views, lift access and secure parking for residents.",
    propertyType: "CONDO",
    listingType: "RENT",
    price: 1_500_000,
    currency: "MMK",
    bedrooms: 2,
    bathrooms: 2,
    areaSqft: 1100,
    address: "12 Example Road",
    city: "Yangon",
    township: "Bahan",
    amenities: ["Lift", "Parking", "Lift"],
    ...overrides,
  });

  async function publishedProperty(lister: Actor, overrides: Record<string, unknown> = {}) {
    const asset = await uploadImage(lister.token);
    const created = await request(server()).post("/api/v1/properties")
      .set("Authorization", `Bearer ${lister.token}`)
      .send(draftPayload({ images: [{ assetId: asset.id }], ...overrides }))
      .expect(201);
    const id = created.body.data.id as string;
    await request(server()).post(`/api/v1/properties/${id}/publish`).set("Authorization", `Bearer ${lister.token}`).expect(201);
    return id;
  }

  describe("listing lifecycle", () => {
    it("stores ownership documents for the lister while hiding them from public reads", async () => {
      const lister = await actor(UserRole.LISTER);
      const png = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#197650" } }).png().toBuffer();
      const uploaded = await request(server()).post("/api/v1/uploads/property-document")
        .set("Authorization", `Bearer ${lister.token}`)
        .attach("file", png, { filename: "test-document.png", contentType: "image/png" })
        .expect(201);
      const document = uploaded.body.data;
      const withDocument = await publishedProperty(lister, {
        documents: [{ documentAssetId: document.id, documentUrl: document.url, documentType: "ownership" }],
      });
      const another = await publishedProperty(lister);
      const mine = await request(server()).get("/api/v1/properties/mine").set("Authorization", `Bearer ${lister.token}`).expect(200);
      expect(mine.body.data.find((property: { id: string }) => property.id === withDocument).documents).toHaveLength(1);
      const detail = await request(server()).get(`/api/v1/properties/${withDocument}`).expect(200);
      expect(detail.body.data).not.toHaveProperty("documents");
      const publicList = await request(server()).get("/api/v1/properties").expect(200);
      expect(JSON.stringify(publicList.body.data)).not.toContain(document.url);
      const similar = await request(server()).get(`/api/v1/properties/${another}/similar`).expect(200);
      expect(similar.body.data.some((property: { id: string }) => property.id === withDocument)).toBe(true);
      expect(JSON.stringify(similar.body.data)).not.toContain(document.url);
    });

    it("creates a draft that is not publicly visible, then publishes it", async () => {
      const lister = await actor(UserRole.LISTER);
      const asset = await uploadImage(lister.token);

      const created = await request(server()).post("/api/v1/properties")
        .set("Authorization", `Bearer ${lister.token}`)
        .send(draftPayload({ images: [{ assetId: asset.id }] }))
        .expect(201);
      const id = created.body.data.id as string;
      expect(created.body.data.status).toBe(PropertyStatus.DRAFT);
      expect(created.body.data.verificationStatus).toBe(VerificationStatus.UNVERIFIED);
      // Duplicate amenity names are collapsed.
      expect(created.body.data.amenities.sort()).toEqual(["Lift", "Parking"]);

      await request(server()).get(`/api/v1/properties/${id}`).expect(404);
      const beforePublish = await request(server()).get("/api/v1/properties").expect(200);
      expect(beforePublish.body.data).toHaveLength(0);

      await request(server()).post(`/api/v1/properties/${id}/publish`).set("Authorization", `Bearer ${lister.token}`).expect(201);
      await request(server()).get(`/api/v1/properties/${id}`).expect(200);
      const afterPublish = await request(server()).get("/api/v1/properties").expect(200);
      expect(afterPublish.body.data).toHaveLength(1);
      expect(afterPublish.body.meta).toMatchObject({ page: 1, total: 1, totalPages: 1 });
    });

    it("refuses to publish without an image", async () => {
      const lister = await actor(UserRole.LISTER);
      const created = await request(server()).post("/api/v1/properties")
        .set("Authorization", `Bearer ${lister.token}`)
        .send(draftPayload())
        .expect(201);
      const response = await request(server()).post(`/api/v1/properties/${created.body.data.id}/publish`)
        .set("Authorization", `Bearer ${lister.token}`)
        .expect(400);
      expect(response.body.message).toMatch(/at least one image/);
    });

    it("refuses to publish until the email is verified", async () => {
      const lister = await actor(UserRole.LISTER, { verified: false });
      const asset = await uploadImage(lister.token);
      const created = await request(server()).post("/api/v1/properties")
        .set("Authorization", `Bearer ${lister.token}`)
        .send(draftPayload({ images: [{ assetId: asset.id }] }))
        .expect(201);
      await request(server()).post(`/api/v1/properties/${created.body.data.id}/publish`)
        .set("Authorization", `Bearer ${lister.token}`)
        .expect(403);
    });

    it("stops one lister editing or archiving another lister's home", async () => {
      const owner = await actor(UserRole.LISTER);
      const intruder = await actor(UserRole.LISTER);
      const id = await publishedProperty(owner);

      await request(server()).patch(`/api/v1/properties/${id}`).set("Authorization", `Bearer ${intruder.token}`).send({ price: 1 }).expect(403);
      await request(server()).delete(`/api/v1/properties/${id}`).set("Authorization", `Bearer ${intruder.token}`).expect(403);
      expect((await prisma.property.findUniqueOrThrow({ where: { id } })).status).toBe(PropertyStatus.PUBLISHED);
    });

    it("rejects an image uploaded by a different lister", async () => {
      const owner = await actor(UserRole.LISTER);
      const other = await actor(UserRole.LISTER);
      const foreignAsset = await uploadImage(other.token);
      await request(server()).post("/api/v1/properties")
        .set("Authorization", `Bearer ${owner.token}`)
        .send(draftPayload({ images: [{ assetId: foreignAsset.id }] }))
        .expect(400);
    });

    it("re-encodes an upload to WebP and marks it consumed once attached", async () => {
      const lister = await actor(UserRole.LISTER);
      const asset = await uploadImage(lister.token);
      expect(asset.url).toMatch(/\.webp$/);
      expect((await prisma.uploadedAsset.findUniqueOrThrow({ where: { id: asset.id } })).consumedAt).toBeNull();

      await request(server()).post("/api/v1/properties")
        .set("Authorization", `Bearer ${lister.token}`)
        .send(draftPayload({ images: [{ assetId: asset.id }] }))
        .expect(201);
      expect((await prisma.uploadedAsset.findUniqueOrThrow({ where: { id: asset.id } })).consumedAt).toBeInstanceOf(Date);
    });

    it("rejects a non-image upload", async () => {
      const lister = await actor(UserRole.LISTER);
      await request(server()).post("/api/v1/uploads/property-image")
        .set("Authorization", `Bearer ${lister.token}`)
        .attach("file", Buffer.from("<script>not an image</script>"), { filename: "x.png", contentType: "image/png" })
        .expect(400);
      expect(await prisma.uploadedAsset.count()).toBe(0);
    });

    it("sends a verified listing back to review after an edit", async () => {
      const lister = await actor(UserRole.LISTER);
      const id = await publishedProperty(lister);
      await prisma.property.update({ where: { id }, data: { verificationStatus: VerificationStatus.VERIFIED } });

      const updated = await request(server()).patch(`/api/v1/properties/${id}`)
        .set("Authorization", `Bearer ${lister.token}`)
        .send({ price: 1_800_000 })
        .expect(200);
      expect(updated.body.data.verificationStatus).toBe(VerificationStatus.PENDING);
    });

    it("never lets a lister set verification status directly", async () => {
      const lister = await actor(UserRole.LISTER);
      const id = await publishedProperty(lister);
      await request(server()).patch(`/api/v1/properties/${id}`)
        .set("Authorization", `Bearer ${lister.token}`)
        .send({ verificationStatus: VerificationStatus.VERIFIED })
        .expect(400);
    });

    it("reports owner overview counters", async () => {
      const lister = await actor(UserRole.LISTER);
      await publishedProperty(lister);
      const response = await request(server()).get("/api/v1/properties/mine/overview").set("Authorization", `Bearer ${lister.token}`).expect(200);
      expect(response.body.data.properties.PUBLISHED).toBe(1);
      expect(response.body.data.properties.DRAFT).toBe(0);
      expect(response.body.data.inquiries).toEqual({ total: 0, new: 0 });
    });
  });

  describe("search filters", () => {
    it("filters by price, bedrooms, amenities and verified-only", async () => {
      const lister = await actor(UserRole.LISTER);
      const cheap = await publishedProperty(lister, { title: "Compact studio in Hlaing township", price: 400_000, bedrooms: 1, amenities: ["Lift"] });
      const pricey = await publishedProperty(lister, { title: "Spacious family home in Bahan", price: 3_000_000, bedrooms: 4, amenities: ["Lift", "Pool"] });
      await prisma.property.update({ where: { id: pricey }, data: { verificationStatus: VerificationStatus.VERIFIED } });

      const byPrice = await request(server()).get("/api/v1/properties?maxPrice=500000").expect(200);
      expect(byPrice.body.data.map((row: { id: string }) => row.id)).toEqual([cheap]);

      const byBedrooms = await request(server()).get("/api/v1/properties?bedrooms=3").expect(200);
      expect(byBedrooms.body.data.map((row: { id: string }) => row.id)).toEqual([pricey]);

      // Every requested amenity must be present, not just one of them.
      const byAmenities = await request(server()).get("/api/v1/properties?amenities=Lift,Pool").expect(200);
      expect(byAmenities.body.data.map((row: { id: string }) => row.id)).toEqual([pricey]);

      const verifiedOnly = await request(server()).get("/api/v1/properties?verifiedOnly=true").expect(200);
      expect(verifiedOnly.body.data.map((row: { id: string }) => row.id)).toEqual([pricey]);

      const sorted = await request(server()).get("/api/v1/properties?sort=price_asc").expect(200);
      expect(sorted.body.data.map((row: { id: string }) => row.id)).toEqual([cheap, pricey]);
    });

    it("rejects an inverted price range and an out-of-range limit", async () => {
      await request(server()).get("/api/v1/properties?minPrice=900&maxPrice=100").expect(400);
      await request(server()).get("/api/v1/properties?limit=500").expect(400);
    });
  });

  describe("seeker journeys", () => {
    it("saves and unsaves a home", async () => {
      const lister = await actor(UserRole.LISTER);
      const seeker = await actor(UserRole.SEEKER);
      const id = await publishedProperty(lister);

      await request(server()).post(`/api/v1/saved-properties/${id}`).set("Authorization", `Bearer ${seeker.token}`).expect(201);
      // Saving twice must stay idempotent rather than erroring on the unique constraint.
      await request(server()).post(`/api/v1/saved-properties/${id}`).set("Authorization", `Bearer ${seeker.token}`).expect(201);
      const ids = await request(server()).get("/api/v1/saved-properties/ids").set("Authorization", `Bearer ${seeker.token}`).expect(200);
      expect(ids.body.data).toEqual([id]);

      await request(server()).delete(`/api/v1/saved-properties/${id}`).set("Authorization", `Bearer ${seeker.token}`).expect(200);
      expect(await prisma.savedProperty.count()).toBe(0);
    });

    it("keeps a lister out of seeker-only routes", async () => {
      const lister = await actor(UserRole.LISTER);
      await request(server()).get("/api/v1/saved-properties").set("Authorization", `Bearer ${lister.token}`).expect(403);
    });

    it("sends an inquiry the lister can see and close", async () => {
      const lister = await actor(UserRole.LISTER);
      const seeker = await actor(UserRole.SEEKER);
      const id = await publishedProperty(lister);

      const inquiry = await request(server()).post("/api/v1/inquiries")
        .set("Authorization", `Bearer ${seeker.token}`)
        .send({ propertyId: id, subject: "Is it still available?", message: "I would like to visit this weekend." })
        .expect(201);

      const listerInbox = await request(server()).get("/api/v1/inquiries").set("Authorization", `Bearer ${lister.token}`).expect(200);
      expect(listerInbox.body.data).toHaveLength(1);
      const unread = await request(server()).get("/api/v1/inquiries/unread-count").set("Authorization", `Bearer ${lister.token}`).expect(200);
      expect(unread.body.data.count).toBe(1);

      await request(server()).patch(`/api/v1/inquiries/${inquiry.body.data.id}/status`)
        .set("Authorization", `Bearer ${lister.token}`)
        .send({ status: "CLOSED" })
        .expect(200);
    });

    it("hides another user's inquiry", async () => {
      const lister = await actor(UserRole.LISTER);
      const seeker = await actor(UserRole.SEEKER);
      const stranger = await actor(UserRole.SEEKER);
      const id = await publishedProperty(lister);
      const inquiry = await request(server()).post("/api/v1/inquiries")
        .set("Authorization", `Bearer ${seeker.token}`)
        .send({ propertyId: id, subject: "Private", message: "This should not leak to other seekers." })
        .expect(201);
      await request(server()).get(`/api/v1/inquiries/${inquiry.body.data.id}`).set("Authorization", `Bearer ${stranger.token}`).expect(403);
    });

    it("runs a viewing request through its allowed transitions only", async () => {
      const lister = await actor(UserRole.LISTER);
      const seeker = await actor(UserRole.SEEKER);
      const id = await publishedProperty(lister);
      const scheduledAt = new Date(Date.now() + 3 * 86_400_000).toISOString();

      const viewing = await request(server()).post("/api/v1/viewings")
        .set("Authorization", `Bearer ${seeker.token}`)
        .send({ propertyId: id, scheduledAt, note: "Afternoon works best." })
        .expect(201);
      const viewingId = viewing.body.data.id as string;

      // A second open request for the same home is refused.
      await request(server()).post("/api/v1/viewings")
        .set("Authorization", `Bearer ${seeker.token}`)
        .send({ propertyId: id, scheduledAt })
        .expect(409);

      // A seeker cannot confirm their own viewing.
      await request(server()).patch(`/api/v1/viewings/${viewingId}/status`).set("Authorization", `Bearer ${seeker.token}`).send({ status: "CONFIRMED" }).expect(403);
      await request(server()).patch(`/api/v1/viewings/${viewingId}/status`).set("Authorization", `Bearer ${lister.token}`).send({ status: "CONFIRMED" }).expect(200);
      await request(server()).patch(`/api/v1/viewings/${viewingId}/status`).set("Authorization", `Bearer ${lister.token}`).send({ status: "COMPLETED" }).expect(200);
      // COMPLETED is terminal.
      await request(server()).patch(`/api/v1/viewings/${viewingId}/status`).set("Authorization", `Bearer ${lister.token}`).send({ status: "CONFIRMED" }).expect(403);
    });

    it("rejects a viewing in the past", async () => {
      const lister = await actor(UserRole.LISTER);
      const seeker = await actor(UserRole.SEEKER);
      const id = await publishedProperty(lister);
      await request(server()).post("/api/v1/viewings")
        .set("Authorization", `Bearer ${seeker.token}`)
        .send({ propertyId: id, scheduledAt: new Date(Date.now() - 86_400_000).toISOString() })
        .expect(400);
    });

    it("exchanges messages and tracks unread counts per participant", async () => {
      const lister = await actor(UserRole.LISTER);
      const seeker = await actor(UserRole.SEEKER);
      const id = await publishedProperty(lister);

      const conversation = await request(server()).post("/api/v1/conversations")
        .set("Authorization", `Bearer ${seeker.token}`)
        .send({ propertyId: id })
        .expect(201);
      const conversationId = conversation.body.data.id as string;

      await request(server()).post(`/api/v1/conversations/${conversationId}/messages`)
        .set("Authorization", `Bearer ${seeker.token}`)
        .send({ body: "Hello, is parking included?" })
        .expect(201);

      const listerUnread = await request(server()).get("/api/v1/conversations/unread-count").set("Authorization", `Bearer ${lister.token}`).expect(200);
      expect(listerUnread.body.data.count).toBe(1);
      // The sender has nothing unread of their own.
      const seekerUnread = await request(server()).get("/api/v1/conversations/unread-count").set("Authorization", `Bearer ${seeker.token}`).expect(200);
      expect(seekerUnread.body.data.count).toBe(0);

      await request(server()).patch(`/api/v1/conversations/${conversationId}/read`).set("Authorization", `Bearer ${lister.token}`).expect(200);
      const afterRead = await request(server()).get("/api/v1/conversations/unread-count").set("Authorization", `Bearer ${lister.token}`).expect(200);
      expect(afterRead.body.data.count).toBe(0);
    });

    it("keeps an outsider out of a conversation", async () => {
      const lister = await actor(UserRole.LISTER);
      const seeker = await actor(UserRole.SEEKER);
      const stranger = await actor(UserRole.SEEKER);
      const id = await publishedProperty(lister);
      const conversation = await request(server()).post("/api/v1/conversations")
        .set("Authorization", `Bearer ${seeker.token}`)
        .send({ propertyId: id })
        .expect(201);
      await request(server()).get(`/api/v1/conversations/${conversation.body.data.id}/messages`)
        .set("Authorization", `Bearer ${stranger.token}`)
        .expect(403);
    });

    it("lets a lister open a thread from a viewing request and reply to it", async () => {
      const lister = await actor(UserRole.LISTER);
      const seeker = await actor(UserRole.SEEKER);
      const id = await publishedProperty(lister);
      const scheduledAt = new Date(Date.now() + 3 * 86_400_000).toISOString();

      const viewing = await request(server()).post("/api/v1/viewings")
        .set("Authorization", `Bearer ${seeker.token}`)
        .send({ propertyId: id, scheduledAt })
        .expect(201);
      const viewingId = viewing.body.data.id as string;

      // A lister never gets `POST /conversations` because that would allow
      // starting a thread with an arbitrary seeker; the viewing-seeded route is
      // the only legitimate entry.
      await request(server()).post("/api/v1/conversations")
        .set("Authorization", `Bearer ${lister.token}`)
        .send({ propertyId: id })
        .expect(403);

      const opened = await request(server()).post("/api/v1/conversations/from-viewing")
        .set("Authorization", `Bearer ${lister.token}`)
        .send({ viewingId })
        .expect(201);
      const conversationId = opened.body.data.id as string;

      // Opening twice must be idempotent — the CRM would otherwise create a
      // second thread each time the lister clicks reply.
      const reopened = await request(server()).post("/api/v1/conversations/from-viewing")
        .set("Authorization", `Bearer ${lister.token}`)
        .send({ viewingId })
        .expect(201);
      expect(reopened.body.data.id).toBe(conversationId);

      await request(server()).post(`/api/v1/conversations/${conversationId}/messages`)
        .set("Authorization", `Bearer ${lister.token}`)
        .send({ body: "Thanks for the request. Saturday morning works." })
        .expect(201);

      // The seeker now sees the lister's reply.
      const seekerUnread = await request(server()).get("/api/v1/conversations/unread-count")
        .set("Authorization", `Bearer ${seeker.token}`)
        .expect(200);
      expect(seekerUnread.body.data.count).toBe(1);
    });

    it("keeps a lister out of a viewing that is not theirs", async () => {
      const owner = await actor(UserRole.LISTER);
      const intruder = await actor(UserRole.LISTER);
      const seeker = await actor(UserRole.SEEKER);
      const id = await publishedProperty(owner);
      const viewing = await request(server()).post("/api/v1/viewings")
        .set("Authorization", `Bearer ${seeker.token}`)
        .send({ propertyId: id, scheduledAt: new Date(Date.now() + 2 * 86_400_000).toISOString() })
        .expect(201);

      await request(server()).post("/api/v1/conversations/from-viewing")
        .set("Authorization", `Bearer ${intruder.token}`)
        .send({ viewingId: viewing.body.data.id })
        .expect(403);
    });
  });

  describe("admin moderation", () => {
    it("verifies a listing, records the decision and surfaces it in the audit log", async () => {
      const lister = await actor(UserRole.LISTER);
      const moderator = await admin();
      const id = await publishedProperty(lister);

      const decided = await request(server()).patch(`/api/v1/admin/properties/${id}/verification`)
        .set("Authorization", `Bearer ${moderator.token}`)
        .send({ status: VerificationStatus.VERIFIED, note: "Documents checked." })
        .expect(200);
      expect(decided.body.data.verificationStatus).toBe(VerificationStatus.VERIFIED);

      const logs = await request(server()).get(`/api/v1/admin/audit-logs?action=${AuditAction.PROPERTY_VERIFICATION_CHANGED}`)
        .set("Authorization", `Bearer ${moderator.token}`)
        .expect(200);
      expect(logs.body.data[0]).toMatchObject({ targetId: id, actorId: moderator.id });
    });

    it("keeps non-admins out of every admin route", async () => {
      const lister = await actor(UserRole.LISTER);
      const seeker = await actor(UserRole.SEEKER);
      for (const token of [lister.token, seeker.token]) {
        await request(server()).get("/api/v1/admin/overview").set("Authorization", `Bearer ${token}`).expect(403);
        await request(server()).get("/api/v1/admin/users").set("Authorization", `Bearer ${token}`).expect(403);
      }
      await request(server()).get("/api/v1/admin/overview").expect(401);
    });

    it("suspending a lister pauses their listings and invalidates their token", async () => {
      const lister = await actor(UserRole.LISTER);
      const moderator = await admin();
      const id = await publishedProperty(lister);

      await request(server()).patch(`/api/v1/admin/users/${lister.id}/status`)
        .set("Authorization", `Bearer ${moderator.token}`)
        .send({ isActive: false, reason: "Reported listings" })
        .expect(200);

      expect((await prisma.property.findUniqueOrThrow({ where: { id } })).status).toBe(PropertyStatus.PAUSED);
      await request(server()).get("/api/v1/auth/me").set("Authorization", `Bearer ${lister.token}`).expect(401);
      await request(server()).post("/api/v1/auth/login").send({ email: lister.email, password: strongPassword }).expect(401);
      await request(server()).get(`/api/v1/properties/${id}`).expect(404);
    });

    it("refuses to let an admin suspend their own account", async () => {
      const moderator = await admin();
      await request(server()).patch(`/api/v1/admin/users/${moderator.id}/status`)
        .set("Authorization", `Bearer ${moderator.token}`)
        .send({ isActive: false })
        .expect(400);
    });

    it("reports platform-wide counters", async () => {
      const lister = await actor(UserRole.LISTER);
      const moderator = await admin();
      await publishedProperty(lister);
      const response = await request(server()).get("/api/v1/admin/overview").set("Authorization", `Bearer ${moderator.token}`).expect(200);
      expect(response.body.data.properties).toMatchObject({ total: 1, published: 1 });
      expect(response.body.data.users.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe("platform behaviour", () => {
    it("reports health without authentication", async () => {
      await request(server()).get("/api/v1/health/live").expect(200);
      const ready = await request(server()).get("/api/v1/health/ready").expect(200);
      expect(ready.body.data.checks.database).toBe("ok");
    });

    it("returns a 404 in the shared error shape for an unknown listing", async () => {
      const response = await request(server()).get("/api/v1/properties/does-not-exist").expect(404);
      expect(response.body).toMatchObject({ statusCode: 404, message: "Property not found" });
      expect(response.body.requestId).toBeTruthy();
    });
  });
});
