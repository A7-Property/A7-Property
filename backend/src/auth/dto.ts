import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { UserRole } from "../generated/prisma/enums";

export class RegisterDto {
  @ApiProperty({ example: "seeker@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: "Password must contain letters and numbers" })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  address!: string;

  /** Only self-service roles. ADMIN exists but is reachable only through the bootstrap script. */
  @ApiProperty({ enum: [UserRole.SEEKER, UserRole.LISTER] })
  @IsIn([UserRole.SEEKER, UserRole.LISTER])
  role!: typeof UserRole.SEEKER | typeof UserRole.LISTER;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class EmailDto {
  @IsEmail()
  email!: string;
}

export class TokenDto {
  @IsString()
  @MinLength(20)
  token!: string;
}

export class ResetPasswordDto extends TokenDto {
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: "Password must contain letters and numbers" })
  password!: string;
}

const strongPassword = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(strongPassword, { message: "Password must contain letters and numbers" })
  newPassword!: string;
}

export class PasswordConfirmationDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RequestEmailChangeDto extends PasswordConfirmationDto {
  @IsEmail()
  newEmail!: string;
}
