import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Request } from "express";
import { Prisma } from "../generated/prisma/client";
import { AuditAction, PropertyStatus, UploadKind, UserRole, VerificationStatus } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreatePropertyDto, OwnerPropertyQueryDto, PropertyDocumentInput, PropertyImageInput, PropertyQueryDto, PropertySort, UpdatePropertyDto } from "./dto";
import { pageMeta } from "../common/pagination";

export const propertyInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  amenities: true,
  documents: { orderBy: { createdAt: "asc" as const } },
  owner: { select: { id: true, firstName: true, lastName: true, isAgent: true, phoneVerified: true, responseTimeMinutes: true } },
};

type PropertyRecord = Prisma.PropertyGetPayload<{ include: typeof propertyInclude }>;

export function presentProperty(property: PropertyRecord, scope: "public" | "lister" | "admin" = "public") {
  return {
    ...property,
    price: Number(property.price),
    latitude: property.latitude === null ? null : Number(property.latitude),
    longitude: property.longitude === null ? null : Number(property.longitude),
    amenities: property.amenities.map((item) => item.name),
    ...(scope === "public" ? { documents: undefined } : {}),
  };
}

const orderFor = (sort: PropertySort): Prisma.PropertyOrderByWithRelationInput => {
  switch (sort) {
    case PropertySort.PRICE_ASC: return { price: "asc" };
    case PropertySort.PRICE_DESC: return { price: "desc" };
    case PropertySort.AREA_DESC: return { areaSqft: "desc" };
    case PropertySort.OLDEST: return { createdAt: "asc" };
    default: return { createdAt: "desc" };
  }
};

/** Turns a Prisma groupBy result into a dense `{ [enum value]: count }` map, zero-filling absent groups. */
function countsByKey<T extends string>(rows: readonly Record<string, unknown>[], keys: readonly T[], key: string) {
  const found = new Map(rows.map((row) => [String(row[key]), Number((row._count as { _all?: number } | undefined)?._all ?? 0)]));
  return Object.fromEntries(keys.map((value) => [value, found.get(value) ?? 0])) as Record<T, number>;
}

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PropertyQueryDto) {
    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) throw new BadRequestException("minPrice must not exceed maxPrice");
    if (query.minArea !== undefined && query.maxArea !== undefined && query.minArea > query.maxArea) throw new BadRequestException("minArea must not exceed maxArea");
    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.PUBLISHED,
      ...(query.city && { city: { equals: query.city, mode: "insensitive" } }),
      ...(query.township && { township: { equals: query.township, mode: "insensitive" } }),
      ...(query.propertyType && { propertyType: query.propertyType }),
      ...(query.listingType && { listingType: query.listingType }),
      ...(query.furniture && { furniture: query.furniture }),
      ...(query.bedrooms !== undefined && { bedrooms: { gte: query.bedrooms } }),
      ...(query.bathrooms !== undefined && { bathrooms: { gte: query.bathrooms } }),
      ...(query.verifiedOnly && { verificationStatus: VerificationStatus.VERIFIED }),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined ? { price: { gte: query.minPrice, lte: query.maxPrice } } : {}),
      ...(query.minArea !== undefined || query.maxArea !== undefined ? { areaSqft: { gte: query.minArea, lte: query.maxArea } } : {}),
      // Every requested amenity must be present, so AND one relation filter per name.
      ...(query.amenities?.length && { AND: query.amenities.map((name) => ({ amenities: { some: { name: { equals: name, mode: "insensitive" as const } } } })) }),
      ...(query.search && { OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { city: { contains: query.search, mode: "insensitive" } },
        { township: { contains: query.search, mode: "insensitive" } },
        { address: { contains: query.search, mode: "insensitive" } },
      ] }),
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({ where, include: propertyInclude, orderBy: [orderFor(query.sort), { id: "asc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
    ]);
    return { data: records.map(property => presentProperty(property, "public")), meta: pageMeta(query.page, query.limit, total) };
  }

  async get(id: string) {
    const property = await this.prisma.property.findFirst({ where: { id, status: PropertyStatus.PUBLISHED }, include: propertyInclude });
    if (!property) throw new NotFoundException("Property not found");
    return presentProperty(property);
  }

  /** Published homes comparable to the given listing: same listing type, nearby price, same area or type. */
  async similar(id: string, limit: number) {
    const property = await this.prisma.property.findFirst({
      where: { id, status: PropertyStatus.PUBLISHED },
      select: { id: true, listingType: true, city: true, township: true, propertyType: true, price: true },
    });
    if (!property) throw new NotFoundException("Property not found");
    const price = Number(property.price);
    const records = await this.prisma.property.findMany({
      where: {
        id: { not: property.id },
        status: PropertyStatus.PUBLISHED,
        listingType: property.listingType,
        OR: [{ township: property.township }, { city: property.city }, { propertyType: property.propertyType }],
        price: { gte: price * 0.6, lte: price * 1.4 },
      },
      include: propertyInclude,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: limit,
    });
    return records.map(property => presentProperty(property, "public"));
  }

  /** The owner's own homes, drafts included. Archived listings stay hidden unless asked for. */
  async mine(ownerId: string, query: OwnerPropertyQueryDto) {
    const where: Prisma.PropertyWhereInput = {
      ownerId,
      ...(query.status ? { status: query.status } : { status: { not: PropertyStatus.ARCHIVED } }),
      ...(query.search && { title: { contains: query.search, mode: "insensitive" } }),
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({ where, include: propertyInclude, orderBy: { updatedAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit }),
    ]);
    return { data: records.map(p => presentProperty(p, "lister")), meta: pageMeta(query.page, query.limit, total) };
  }

  /** Counters for the owner/agent CRM overview. */
  async ownerOverview(ownerId: string) {
    const [byStatus, byVerification, inquiries, newInquiries, viewings, requestedViewings, saves] = await this.prisma.$transaction([
      this.prisma.property.groupBy({ by: ["status"], where: { ownerId }, _count: { _all: true }, orderBy: { status: "asc" } }),
      this.prisma.property.groupBy({ by: ["verificationStatus"], where: { ownerId, status: { not: PropertyStatus.ARCHIVED } }, _count: { _all: true }, orderBy: { verificationStatus: "asc" } }),
      this.prisma.inquiry.count({ where: { listerId: ownerId } }),
      this.prisma.inquiry.count({ where: { listerId: ownerId, status: "NEW" } }),
      this.prisma.viewing.count({ where: { listerId: ownerId } }),
      this.prisma.viewing.count({ where: { listerId: ownerId, status: "REQUESTED" } }),
      this.prisma.savedProperty.count({ where: { property: { ownerId } } }),
    ]);
    return {
      properties: countsByKey(byStatus, Object.values(PropertyStatus), "status"),
      verification: countsByKey(byVerification, Object.values(VerificationStatus), "verificationStatus"),
      inquiries: { total: inquiries, new: newInquiries },
      viewings: { total: viewings, requested: requestedViewings },
      savedByOthers: saves,
    };
  }

  async create(ownerId: string, input: CreatePropertyDto, request?: Request) {
    const { images = [], amenities = [], documents = [], ...data } = input;
    const imageRecords = await this.resolveImages(ownerId, images);

    const attachments = await this.resolveDocuments(ownerId, documents);

    const property = await this.prisma.$transaction(async (tx) => {
      const created = await tx.property.create({
        data: {
          ...data, ownerId, status: PropertyStatus.DRAFT, verificationStatus: VerificationStatus.UNVERIFIED,
          images: { create: imageRecords }, amenities: { create: this.cleanAmenities(amenities) },
          documents: { create: attachments.newDocuments },
        },
        include: propertyInclude,
      });
      await this.consumeListingAssets(tx, ownerId, images.map((image) => image.assetId).concat(attachments.assetIds));
      return created;
    });
    await this.audit.record({ action: AuditAction.PROPERTY_CREATED, actorId: ownerId, actorRole: UserRole.LISTER, targetType: "Property", targetId: property.id, request });
    return presentProperty(property, "lister");
  }

  async update(ownerId: string, id: string, input: UpdatePropertyDto, request?: Request) {
    const existing = await this.assertOwner(ownerId, id);
    if (existing.status === PropertyStatus.ARCHIVED) throw new BadRequestException("Archived property cannot be changed");
    const { images, amenities, documents, ...data } = input;
    const imageRecords = images ? await this.resolveImages(ownerId, images) : undefined;

    const attachments = documents ? await this.resolveDocuments(ownerId, documents, id) : undefined;

    const property = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.property.update({
        where: { id },
        data: {
          ...data,
          // A verified listing must be reviewed again after an edit.
          ...(existing.verificationStatus === VerificationStatus.VERIFIED && Object.keys(input).length > 0 && { verificationStatus: VerificationStatus.PENDING }),
          ...(imageRecords && { images: { deleteMany: {}, create: imageRecords } }),
          ...(amenities && { amenities: { deleteMany: {}, create: this.cleanAmenities(amenities) } }),
          ...(attachments && { documents: { deleteMany: { id: { notIn: attachments.retainedIds } }, create: attachments.newDocuments } }),
        },
        include: propertyInclude,
      });
      await this.consumeListingAssets(tx, ownerId, (images ?? []).map((image) => image.assetId).concat(attachments?.assetIds ?? []));
      return updated;
    });
    await this.audit.record({
      action: AuditAction.PROPERTY_UPDATED, actorId: ownerId, actorRole: UserRole.LISTER, targetType: "Property", targetId: id,
      metadata: { fields: Object.keys(input) }, request,
    });
    return presentProperty(property, "lister");
  }

  async changeStatus(ownerId: string, id: string, status: PropertyStatus, request?: Request) {
    const property = await this.assertOwner(ownerId, id);
    if (property.status === PropertyStatus.ARCHIVED) throw new BadRequestException("Archived property cannot be changed");
    if (status === PropertyStatus.PUBLISHED && property.images.length === 0) throw new BadRequestException("Add at least one image before publishing");
    const updated = await this.prisma.property.update({ where: { id }, data: { status }, include: propertyInclude });
    await this.audit.record({
      action: AuditAction.PROPERTY_STATUS_CHANGED, actorId: ownerId, actorRole: UserRole.LISTER, targetType: "Property", targetId: id,
      metadata: { from: property.status, to: status }, request,
    });
    return presentProperty(updated, "lister");
  }

  async archive(ownerId: string, id: string, request?: Request) {
    return this.changeStatus(ownerId, id, PropertyStatus.ARCHIVED, request);
  }

  private async consumeListingAssets(tx: Prisma.TransactionClient, ownerId: string, assetIds: string[]) {
    const ids = [...new Set(assetIds)];
    if (!ids.length) return;
    const result = await tx.uploadedAsset.updateMany({ where: { id: { in: ids }, userId: ownerId }, data: { consumedAt: new Date() } });
    if (result.count !== ids.length) throw new BadRequestException("An uploaded attachment is no longer available");
  }

  private async resolveDocuments(ownerId: string, documents: PropertyDocumentInput[], propertyId?: string) {
    const retainedIds: string[] = [], assetIds: string[] = [];
    const newDocuments: { documentUrl: string; documentType: string }[] = [];
    for (const document of documents) {
      if (document.documentId) {
        if (!propertyId || retainedIds.includes(document.documentId)) throw new BadRequestException("Invalid retained document");
        const existing = await this.prisma.propertyDocument.findFirst({ where: { id: document.documentId, propertyId } });
        if (!existing || existing.documentUrl !== document.documentUrl) throw new BadRequestException("Document does not belong to this listing");
        retainedIds.push(existing.id);
      } else {
        if (!document.documentAssetId || assetIds.includes(document.documentAssetId)) throw new BadRequestException("Every document must be uploaded by this lister");
        const asset = await this.prisma.uploadedAsset.findFirst({ where: { id: document.documentAssetId, userId: ownerId, kind: UploadKind.PROPERTY_DOCUMENT } });
        if (!asset || asset.url !== document.documentUrl) throw new BadRequestException("Every document must be uploaded by this lister");
        assetIds.push(asset.id);
        newDocuments.push({ documentUrl: asset.url, documentType: document.documentType });
      }
    }
    return { retainedIds, assetIds, newDocuments };
  }

  private cleanAmenities(amenities: string[]) {
    return [...new Set(amenities.map((name) => name.trim()).filter(Boolean))].map((name) => ({ name }));
  }

  private async assertOwner(ownerId: string, id: string) {
    const property = await this.prisma.property.findUnique({ where: { id }, include: { images: true } });
    if (!property) throw new NotFoundException("Property not found");
    if (property.ownerId !== ownerId) throw new ForbiddenException("This property belongs to another lister");
    return property;
  }

  private async resolveImages(ownerId: string, images: PropertyImageInput[]) {
    const ids = images.map((image) => image.assetId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException("Duplicate uploaded image");
    if (ids.length === 0) return [];
    const assets = await this.prisma.uploadedAsset.findMany({ where: { id: { in: ids }, userId: ownerId, kind: UploadKind.PROPERTY_IMAGE } });
    if (assets.length !== ids.length) throw new BadRequestException("Every image must be uploaded by this lister");
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    return images.map((image, index) => {
      const asset = byId.get(image.assetId)!;
      return { uploadId: asset.id, url: asset.url, storageKey: asset.storageKey, altText: image.altText, sortOrder: index, isPrimary: index === 0 };
    });
  }
}
