import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  record(input: { organizationId: string; actorId?: string; action: string; entity: string; entityId?: string; metadata?: unknown; ipAddress?: string }) {
    return this.prisma.auditLog.create({ data: input as any });
  }
}
