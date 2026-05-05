import { Injectable } from "@nestjs/common";
import argon2 from "argon2";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  list(organizationId: string) { return this.prisma.user.findMany({ where: { organizationId }, include: { roles: { include: { role: true } }, teams: { include: { team: true } } } }); }
  async create(organizationId: string, data: any) {
    return this.prisma.user.create({ data: { ...data, organizationId, email: data.email.toLowerCase(), passwordHash: await argon2.hash(data.password ?? "ChangeMe123!") } });
  }
  update(id: string, data: any) { return this.prisma.user.update({ where: { id }, data }); }
}
