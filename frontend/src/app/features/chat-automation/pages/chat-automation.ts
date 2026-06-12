import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { ChatService } from '../services/chat.service';
import { ChatMessage, Conversation, ConversationStatus, PatientInfo } from '../types/chat.types';
import { NotificationService } from '../../../shared/toastr/notification.service';
import { ChatSocketService } from '../../../core/services/chat-socket.service';

type FilterTab = 'todas' | 'aguardando';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-automation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatAutomation implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private socketService = inject(ChatSocketService);
  private notification = inject(NotificationService);
  private destroy$ = new Subject<void>();

  allConversations = signal<Conversation[]>([]);
  activeConversationId = signal<number | null>(null);
  messages = signal<ChatMessage[]>([]);
  patient = signal<PatientInfo | null>(null);
  filterTab = signal<FilterTab>('todas');
  newMessage = signal('');

  conversations = computed(() =>
    this.filterTab() === 'aguardando'
      ? this.allConversations().filter((c) => c.status === 'waiting')
      : this.allConversations(),
  );

  activeConversation = computed(() =>
    this.allConversations().find((c) => c.id === this.activeConversationId()),
  );

  isBotActive = computed(() => this.activeConversation()?.status === 'bot');

  ngOnInit(): void {
    this.loadConversations();
    this.listenSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (list) => {
        this.allConversations.set(list);
        // companyId vem do token; ajuste conforme seu CurrentUser
        const companyId = list[0]?.id; // <- substitua pelo companyId real
        if (companyId) this.socketService.joinCompany(companyId);
        if (list.length) this.selectConversation(list[0].id);
      },
      error: () => this.notification.error('Erro ao carregar conversas.'),
    });
  }

  private listenSocket(): void {
    this.socketService
      .onNewMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => {
        if (msg.conversationId === this.activeConversationId()) {
          this.messages.update((list) => [...list, msg]);
        }
      });

    this.socketService
      .onConversationUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((updated) => {
        this.allConversations.update((list) =>
          list.map((c) => (c.id === updated.id ? updated : c)),
        );
      });
  }

  selectConversation(id: number): void {
    const prev = this.activeConversationId();
    if (prev) this.socketService.leaveConversation(prev);

    this.activeConversationId.set(id);
    this.messages.set([]);
    this.patient.set(null);
    this.socketService.joinConversation(id);

    forkJoin({
      msgs: this.chatService.getMessages(id),
      patient: this.chatService.getPatient(id),
    }).subscribe({
      next: ({ msgs, patient }) => {
        this.messages.set(msgs);
        this.patient.set(patient);
      },
      error: () => this.notification.error('Erro ao carregar conversa.'),
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
      error: () => this.notification.error('Erro ao atualizar status da conversa.'),
    });
  }

  sendMessage(): void {
    const text = this.newMessage().trim();
    const id = this.activeConversationId();
    if (!text || !id) return;
    this.chatService.sendMessage(id, { text }).subscribe({
      next: () => this.newMessage.set(''),
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
