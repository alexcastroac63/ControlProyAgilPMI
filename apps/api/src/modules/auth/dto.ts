import { IsEmail, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsString() organizationName!: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsEmail() email!: string;
  @MinLength(10) password!: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

export class ResetPasswordDto {
  @IsString() token!: string;
  @MinLength(10) password!: string;
}

export class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @MinLength(10) newPassword!: string;
}
