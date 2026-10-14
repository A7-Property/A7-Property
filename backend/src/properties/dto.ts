import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { FurnitureStatus, ListingType, PropertyStatus, PropertyType } from "../generated/prisma/enums";

export class PropertyImageInput {
  @IsString()
  @MaxLength(128)
  assetId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  altText?: string;
}

export class PropertyDocumentInput {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(128)
  documentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  documentAssetId?: string;

  @IsString()
  @MaxLength(500)
  documentUrl!: string;

  @IsString()
  @MaxLength(50)
  documentType!: string;
}

export class CreatePropertyDto {
  @IsString() @MinLength(5) @MaxLength(200) title!: string;
  @IsString() @MinLength(20) @MaxLength(10000) description!: string;
  @IsEnum(PropertyType) propertyType!: PropertyType;
  @IsEnum(ListingType) listingType!: ListingType;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(1_000_000_000_000) price!: number;
  @IsString() @MaxLength(8) currency = "MMK";
  @IsInt() @Min(0) @Max(50) bedrooms!: number;
  @IsInt() @Min(0) @Max(50) bathrooms!: number;
  @IsInt() @Min(1) @Max(1_000_000) areaSqft!: number;
  @IsString() @MaxLength(500) address!: string;
  @IsString() @MaxLength(100) city!: string;
  @IsString() @MaxLength(100) township!: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional() @IsInt() @Min(0) @Max(200) floor?: number;
  @IsOptional() @IsInt() @Min(1800) @Max(2100) yearBuilt?: number;
  @IsOptional() @IsEnum(FurnitureStatus) furniture?: FurnitureStatus;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(60, { each: true }) amenities?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => PropertyImageInput) images?: PropertyImageInput[];
  @IsOptional() @IsArray() @ArrayMaxSize(5) @ValidateNested({ each: true }) @Type(() => PropertyDocumentInput) documents?: PropertyDocumentInput[];
}

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {}

export enum PropertySort {
  NEWEST = "newest",
  OLDEST = "oldest",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
  AREA_DESC = "area_desc",
}

/** Accepts `?amenities=Lift,Parking` and `?amenities=Lift&amenities=Parking` alike. */
const toStringArray = ({ value }: { value: unknown }) => {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(list.map((item) => String(item).trim()).filter(Boolean))];
};

const toBoolean = ({ value }: { value: unknown }) => value === true || value === "true" || value === "1";

export class PropertyQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) township?: string;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsEnum(PropertyType) propertyType?: PropertyType;
  @IsOptional() @IsEnum(ListingType) listingType?: ListingType;
  @IsOptional() @IsEnum(FurnitureStatus) furniture?: FurnitureStatus;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(50) bedrooms?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(50) bathrooms?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minArea?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxArea?: number;
  @IsOptional() @Transform(toStringArray) @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(60, { each: true }) amenities?: string[];
  @IsOptional() @Transform(toBoolean) @IsBoolean() verifiedOnly?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(PropertySort) sort = PropertySort.NEWEST;
}

/** Owner-facing listing query: a lister may also filter their own drafts and paused homes. */
export class OwnerPropertyQueryDto {
  @IsOptional() @IsEnum(PropertyStatus) status?: PropertyStatus;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
