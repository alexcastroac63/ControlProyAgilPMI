import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma, UserStatus } from "@prisma/client";
import axios from "axios";
import argon2 from "argon2";
import * as crypto from "crypto";
import { Request } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from "./dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(dto.password);
    const slug = dto.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const user = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { name: dto.organizationName, slug: `${slug}-${crypto.randomBytes(3).toString("hex")}` } });
      const role = await tx.role.create({ data: { organizationId: organization.id, name: "SUPER_ADMIN" } });
      const created = await tx.user.create({
        data: {
          organizationId: organization.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email.toLowerCase(),
          passwordHash,
          roles: { create: { roleId: role.id } }
        }
      });
      return created;
    });
    return { id: user.id, email: user.email };
  }

  async login(dto: LoginDto, req: Request) {
    let user: Prisma.UserGetPayload<{ include: { roles: { include: { role: true } } } }> | null = null;
    try {
      user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() }, include: { roles: { include: { role: true } } } });
    } catch (error) {
      if (this.config.get("NODE_ENV") === "development") return this.loginDevelopmentUser(dto);
      throw error;
    }
    if (!user || user.status !== UserStatus.ACTIVE) throw new UnauthorizedException("Credenciales inválidas");
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new UnauthorizedException("Usuario bloqueado temporalmente");
    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.registerFailedAttempt(user.id, user.failedAttempts);
      throw new UnauthorizedException("Credenciales inválidas");
    }
    const tokens = await this.createSessionTokens(user, req);
    await this.prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null, lastAccessAt: new Date() } });
    return { ...tokens, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } };
  }

  private async loginDevelopmentUser(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const allowedEmail = this.config.get("DEV_LOGIN_EMAIL", "admin@devhub.local");
    const allowedPassword = this.config.get("DEV_LOGIN_PASSWORD", "Admin12345!");
    if (email !== allowedEmail || !safeCompare(dto.password, allowedPassword)) throw new UnauthorizedException("Credenciales inválidas");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 3);
    const payload = {
      sub: "dev-admin",
      sessionId: "dev-session",
      organizationId: "dev-org",
      roles: ["SUPER_ADMIN"],
      permissions: ["*"]
    };
    const accessToken = await this.jwt.signAsync(payload, { secret: this.config.getOrThrow("JWT_ACCESS_SECRET"), expiresIn: "3h" });
    const refreshToken = await this.jwt.signAsync(payload, { secret: this.config.getOrThrow("JWT_REFRESH_SECRET"), expiresIn: "3h" });
    return {
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      user: { id: "dev-admin", email, firstName: "Alex", lastName: "Admin" }
    };
  }

  getMicrosoftLoginUrl(req: Request) {
    const provider = this.getOAuthProviderStatus(req).microsoft;
    if (!provider.enabled) throw new BadRequestException("Login Microsoft no esta habilitado");
    if (!provider.configured) throw new BadRequestException(`Login Microsoft no configurado. Falta: ${provider.missing.join(", ")}`);
    const tenantId = this.config.get("MICROSOFT_TENANT_ID", "common");
    const clientId = this.requireConfig("MICROSOFT_CLIENT_ID");
    const redirectUri = this.getOAuthRedirectUri(req, "microsoft");
    const scope = this.config.get("MICROSOFT_SCOPES", "openid profile email offline_access User.Read Sites.ReadWrite.All");
    const state = this.jwt.sign({ nonce: crypto.randomBytes(16).toString("hex"), returnTo: this.getOAuthReturnTo(req) }, { secret: this.config.getOrThrow("JWT_ACCESS_SECRET"), expiresIn: "10m" });
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope,
      state
    });
    return { url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}` };
  }

  getGoogleLoginUrl(req: Request) {
    const provider = this.getOAuthProviderStatus(req).google;
    if (!provider.enabled) throw new BadRequestException("Login Google no esta habilitado");
    if (!provider.configured) throw new BadRequestException(`Login Google no configurado. Falta: ${provider.missing.join(", ")}`);
    const clientId = this.requireConfig("GOOGLE_CLIENT_ID");
    const redirectUri = this.getOAuthRedirectUri(req, "google");
    const scope = this.config.get("GOOGLE_SCOPES", "openid profile email");
    const state = this.jwt.sign({ nonce: crypto.randomBytes(16).toString("hex"), returnTo: this.getOAuthReturnTo(req) }, { secret: this.config.getOrThrow("JWT_ACCESS_SECRET"), expiresIn: "10m" });
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope,
      state,
      access_type: "offline",
      prompt: "select_account"
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  }

  getOAuthProviderStatus(req: Request) {
    const settings = this.settings.getSettings();
    const microsoftMissing = this.getMissingConfig(["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"]);
    const googleMissing = this.getMissingConfig(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);
    return {
      microsoft: {
        enabled: settings.microsoftAuth.enabled,
        configured: microsoftMissing.length === 0,
        missing: microsoftMissing,
        redirectUri: this.getOAuthRedirectUri(req, "microsoft"),
        allowedDomains: settings.microsoftAuth.allowedDomains
      },
      google: {
        enabled: settings.googleAuth.enabled,
        configured: googleMissing.length === 0,
        missing: googleMissing,
        redirectUri: this.getOAuthRedirectUri(req, "google"),
        allowedDomains: settings.googleAuth.allowedDomains
      }
    };
  }

  private getOAuthReturnTo(req: Request) {
    return `${this.getWebOrigin(req)}/login?oauth=success`;
  }

  private getWebOrigin(req: Request) {
    const configured = this.config.get<string>("WEB_APP_URL");
    if (configured?.trim()) return configured.replace(/\/+$/, "");
    const forwardedHost = req.headers["x-forwarded-host"];
    const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost ?? req.headers.host;
    if (!host) return "http://localhost:3000";
    const forwardedProto = req.headers["x-forwarded-proto"];
    const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto ?? req.protocol ?? "http";
    const webPort = this.config.get("WEB_PORT", "3000");
    const normalizedHost = String(host).replace(/:\d+$/, `:${webPort}`);
    return `${protocol}://${normalizedHost}`;
  }

  private getOAuthRedirectUri(req: Request, provider: "microsoft" | "google") {
    const key = provider === "microsoft" ? "MICROSOFT_REDIRECT_URI" : "GOOGLE_REDIRECT_URI";
    const configured = this.config.get<string>(key)?.trim();
    const webOrigin = this.getWebOrigin(req);
    if (configured && !configured.includes("tu-dominio-o-ip") && !this.shouldPreferRequestOrigin(configured, webOrigin)) return configured;
    return `${webOrigin}/api/auth/${provider}/callback`;
  }

  private shouldPreferRequestOrigin(configuredRedirectUri: string, webOrigin: string) {
    try {
      const configured = new URL(configuredRedirectUri);
      const current = new URL(webOrigin);
      return ["localhost", "127.0.0.1"].includes(configured.hostname) && !["localhost", "127.0.0.1"].includes(current.hostname);
    } catch {
      return true;
    }
  }

  private getMissingConfig(keys: string[]) {
    return keys.filter((key) => !this.config.get<string>(key)?.trim());
  }

  private requireConfig(key: string) {
    const value = this.config.get<string>(key)?.trim();
    if (!value) throw new BadRequestException(`Configuracion requerida faltante: ${key}`);
    return value;
  }

  async microsoftCallback(code: string, state: string, req: Request) {
    if (!code) throw new BadRequestException("Codigo Microsoft requerido");
    const statePayload = await this.jwt.verifyAsync<{ returnTo: string }>(state, { secret: this.config.getOrThrow("JWT_ACCESS_SECRET") });
    const tenantId = this.config.get("MICROSOFT_TENANT_ID", "common");
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: this.requireConfig("MICROSOFT_CLIENT_ID"),
        client_secret: this.requireConfig("MICROSOFT_CLIENT_SECRET"),
        code,
        redirect_uri: this.getOAuthRedirectUri(req, "microsoft"),
        grant_type: "authorization_code"
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const microsoftAccessToken = tokenResponse.data.access_token as string;
    const profileResponse = await axios.get("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,givenName,surname,displayName", {
      headers: { Authorization: `Bearer ${microsoftAccessToken}` }
    });
    const profile = profileResponse.data as { mail?: string; userPrincipalName?: string; givenName?: string; surname?: string; displayName?: string };
    const email = (profile.mail ?? profile.userPrincipalName ?? "").toLowerCase();
    if (!email || !this.settings.isMicrosoftDomainAllowed(email)) throw new UnauthorizedException("Dominio Microsoft no autorizado");
    const user = await this.findOrCreateFederatedUser("microsoft", email, {
      firstName: profile.givenName,
      lastName: profile.surname,
      displayName: profile.displayName
    });
    const tokens = await this.createSessionTokens(user, req);
    return { ...tokens, microsoftAccessToken, returnTo: statePayload.returnTo };
  }

  async googleCallback(code: string, state: string, req: Request) {
    if (!code) throw new BadRequestException("Codigo Google requerido");
    const statePayload = await this.jwt.verifyAsync<{ returnTo: string }>(state, { secret: this.config.getOrThrow("JWT_ACCESS_SECRET") });
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        client_id: this.requireConfig("GOOGLE_CLIENT_ID"),
        client_secret: this.requireConfig("GOOGLE_CLIENT_SECRET"),
        code,
        redirect_uri: this.getOAuthRedirectUri(req, "google"),
        grant_type: "authorization_code"
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const googleAccessToken = tokenResponse.data.access_token as string;
    const profileResponse = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${googleAccessToken}` }
    });
    const profile = profileResponse.data as { email?: string; given_name?: string; family_name?: string; name?: string; email_verified?: boolean };
    const email = (profile.email ?? "").toLowerCase();
    if (!email || profile.email_verified === false || !this.settings.isGoogleDomainAllowed(email)) throw new UnauthorizedException("Cuenta Google no autorizada");
    const user = await this.findOrCreateFederatedUser("google", email, {
      firstName: profile.given_name,
      lastName: profile.family_name,
      displayName: profile.name
    });
    const tokens = await this.createSessionTokens(user, req);
    return { ...tokens, googleAccessToken, returnTo: statePayload.returnTo };
  }

  logout(sessionId: string) {
    return this.prisma.userSession.update({ where: { id: sessionId }, data: { status: "REVOKED", revokedAt: new Date() } });
  }

  sessions(userId: string) {
    return this.prisma.userSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return { ok: true };
    const token = crypto.randomBytes(32).toString("hex");
    await this.prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: await argon2.hash(token), expiresAt: new Date(Date.now() + 1000 * 60 * 30) }
    });
    await this.prisma.notification.create({
      data: { organizationId: user.organizationId, userId: user.id, channel: "EMAIL", event: "PASSWORD_RESET", title: "Recuperación de contraseña", body: `Token demo: ${token}` }
    });
    return { ok: true, demoToken: token };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resets = await this.prisma.passwordReset.findMany({ where: { usedAt: null, expiresAt: { gt: new Date() } }, include: { user: true } });
    const reset = await asyncFind(resets, (item) => argon2.verify(item.tokenHash, dto.token));
    if (!reset) throw new BadRequestException("Token inválido");
    await this.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await argon2.hash(dto.password) } });
    await this.prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
    return { ok: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await argon2.verify(user.passwordHash, dto.currentPassword))) throw new UnauthorizedException();
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await argon2.hash(dto.newPassword) } });
    return { ok: true };
  }

  private registerFailedAttempt(userId: string, failedAttempts: number) {
    const next = failedAttempts + 1;
    const data: Prisma.UserUpdateInput = { failedAttempts: next };
    if (next >= 5) data.lockedUntil = new Date(Date.now() + 1000 * 60 * 15);
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  private async createSessionTokens(user: Prisma.UserGetPayload<{ include: { roles: { include: { role: true } } } }>, req: Request) {
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 3);
    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshHash: "pending",
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
        expiresAt
      }
    });
    const payload = { sub: user.id, email: user.email, sessionId: session.id, organizationId: user.organizationId, roles: user.roles.map((r) => r.role.name), permissions: ["*"] };
    const accessToken = await this.jwt.signAsync(payload, { secret: this.config.getOrThrow("JWT_ACCESS_SECRET"), expiresIn: this.config.get("JWT_ACCESS_TTL", "3h") });
    const refreshToken = await this.jwt.signAsync(payload, { secret: this.config.getOrThrow("JWT_REFRESH_SECRET"), expiresIn: this.config.get("JWT_REFRESH_TTL", "30d") });
    await this.prisma.userSession.update({ where: { id: session.id }, data: { refreshHash: await argon2.hash(refreshToken) } });
    return { accessToken, refreshToken, expiresAt: expiresAt.toISOString() };
  }

  private async findOrCreateFederatedUser(provider: "microsoft" | "google", email: string, profile: { firstName?: string; lastName?: string; displayName?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email }, include: { roles: { include: { role: true } } } });
    if (existing) return existing;
    const providerLabel = provider === "microsoft" ? "Microsoft" : "Google";
    const orgSlugConfig = provider === "microsoft" ? "MICROSOFT_DEFAULT_ORG_SLUG" : "GOOGLE_DEFAULT_ORG_SLUG";
    const orgNameConfig = provider === "microsoft" ? "MICROSOFT_DEFAULT_ORG_NAME" : "GOOGLE_DEFAULT_ORG_NAME";
    const defaultSlug = provider === "microsoft" ? "microsoft-workspace" : "google-workspace";
    const defaultName = provider === "microsoft" ? "Microsoft Workspace" : "Google Workspace";
    const organization = await this.prisma.organization.upsert({
      where: { slug: this.config.get(orgSlugConfig, defaultSlug) },
      update: {},
      create: { slug: this.config.get(orgSlugConfig, defaultSlug), name: this.config.get(orgNameConfig, defaultName) }
    });
    const role = await this.prisma.role.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: "VIEWER" } },
      update: {},
      create: { organizationId: organization.id, name: "VIEWER", description: `Usuario ${providerLabel} federado` }
    });
    return this.prisma.user.create({
      data: {
        organizationId: organization.id,
        firstName: profile.firstName ?? profile.displayName?.split(" ")[0] ?? providerLabel,
        lastName: profile.lastName ?? profile.displayName?.split(" ").slice(1).join(" ") ?? "User",
        email,
        passwordHash: await argon2.hash(crypto.randomBytes(32).toString("hex")),
        roles: { create: { roleId: role.id } }
      },
      include: { roles: { include: { role: true } } }
    });
  }
}

async function asyncFind<T>(items: T[], predicate: (item: T) => Promise<boolean>) {
  for (const item of items) if (await predicate(item)) return item;
  return undefined;
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
