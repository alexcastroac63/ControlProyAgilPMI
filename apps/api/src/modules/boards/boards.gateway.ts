import { SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class BoardsGateway {
  @WebSocketServer() server!: Server;
  @SubscribeMessage("board:join") join(_client: any, boardId: string) { return { boardId }; }
  broadcastMove(boardId: string, payload: unknown) { this.server.emit(`board:${boardId}:moved`, payload); }
}
