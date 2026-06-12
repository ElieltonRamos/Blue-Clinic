// src/features/whatssap/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join_company')
  onJoinCompany(
    @MessageBody() data: { companyId: number },
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(`company:${data.companyId}`);
  }

  @SubscribeMessage('join_conversation')
  onJoinConversation(
    @MessageBody() data: { conversationId: number },
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('leave_conversation')
  onLeaveConversation(
    @MessageBody() data: { conversationId: number },
    @ConnectedSocket() client: Socket,
  ) {
    void client.leave(`conversation:${data.conversationId}`);
  }

  emitNewMessage(companyId: number, conversationId: number, message: object) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('new_message', message);
  }

  emitConversationUpdated(companyId: number, conversation: object) {
    this.server
      .to(`company:${companyId}`)
      .emit('conversation_updated', conversation);
  }
}
