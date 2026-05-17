import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../services/chat.service';
import { ChatMessage, Conversation, ConversationStatus, PatientInfo } from '../types/chat.types';

type FilterTab = 'todas' | 'aguardando';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [ChatService],
  templateUrl: './chat-automation.html',
})
export class ChatAutomation implements OnInit {
  private chatService = inject(ChatService);

  allConversations: Conversation[] = [];
  activeConversationId = 'beatriz-mendonca';
  messages: ChatMessage[] = [];
  patient!: PatientInfo;
  filterTab: FilterTab = 'todas';
  newMessage = '';
  showQuickActions = false;

  ngOnInit(): void {
    this.allConversations = this.chatService.getConversations();
    this.selectConversation(this.activeConversationId);
  }

  get conversations(): Conversation[] {
    if (this.filterTab === 'aguardando') {
      return this.allConversations.filter((c) => c.status === 'waiting');
    }
    return this.allConversations;
  }

  get activeConversation(): Conversation | undefined {
    return this.allConversations.find((c) => c.id === this.activeConversationId);
  }

  get isBotActive(): boolean {
    return this.activeConversation?.status === 'bot';
  }

  selectConversation(id: string): void {
    this.activeConversationId = id;
    this.messages = this.chatService.getMessages(id);
    this.patient = this.chatService.getPatient(id);
    this.showQuickActions = false;
  }

  setFilter(tab: FilterTab): void {
    this.filterTab = tab;
  }

  takeControl(): void {
    const conv = this.allConversations.find((c) => c.id === this.activeConversationId);
    if (conv) conv.status = 'human';
  }

  sendMessage(): void {
    const text = this.newMessage.trim();
    if (!text) return;
    this.messages.push({
      id: Date.now().toString(),
      sender: 'patient',
      text,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    });
    this.newMessage = '';
  }

  statusLabel(status: ConversationStatus): string {
    return { bot: 'Bot Ativo', human: 'Agente Humano', waiting: 'Aguardando' }[status];
  }

  statusClass(status: ConversationStatus): string {
    return {
      bot: 'bg-success-subtle text-success',
      human: 'bg-primary-subtle text-primary-text',
      waiting: 'bg-warning-subtle text-warning',
    }[status];
  }

  paymentClass(status: PatientInfo['paymentStatus']): string {
    return {
      'Em dia': 'bg-success-subtle text-success',
      Pendente: 'bg-warning-subtle text-warning',
      Atrasado: 'bg-danger-subtle text-(--color-danger)',
    }[status];
  }
}
