import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { PropertyReportReason } from "../generated/prisma/enums";

export class CreatePropertyReportDto {
  @IsEnum(PropertyReportReason) reason!: PropertyReportReason;
  @IsOptional() @IsString() @MaxLength(1000) details = "";
}
