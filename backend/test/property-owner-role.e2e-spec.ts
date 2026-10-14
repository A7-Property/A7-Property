import type { INestApplication } from "@nestjs/common";
import { createTestApp, resetDatabase, uniqueEmail } from "./helpers/app";
import type { PrismaService } from "../src/prisma/prisma.service";
import { UserRole } from "../src/generated/prisma/enums";

describe("Database property ownership", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await createTestApp()); });
  afterAll(async () => { await app.close(); });
  beforeEach(async () => { await resetDatabase(prisma); });

  const user = (role: UserRole) => prisma.user.create({ data: {
    email: uniqueEmail("owner"), passwordHash: "test", firstName: "Test", lastName: "Owner", role,
  } });
  const listing = (ownerId: string) => prisma.property.create({ data: {
    ownerId, title: "Test", description: "Test", propertyType: "HOUSE", listingType: "SALE",
    price: 100, bedrooms: 1, bathrooms: 1, areaSqft: 100, address: "Test", city: "Yangon", township: "Bahan",
  } });

  it("rejects seeker ownership on insert and reassignment", async () => {
    const seeker = await user(UserRole.SEEKER);
    const lister = await user(UserRole.LISTER);
    await expect(listing(seeker.id)).rejects.toThrow();
    const property = await listing(lister.id);
    await expect(prisma.property.update({ where: { id: property.id }, data: { ownerId: seeker.id } })).rejects.toThrow();
    expect((await prisma.property.findUniqueOrThrow({ where: { id: property.id } })).ownerId).toBe(lister.id);
  });

  it("allows lister/admin owners and blocks downgrades until listings are removed", async () => {
    for (const role of [UserRole.LISTER, UserRole.ADMIN]) {
      const owner = await user(role);
      const property = await listing(owner.id);
      await expect(prisma.user.update({ where: { id: owner.id }, data: { role: UserRole.SEEKER } })).rejects.toThrow();
      await prisma.property.delete({ where: { id: property.id } });
      await prisma.user.update({ where: { id: owner.id }, data: { role: UserRole.SEEKER } });
    }
  });

  it("preserves ownership when insert races a role downgrade", async () => {
    const owner = await user(UserRole.LISTER);
    const results = await Promise.allSettled([
      listing(owner.id),
      prisma.user.update({ where: { id: owner.id }, data: { role: UserRole.SEEKER } }),
    ]);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    const current = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
    if (current.role === UserRole.SEEKER) expect(await prisma.property.count({ where: { ownerId: owner.id } })).toBe(0);
  });
});
