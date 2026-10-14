import { BadRequestException } from "@nestjs/common";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { UploadKind } from "../src/generated/prisma/enums";
import { PrismaService } from "../src/prisma/prisma.service";
import { UploadsService } from "../src/uploads/uploads.service";

describe("UploadsService", () => {
  let directory: string;
  const previous = { driver: process.env.STORAGE_DRIVER, uploadDir: process.env.UPLOAD_DIR, publicUrl: process.env.BACKEND_PUBLIC_URL };
  const prisma = { uploadedAsset: { create: jest.fn() } };

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "a7-upload-test-"));
    process.env.STORAGE_DRIVER = "local";
    process.env.UPLOAD_DIR = directory;
    process.env.BACKEND_PUBLIC_URL = "http://localhost:4000";
    jest.resetAllMocks();
    prisma.uploadedAsset.create.mockImplementation(async ({ data }) => ({ id: "asset-1", ...data }));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
    if (previous.driver === undefined) delete process.env.STORAGE_DRIVER; else process.env.STORAGE_DRIVER = previous.driver;
    if (previous.uploadDir === undefined) delete process.env.UPLOAD_DIR; else process.env.UPLOAD_DIR = previous.uploadDir;
    if (previous.publicUrl === undefined) delete process.env.BACKEND_PUBLIC_URL; else process.env.BACKEND_PUBLIC_URL = previous.publicUrl;
  });

  it("re-encodes an image as a metadata-free WebP and records its owner", async () => {
    const input = await sharp({ create: { width: 48, height: 32, channels: 3, background: "#197650" } }).png().toBuffer();
    const service = new UploadsService(prisma as unknown as PrismaService);
    const asset = await service.saveImage("owner-1", UploadKind.PROPERTY_IMAGE, { buffer: input, size: input.length } as Express.Multer.File);
    expect(asset.userId).toBe("owner-1");
    expect(asset.contentType).toBe("image/webp");
    expect(asset.url).toMatch(/^http:\/\/localhost:4000\/media\/properties\/[^/]+\.webp$/);
    const output = await readFile(resolve(directory, asset.storageKey));
    expect((await sharp(output).metadata()).format).toBe("webp");
  });

  it("rejects non-image bytes before storing them", async () => {
    const input = Buffer.from("<script>not an image</script>");
    const service = new UploadsService(prisma as unknown as PrismaService);
    await expect(service.saveImage("owner-1", UploadKind.PROPERTY_IMAGE, { buffer: input, size: input.length } as Express.Multer.File)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.uploadedAsset.create).not.toHaveBeenCalled();
  });
});
