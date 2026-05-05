import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  list(organizationId: string, userId: string) { return this.prisma.notification.findMany({ where: { organizationId, OR: [{ userId }, { userId: null }] }, orderBy: { createdAt: "desc" } }); }
  read(id: string) { return this.prisma.notification.update({ where: { id }, data: { status: "READ" } }); }
}
