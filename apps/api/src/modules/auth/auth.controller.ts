import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { EmailRequestDto } from "../../common/swagger/api-docs.dto";
import { AuthService } from "./auth.service";
import { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from "./dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiOperation({ summary: "Registrar usuario interno y organizacion" })
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @ApiOperation({ summary: "Iniciar sesion local con correo y contrasena" })
  @Post("login")
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(dto, req);
    const cookieOptions = { httpOnly: true, sameSite: "lax" as const, maxAge: 1000 * 60 * 60 * 3 };
    res.cookie("accessToken", tokens.accessToken, cookieOptions);
    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);
    return tokens;
  }

  @ApiOperation({ summary: "Generar URL de login Microsoft" })
  @Get("microsoft/url")
  microsoftUrl(@Req() req: Request) {
    return this.auth.getMicrosoftLoginUrl(req);
  }

  @ApiOperation({ summary: "Generar URL de login Google" })
  @Get("google/url")
  googleUrl(@Req() req: Request) {
    return this.auth.getGoogleLoginUrl(req);
  }

  @ApiOperation({ summary: "Consultar estado publico de proveedores OAuth" })
  @Get("providers")
  providers(@Req() req: Request) {
    return this.auth.getOAuthProviderStatus(req);
  }

  @ApiOperation({ summary: "Procesar callback OAuth Microsoft" })
  @Get("microsoft/callback")
  async microsoftCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.auth.microsoftCallback(String(req.query.code ?? ""), String(req.query.state ?? ""), req);
    const cookieOptions = { httpOnly: true, sameSite: "lax" as const, maxAge: 1000 * 60 * 60 * 3 };
    res.cookie("accessToken", tokens.accessToken, cookieOptions);
    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);
    res.cookie("microsoftAccessToken", tokens.microsoftAccessToken, cookieOptions);
    res.redirect(tokens.returnTo);
  }

  @ApiOperation({ summary: "Procesar callback OAuth Google" })
  @Get("google/callback")
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.auth.googleCallback(String(req.query.code ?? ""), String(req.query.state ?? ""), req);
    const cookieOptions = { httpOnly: true, sameSite: "lax" as const, maxAge: 1000 * 60 * 60 * 3 };
    res.cookie("accessToken", tokens.accessToken, cookieOptions);
    res.cookie("refreshToken", tokens.refreshToken, cookieOptions);
    res.cookie("googleAccessToken", tokens.googleAccessToken, cookieOptions);
    res.redirect(tokens.returnTo);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cerrar sesion activa" })
  @Post("logout")
  logout(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return this.auth.logout(user.sessionId);
  }

  @ApiOperation({ summary: "Solicitar recuperacion de contrasena por correo" })
  @ApiBody({ type: EmailRequestDto })
  @Post("password/forgot")
  forgot(@Body("email") email: string) {
    return this.auth.forgotPassword(email);
  }

  @ApiOperation({ summary: "Restablecer contrasena con token" })
  @Post("password/reset")
  reset(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cambiar contrasena del usuario autenticado" })
  @Post("password/change")
  change(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Listar sesiones activas del usuario autenticado" })
  @Get("sessions")
  sessions(@CurrentUser() user: any) {
    return this.auth.sessions(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Hidratar sesion frontend desde cookie httpOnly" })
  @Get("bootstrap")
  bootstrap(@CurrentUser() user: any, @Req() req: Request) {
    return {
      accessToken: req.cookies?.accessToken,
      expiresAt: typeof user.exp === "number" ? new Date(user.exp * 1000).toISOString() : new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
      user: { id: user.sub, email: user.email }
    };
  }
}
