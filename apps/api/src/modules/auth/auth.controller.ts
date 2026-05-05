import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthService } from "./auth.service";
import { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from "./dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(dto, req);
    const cookieOptions = { httpOnly: true, sameSite: "lax" as const, maxAge: 1000 * 60 * 60 * 3 };
    res.cookie("accessToken", tokens.accessToken, cookieOptions);
    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);
    return tokens;
  }

  @Get("microsoft/url")
  microsoftUrl(@Req() req: Request) {
    return this.auth.getMicrosoftLoginUrl(req);
  }

  @Get("microsoft/callback")
  async microsoftCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.auth.microsoftCallback(String(req.query.code ?? ""), String(req.query.state ?? ""), req);
    const cookieOptions = { httpOnly: true, sameSite: "lax" as const, maxAge: 1000 * 60 * 60 * 3 };
    res.cookie("accessToken", tokens.accessToken, cookieOptions);
    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);
    res.cookie("microsoftAccessToken", tokens.microsoftAccessToken, cookieOptions);
    res.redirect(tokens.returnTo);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  logout(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return this.auth.logout(user.sessionId);
  }

  @Post("password/forgot")
  forgot(@Body("email") email: string) {
    return this.auth.forgotPassword(email);
  }

  @Post("password/reset")
  reset(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("password/change")
  change(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("sessions")
  sessions(@CurrentUser() user: any) {
    return this.auth.sessions(user.sub);
  }
}
