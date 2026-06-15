import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../core/services/environment';
import {
  Conversation,
  ChatMessage,
  PatientInfo,
  ConversationStatusUpdate,
  SendMessageDto,
  WhatsappTemplate,
} from '../types/chat.types';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getConversations(status?: string) {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<Conversation[]>(`${this.apiUrl}/chat/conversations`, { params });
  }

  getMessages(conversationId: number) {
    return this.http.get<ChatMessage[]>(
      `${this.apiUrl}/chat/conversations/${conversationId}/messages`,
    );
  }

  getPatient(conversationId: number) {
    return this.http.get<PatientInfo>(
      `${this.apiUrl}/chat/conversations/${conversationId}/patient`,
    );
  }

  updateStatus(conversationId: number, dto: ConversationStatusUpdate) {
    return this.http.patch<Conversation>(
      `${this.apiUrl}/chat/conversations/${conversationId}/status`,
      dto,
    );
  }

  sendMessage(conversationId: number, dto: SendMessageDto) {
    return this.http.post<ChatMessage>(
      `${this.apiUrl}/chat/conversations/${conversationId}/messages`,
      dto,
    );
  }

  blockContact(conversationId: number) {
    return this.http.patch<PatientInfo>(
      `${this.apiUrl}/chat/conversations/${conversationId}/block`,
      {},
    );
  }

  markAsRead(conversationId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/chat/conversations/${conversationId}/read`, {});
  }

  sendTemplate(
    conversationId: number,
    templateName: string,
    components: object[],
  ): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/whatssap/conversations/${conversationId}/send-template`,
      { templateName, components },
    );
  }

  getTemplates(): Observable<WhatsappTemplate[]> {
    return this.http.get<WhatsappTemplate[]>(`${this.apiUrl}/whatssap/templates`);
  }
}
