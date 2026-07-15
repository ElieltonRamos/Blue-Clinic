import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from './environment';
import { ChatMessage, Conversation, MessageStatusUpdate } from '../../features/chat-automation/types/chat.types';

/**
 * TODO (futuro - backend ainda não implementado):
 * O backend vai expor o Socket.IO numa porta HTTP dedicada (ex: 3001),
 * separada da porta da API REST (ex: 3000). Quando isso for implementado,
 * `environment.apiUrl` aqui precisa apontar para a porta do socket, não
 * para a porta da API REST — provavelmente uma env var separada
 * (ex: `environment.socketUrl`).
 *
 * Limitação do backend (instância única): se a instância cair, todas as
 * conexões caem até o restart. O client deve reconectar automaticamente
 * (comportamento padrão do socket.io-client), sem necessidade de lógica
 * extra aqui — mas esperar reconexões ocasionais em deploys/restarts.
 */

@Injectable({ providedIn: 'root' })
export class ChatSocketService implements OnDestroy {
  private socket: Socket;

  constructor() {
    this.socket = io(`${environment.apiUrl}/chat`, { transports: ['websocket'] });
  }

  joinCompany(companyId: number): void {
    this.socket.emit('join_company', { companyId });
  }

  joinConversation(conversationId: number): void {
    this.socket.emit('join_conversation', { conversationId });
  }

  leaveConversation(conversationId: number): void {
    this.socket.emit('leave_conversation', { conversationId });
  }

  onNewMessage(): Observable<ChatMessage> {
    return new Observable((observer) => {
      this.socket.on('new_message', (msg: ChatMessage) => observer.next(msg));
      return () => this.socket.off('new_message');
    });
  }

  onConversationUpdated(): Observable<Conversation> {
    return new Observable((observer) => {
      this.socket.on('conversation_updated', (c: Conversation) => observer.next(c));
      return () => this.socket.off('conversation_updated');
    });
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }

  onMessageStatusUpdated(): Observable<MessageStatusUpdate> {
    return new Observable((observer) => {
      this.socket.on('message_status_updated', (payload: MessageStatusUpdate) =>
        observer.next(payload),
      );
      return () => this.socket.off('message_status_updated');
    });
  }
}
