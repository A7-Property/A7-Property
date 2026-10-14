import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AuditService } from "../src/audit/audit.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { PropertyStatus } from "../src/generated/prisma/enums";
import { PropertiesService } from "../src/properties/properties.service";
import { CreatePropertyDto, PropertyQueryDto } from "../src/properties/dto";

describe("PropertiesService", () => {
  const prisma = { property: { count: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() }, uploadedAsset: { findMany: jest.fn() }, $transaction: jest.fn() };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new PropertiesService(prisma as unknown as PrismaService, audit as unknown as AuditService);

  beforeEach(() => jest.resetAllMocks());

  it("only lists published records with bounded pagination", async () => {
    prisma.$transaction.mockResolvedValue([0, []]);
    const result = await service.list(Object.assign(new PropertyQueryDto(), { page: 2, limit: 10 }));
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 0, totalPages: 0 });
    expect(prisma.property.count).toHaveBeenCalledWith({ where: expect.objectContaining({ status: PropertyStatus.PUBLISHED }) });
    expect(prisma.property.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
  });

  it("rejects inverted price ranges", async () => {
    await expect(service.list(Object.assign(new PropertyQueryDto(), { minPrice: 200, maxPrice: 100 }))).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects edits by another lister", async () => {
    prisma.property.findUnique.mockResolvedValue({ id: "p1", ownerId: "owner-1", status: PropertyStatus.DRAFT, images: [] });
    await expect(service.update("owner-2", "p1", { title: "Other" })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects an image that was not uploaded by the listing owner", async () => {
    prisma.uploadedAsset.findMany.mockResolvedValue([]);
    await expect(service.create("owner-1", { images: [{ assetId: "other-owner-image" }] } as CreatePropertyDto)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.property.create).not.toHaveBeenCalled();
  });

  it("never includes ownership documents in a public collection", async () => {
    const record = { id: "p1", price: 100000, latitude: null, longitude: null, amenities: [], documents: [{ documentUrl: "test-private-document", documentType: "ownership" }] };
    prisma.$transaction.mockResolvedValue([1, [record]]);
    const result = await service.list(new PropertyQueryDto());
    expect(result.data[0].documents).toBeUndefined();
  });

  it("never includes ownership documents in public similar homes", async () => {
    prisma.property.findFirst.mockResolvedValue({ id: "p1", price: 100000, city: "Yangon", township: "Bahan", propertyType: "HOUSE", listingType: "SALE" });
    prisma.property.findMany.mockResolvedValue([{ id: "p2", price: 100000, latitude: null, longitude: null, amenities: [], documents: [{ documentUrl: "test-private-document", documentType: "ownership" }] }]);
    const result = await service.similar("p1", 6);
    expect(result[0].documents).toBeUndefined();
  });
});
