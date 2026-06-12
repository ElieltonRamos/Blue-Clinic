import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ChatService } from '../services/chat.service';
import { ChatMessage, Conversation, ConversationStatus, PatientInfo } from '../types/chat.types';
import { NotificationService } from '../../../shared/toastr/notification.service';

type FilterTab = 'todas' | 'aguardando';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-automation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatAutomation implements OnInit {
  private chatService = inject(ChatService);
  private notification = inject(NotificationService);

  allConversations = signal<Conversation[]>([]);
  activeConversationId = signal<number | null>(null);
  messages = signal<ChatMessage[]>([]);
  patient = signal<PatientInfo | null>(null);
  filterTab = signal<FilterTab>('todas');
  newMessage = signal('');

  conversations = computed(() => {
    if (this.filterTab() === 'aguardando') {
      return this.allConversations().filter((c) => c.status === 'waiting');
    }
    return this.allConversations();
  });

  activeConversation = computed(() =>
    this.allConversations().find((c) => c.id === this.activeConversationId()),
  );

  isBotActive = computed(() => this.activeConversation()?.status === 'bot');

  ngOnInit(): void {
    this.loadConversations();
  }

  private loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (list) => {
        this.allConversations.set(list);
        if (list.length) this.selectConversation(list[0].id);
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error('Erro ao carregar conversas.');
      },
    });
  }

  selectConversation(id: number): void {
    this.activeConversationId.set(id);
    this.messages.set([]);
    this.patient.set(null);

    this.chatService.getMessages(id).subscribe({
      next: (msgs) => this.messages.set(msgs),
      error: () => this.notification.error('Erro ao carregar mensagens.'),
    });

    this.chatService.getPatient(id).subscribe({
      next: (p) => this.patient.set(p),
      error: () => this.notification.error('Erro ao carregar dados do paciente.'),
    });
  }

  setFilter(tab: FilterTab): void {
    this.filterTab.set(tab);
  }

  takeControl(): void {
    const id = this.activeConversationId();
    if (!id) return;

    const status = this.isBotActive() ? 'human' : 'bot';
    this.chatService.updateStatus(id, { status }).subscribe({
      next: (updated) => {
        this.allConversations.update((list) =>
          list.map((c) => (c.id === updated.id ? { ...c, status: updated.status } : c)),
        );
      },
      error: () => this.notification.error('Erro ao atualizar status da conversa.'),
    });
  }

  sendMessage(): void {
    const text = this.newMessage().trim();
    const id = this.activeConversationId();
    if (!text || !id) return;

    this.chatService.sendMessage(id, { text }).subscribe({
      next: (msg) => {
        this.messages.update((list) => [...list, msg]);
        this.newMessage.set('');
      },
      error: () => this.notification.error('Erro ao enviar mensagem.'),
    });
  }

  blockContact(): void {
    const id = this.activeConversationId();
    if (!id) return;

    this.chatService.blockContact(id).subscribe({
      next: (updated) => {
        this.patient.set(updated);
        this.notification.success('Contato bloqueado.');
      },
      error: () => this.notification.error('Erro ao bloquear contato.'),
    });
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
}
