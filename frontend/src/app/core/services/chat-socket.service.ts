import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from './environment';
import { ChatMessage, Conversation } from '../../features/chat-automation/types/chat.types';

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

  onMessageStatusUpdated(): Observable<{ messageId: number; status: string; errorCode?: number }> {
    return new Observable((observer) => {
      this.socket.on(
        'message_status_updated',
        (payload: { messageId: number; status: string; errorCode?: number }) =>
          observer.next(payload),
      );
      return () => this.socket.off('message_status_updated');
    });
  }
}
