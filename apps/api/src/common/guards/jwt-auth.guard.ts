import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization as string | undefined;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.accessToken;
    if (!token) throw new UnauthorizedException();
    req.user = await this.jwt.verifyAsync(token, { secret: this.config.getOrThrow("JWT_ACCESS_SECRET") });
    return true;
  }
}
