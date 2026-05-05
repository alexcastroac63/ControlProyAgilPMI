import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class NotificationsGateway {
  @WebSocketServer() server!: Server;
  emitToOrg(organizationId: string, payload: unknown) { this.server.emit(`org:${organizationId}:notifications`, payload); }
}
