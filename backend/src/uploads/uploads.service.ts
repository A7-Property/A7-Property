import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
import { UploadKind, UserRole } from "../generated/prisma/enums";
import type { RequestHandler } from "express";
import { PrismaService } from "../prisma/prisma.service";

const maxImageBytes = 10 * 1024 * 1024;
const allowedFormats = new Set(["jpeg", "png", "webp"]);
export const isPrivateDocument = (kind: UploadKind) => kind === UploadKind.IDENTIFICATION || kind === UploadKind.PROPERTY_DOCUMENT;

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly driver = process.env.STORAGE_DRIVER ?? "local";
  private readonly root = resolve(process.cwd(), process.env.UPLOAD_DIR ?? "uploads");
  private readonly bucket = process.env.R2_BUCKET_NAME;
  private readonly privateBucket = process.env.R2_PRIVATE_BUCKET_NAME;
  private readonly s3 = this.driver === "r2" ? new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  }) : null;

  constructor(private readonly prisma: PrismaService) {}

  async saveImage(userId: string, kind: UploadKind, file: Express.Multer.File | undefined) {
    if (!file?.buffer || file.size === 0 || file.size > maxImageBytes) throw new BadRequestException("A valid image under 10 MB is required");
    let output: Buffer;
    try {
      const image = sharp(file.buffer, { limitInputPixels: 25_000_000 });
      const metadata = await image.metadata();
      if (!metadata.format || !allowedFormats.has(metadata.format)) throw new Error("Unsupported image format");
      output = await sharp(file.buffer, { limitInputPixels: 25_000_000 })
        .rotate()
        .resize(kind === UploadKind.AVATAR ? 512 : 2400, kind === UploadKind.AVATAR ? 512 : 2400, {
          fit: kind === UploadKind.AVATAR ? "cover" : "inside",
          withoutEnlargement: kind !== UploadKind.AVATAR,
        })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
    } catch {
      throw new BadRequestException("Unsupported or corrupt image");
    }
    const folder = isPrivateDocument(kind) ? "private-documents" : kind === UploadKind.AVATAR ? "avatars" : "properties";
    const key = `${folder}/${randomUUID()}.webp`;
    const url = await this.store(key, output, isPrivateDocument(kind));
    try {
      return await this.prisma.uploadedAsset.create({ data: { userId, kind, storageKey: key, url, contentType: "image/webp", byteSize: output.byteLength } });
    } catch (error) {
      await this.remove(key).catch(() => undefined);
      throw error;
    }
  }

  private async store(key: string, content: Buffer, privateDocument = false) {
    if (this.driver === "r2") {
      if (privateDocument && (!this.privateBucket || this.privateBucket === this.bucket)) throw new ServiceUnavailableException("Private document storage is not configured");
      await this.s3!.send(new PutObjectCommand({ Bucket: privateDocument ? this.privateBucket : this.bucket, Key: key, Body: content, ContentType: "image/webp", CacheControl: privateDocument ? "private, no-store" : "public, max-age=31536000, immutable" }), { abortSignal: AbortSignal.timeout(20_000) });
      if (privateDocument) return `${process.env.BACKEND_PUBLIC_URL!.replace(/\/$/, "")}/media/${key}`;
      return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
    }
    const path = resolve(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, { flag: "wx", mode: privateDocument ? 0o600 : 0o644 });
    return `${(process.env.BACKEND_PUBLIC_URL ?? "http://localhost:4000").replace(/\/$/, "")}/media/${key}`;
  }

  /** Run before express.static. Also protects documents uploaded to legacy public folders. */
  publicMediaGate(): RequestHandler {
    return async (request, response, next) => {
      try {
        const key = decodeURIComponent(request.path).replace(/^\//, "");
        const asset = await this.prisma.uploadedAsset.findUnique({ where: { storageKey: key }, select: { kind: true } });
        if (!asset || isPrivateDocument(asset.kind)) {
          response.setHeader("Cache-Control", "no-store");
          response.status(404).end();
          return;
        }
        next();
      } catch (error) { next(error); }
    };
  }

  async document(userId: string, role: UserRole, url: string) {
    const asset = await this.prisma.uploadedAsset.findFirst({ where: { url } });
    if (!asset || !isPrivateDocument(asset.kind)) throw new NotFoundException("Document not found");
    if (asset.userId !== userId && role !== UserRole.ADMIN) throw new ForbiddenException();
    if (this.driver === "r2") {
      if (!this.privateBucket || this.privateBucket === this.bucket || !asset.storageKey.startsWith("private-documents/")) throw new ServiceUnavailableException("Private document storage migration is required");
      const result = await this.s3!.send(new GetObjectCommand({ Bucket: this.privateBucket, Key: asset.storageKey }), { abortSignal: AbortSignal.timeout(20_000) });
      if (!result.Body) throw new NotFoundException("Document not found");
      return Buffer.from(await result.Body.transformToByteArray());
    }
    try { return await readFile(resolve(this.root, asset.storageKey)); }
    catch { throw new NotFoundException("Document not found"); }
  }

  /**
   * Flags assets as attached to a listing or profile. Anything still
   * unconsumed after the retention window is deleted by the maintenance job,
   * so an abandoned upload form does not leak storage forever.
   */
  async markConsumed(assetIds: string[]) {
    if (assetIds.length === 0) return 0;
    const result = await this.prisma.uploadedAsset.updateMany({
      where: { id: { in: assetIds }, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return result.count;
  }

  /** Deletes the stored object and its row. Storage is removed first so a failure cannot orphan the row. */
  async purge(assetId: string, storageKey: string) {
    await this.remove(storageKey);
    await this.prisma.uploadedAsset.deleteMany({ where: { id: assetId } });
  }

  /**
   * Removes a superseded asset by its public URL, used when an avatar is
   * replaced. Scoped to the owner and kind so one user can never purge another
   * user's file by passing its URL.
   */
  async purgeByUrl(userId: string, kind: UploadKind, url: string) {
    const asset = await this.prisma.uploadedAsset.findFirst({
      where: { userId, kind, url, propertyImages: { none: {} } },
      select: { id: true, storageKey: true },
    });
    if (!asset) return false;
    try {
      await this.purge(asset.id, asset.storageKey);
      return true;
    } catch (error) {
      this.logger.warn(`Could not purge replaced asset ${asset.storageKey}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private async remove(key: string) {
    if (this.driver === "r2") await this.s3!.send(new DeleteObjectCommand({ Bucket: key.startsWith("private-documents/") ? this.privateBucket : this.bucket, Key: key }), { abortSignal: AbortSignal.timeout(10_000) });
    else await unlink(resolve(this.root, key)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
  }
}
