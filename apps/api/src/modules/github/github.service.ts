import { Injectable } from "@nestjs/common";
import axios from "axios";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class GithubService {
  constructor(private readonly prisma: PrismaService) {}
  connect(organizationId: string, data: any) { return this.prisma.githubConnection.upsert({ where: { organizationId_owner_repo: { organizationId, owner: data.owner, repo: data.repo } }, update: data, create: { ...data, organizationId } }); }
  async repository(id: string) {
    const connection = await this.prisma.githubConnection.findUniqueOrThrow({ where: { id } });
    const headers = connection.accessTokenEnc ? { Authorization: `Bearer ${connection.accessTokenEnc}` } : undefined;
    const [branches, commits, pulls, releases] = await Promise.all([
      axios.get(`https://api.github.com/repos/${connection.owner}/${connection.repo}/branches`, { headers }),
      axios.get(`https://api.github.com/repos/${connection.owner}/${connection.repo}/commits`, { headers }),
      axios.get(`https://api.github.com/repos/${connection.owner}/${connection.repo}/pulls?state=all`, { headers }),
      axios.get(`https://api.github.com/repos/${connection.owner}/${connection.repo}/releases`, { headers })
    ]);
    return { branches: branches.data, commits: commits.data, pullRequests: pulls.data, releases: releases.data };
  }
  async handleWebhook(payload: any) {
    const text = JSON.stringify(payload);
    const ticket = text.match(/[A-Z][A-Z0-9]+-\d+/)?.[0];
    if (!ticket) return { linked: false };
    const item = await this.prisma.workItem.findFirst({ where: { key: ticket } });
    if (!item) return { linked: false, ticket };
    if (payload.pull_request?.merged) await this.prisma.workItem.update({ where: { id: item.id }, data: { status: "DONE" } });
    else if (payload.review?.state === "approved") await this.prisma.workItem.update({ where: { id: item.id }, data: { status: "QA" } });
    const authorId = item.reporterId ?? item.assigneeId;
    if (authorId) {
      await this.prisma.comment.create({ data: { workItemId: item.id, authorId, body: `GitHub event linked automatically: ${payload.action ?? "commit"}` } }).catch(() => undefined);
    }
    return { linked: true, ticket };
  }
}
