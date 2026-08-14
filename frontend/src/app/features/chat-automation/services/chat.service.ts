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
  GetConversationsQuery,
  PaginatedResponse,
  GetMessagesQuery,
  CreateConversationDto,
} from '../types/chat.types';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getConversations(query: GetConversationsQuery) {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);
    if (query.search) params = params.set('search', query.search);
    if (query.filter) params = params.set('filter', query.filter);

    return this.http.get<PaginatedResponse<Conversation>>(`${this.apiUrl}/chat/conversations`, {
      params,
    });
  }

  getMessages(conversationId: number, query: GetMessagesQuery) {
    const params = new HttpParams().set('page', query.page).set('limit', query.limit);
    return this.http.get<PaginatedResponse<ChatMessage>>(
      `${this.apiUrl}/chat/conversations/${conversationId}/messages`,
      { params },
    );
  }

  deleteConversation(conversationId: number) {
    return this.http.delete<void>(`${this.apiUrl}/chat/conversations/${conversationId}`);
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
    return this.http.post<ChatMessage>(`${this.apiUrl}/whatssap/${conversationId}/messages`, dto);
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
    resolvedText?: string,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/whatssap/official/conversations/${conversationId}/send-template`,
      { templateName, components, resolvedText },
    );
  }

  getTemplates(): Observable<WhatsappTemplate[]> {
    return this.http.get<WhatsappTemplate[]>(`${this.apiUrl}/whatssap/official/templates`);
  }

  linkPatient(conversationId: number, patientId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/chat/conversations/${conversationId}/patient`, {
      patientId,
    });
  }

  createConversation(dto: CreateConversationDto) {
    return this.http.post<Conversation>(`${this.apiUrl}/chat/conversations`, dto);
  }
}
