// src/features/whatssap/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * TODO (futuro - cluster PM2):
 * Em produção rodamos em modo cluster (PM2, múltiplas instâncias), e cada
 * instância mantém conexões Socket.IO isoladas. Isso causa dois problemas:
 * 1. O balanceador distribui o handshake entre instâncias de forma round-robin,
 *    então clientes podem conectar em instâncias diferentes.
 * 2. Eventos emitidos (emitNewMessage, etc) só chegam a quem está conectado
 *    na MESMA instância que chamou o emit.
 *
 * Abordagem decidida: instância única (instance 0) + porta dedicada.
 * - Gateway sobe em porta HTTP separada da API REST (ex: 3001), via
 *   @WebSocketGateway(3001, { ... }).
 * - Só a instância 0 registra o gateway/provider no module, condicionando
 *   por process.env.NODE_APP_INSTANCE === '0' (ou undefined, caso rode fora
 *   do PM2). As demais instâncias nem tentam bindar a porta 3001, evitando
 *   erro de "porta em uso".
 * - Front (Angular) conecta direto em http://host:3001/chat via socket.io-client,
 *   apontando pra essa porta fixa, independente de qual instância serve a API REST.
 * - Limitação aceita: um único processo concentra todas as conexões. Se essa
 *   instância cair, todas as conexões caem até o restart (sem failover).
 *   Sem ganho de capacidade horizontal (sempre 1 instância aceitando socket).
 * - Suficiente para o volume atual (poucas conexões simultâneas).
 *
 * Alternativa avaliada: Redis adapter (@socket.io/redis-adapter), permitindo
 * todas as instâncias aceitarem conexões e sincronizar via pub/sub. Mais
 * escalável e tolerante a falha de instância, mas exige Redis em produção
 * e configuração extra. Migrar para essa abordagem se o volume de conexões
 * ou necessidade de HA justificar.
 */

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

  emitMessageStatusUpdated(
    companyId: number,
    conversationId: number,
    payload: {
      messageId: number;
      status: string;
      errorCode?: number;
      errorMessage?: string;
    },
  ) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message_status_updated', payload);
  }
}
