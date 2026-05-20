import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "Grupo Corporativo" })
  @IsString() organizationName!: string;
  @ApiProperty({ example: "Alex" })
  @IsString() firstName!: string;
  @ApiProperty({ example: "Castro" })
  @IsString() lastName!: string;
  @ApiProperty({ example: "admin@devhub.local" })
  @IsEmail() email!: string;
  @ApiProperty({ example: "Admin12345!", minLength: 10 })
  @MinLength(10) password!: string;
}

export class LoginDto {
  @ApiProperty({ example: "admin@devhub.local" })
  @IsEmail() email!: string;
  @ApiProperty({ example: "Admin12345!" })
  @IsString() password!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: "reset-token" })
  @IsString() token!: string;
  @ApiProperty({ example: "NuevaClave123!", minLength: 10 })
  @MinLength(10) password!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: "Admin12345!" })
  @IsString() currentPassword!: string;
  @ApiProperty({ example: "NuevaClave123!", minLength: 10 })
  @MinLength(10) newPassword!: string;
}
