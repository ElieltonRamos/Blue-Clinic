import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  AfterViewChecked,
  ViewChild,
  ElementRef,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ChatService } from '../services/chat.service';
import {
  ChatMessage,
  Conversation,
  ConversationsFilter,
  MessageStatus,
  PatientInfo,
} from '../types/chat.types';
import { NotificationService } from '../../../shared/toastr/notification.service';
import { ChatSocketService } from '../../../core/services/chat-socket.service';
import { AuthService } from '../../../core/services/auth.service';
import { TemplateModal } from './template-modal/template-modal';
import { CreateAppointmentModal } from '../../../shared/create-appointment-modal/pages/create-appointment-modal';
import { AppointmentResponse } from '../../../shared/create-appointment-modal/types/create-appointment.types';
import { FormField, ModalEditEntity } from '../../../shared/modal-edit-entity/modal-edit-entity';
import { CreatePatientRequest, Patient } from '../../patients/types/patients.types';
import { PatientsService } from '../../patients/services/patients.service';
import { HttpErrorResponse } from '@angular/common/http';
import { alertConfirm } from '../../../shared/alerts/custom-alerts';
import { LinkPatientModal } from './link-patient-modal/link-patient-modal';
import { NewConversationModal } from "./new-conversation-modal/new-conversation-modal";

const PAGE_LIMIT = 50;
const SCROLL_UP_THRESHOLD = 80;

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TemplateModal,
    CreateAppointmentModal,
    ModalEditEntity,
    LinkPatientModal,
    NewConversationModal
],
  templateUrl: './chat-automation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatAutomation implements OnInit, OnDestroy, AfterViewChecked {
  private notificationSound = new Audio('/notification.mp3');
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('conversationsList') private conversationsListEl!: ElementRef<HTMLDivElement>;
  showLinkPatientModal = signal(false);
  showNewConversationModal = signal(false);

  private chatService = inject(ChatService);
  private socketService = inject(ChatSocketService);
  private notification = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private searchInput$ = new Subject<string>();
  private authService = inject(AuthService);
  private patientsService = inject(PatientsService);

  private shouldScrollToBottom = false;
  private pendingScrollAnchor: number | null = null; // guarda scrollHeight antes de prepend

  // signals
  showRegisterPatientModal = signal(false);
  newPatient = signal<Partial<CreatePatientRequest>>({});

  patientFields: FormField[] = [
    { name: 'name', label: 'Nome', type: 'text', placeholder: 'Nome completo', required: true },
    { name: 'email', label: 'E-mail', type: 'email', placeholder: 'email@exemplo.com' },
    { name: 'phone', label: 'Telefone', type: 'text', placeholder: '(00) 00000-0000' },
    { name: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00' },
    { name: 'birthDate', label: 'Data de Nascimento', type: 'date' },
  ];

  // conversas
  conversations = signal<Conversation[]>([]);
  conversationsPage = signal(1);
  conversationsTotalPages = signal(1);
  isLoadingConversations = signal(false);
  filterTab = signal<ConversationsFilter>('todas');
  searchTerm = signal('');

  // conversa ativa / mensagens
  activeConversationId = signal<number | null>(null);
  messages = signal<ChatMessage[]>([]);
  messagesPage = signal(1);
  messagesTotalPages = signal(1);
  isLoadingOlderMessages = signal(false);

  patient = signal<PatientInfo | null>(null);
  newMessage = signal('');
  isSending = signal(false);
  windowExpiredConversationId = signal<number | null>(null);
  isTemplateModalOpen = signal(false);
  showAppointmentModal = signal(false);

  activeConversation = computed(() =>
    this.conversations().find((c) => c.id === this.activeConversationId()),
  );

  isBotActive = computed(() => this.activeConversation()?.status === 'bot');

  ngOnInit(): void {
    this.loadConversations(true);
    this.listenSocket();
    this.listenSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
    if (this.pendingScrollAnchor !== null) {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight - this.pendingScrollAnchor;
      }
      this.pendingScrollAnchor = null;
    }
  }

  openLinkPatientModal(): void {
    this.showLinkPatientModal.set(true);
  }

  onPatientLinked(patient: Patient): void {
    const id = this.activeConversationId();
    if (!id) return;

    this.chatService.linkPatient(id, patient.id).subscribe({
      next: () => {
        this.showLinkPatientModal.set(false);
        this.notification.success('Paciente vinculado com sucesso.');
        this.chatService.getPatient(id).subscribe({
          next: (p) => {
            this.patient.set(p);
            this.conversations.update((list) =>
              list.map((c) => (c.id === id ? { ...c, patientName: p.name } : c)),
            );
            this.cdr.markForCheck();
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao vincular paciente.'));
      },
    });
  }

  openNewConversationModal(): void {
    this.showNewConversationModal.set(true);
  }

  onConversationCreated(conv: Conversation): void {
    this.showNewConversationModal.set(false);
    this.conversations.update((list) => {
      const exists = list.some((c) => c.id === conv.id);
      const next = exists ? list.map((c) => (c.id === conv.id ? conv : c)) : [conv, ...list];
      return next;
    });
    this.selectConversation(conv.id);
    this.cdr.markForCheck();
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ── Busca ──
  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.searchInput$.next(value);
  }

  private listenSearch(): void {
    this.searchInput$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadConversations(true));
  }

  // ── Conversas / paginação ──
  private loadConversations(reset: boolean): void {
    if (this.isLoadingConversations()) return;
    if (reset) {
      this.conversationsPage.set(1);
    } else if (this.conversationsPage() >= this.conversationsTotalPages()) {
      return;
    } else {
      this.conversationsPage.update((p) => p + 1);
    }

    this.isLoadingConversations.set(true);

    this.chatService
      .getConversations({
        page: this.conversationsPage(),
        limit: PAGE_LIMIT,
        search: this.searchTerm().trim() || undefined,
        filter: this.filterTab(),
      })
      .subscribe({
        next: (res) => {
          this.conversations.update((list) => (reset ? res.data : [...list, ...res.data]));
          this.conversationsTotalPages.set(res.totalPages);
          this.isLoadingConversations.set(false);

          if (reset) {
            if (res.data.length) {
              this.selectConversation(res.data[0].id);
            } else {
              this.activeConversationId.set(null);
              this.messages.set([]);
              this.patient.set(null);
            }
          }

          const companyId = this.authService.getTokenPayload()?.companyId;
          if (reset && companyId) this.socketService.joinCompany(companyId);

          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoadingConversations.set(false);
          this.notification.error('Erro ao carregar conversas.');
        },
      });
  }

  onConversationsScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_UP_THRESHOLD) {
      this.loadConversations(false);
    }
  }

  setFilter(tab: ConversationsFilter): void {
    if (this.filterTab() === tab) return;
    this.filterTab.set(tab);
    this.loadConversations(true);
  }

  // ── Mensagens / paginação ──
  selectConversation(id: number): void {
    const prev = this.activeConversationId();
    if (prev) this.socketService.leaveConversation(prev);

    this.activeConversationId.set(id);
    this.messages.set([]);
    this.messagesPage.set(1);
    this.messagesTotalPages.set(1);
    this.patient.set(null);
    this.socketService.joinConversation(id);

    forkJoin({
      msgs: this.chatService.getMessages(id, { page: 1, limit: PAGE_LIMIT }),
      patient: this.chatService.getPatient(id),
    }).subscribe({
      next: ({ msgs, patient }) => {
        this.messages.set([...msgs.data].reverse());
        this.messagesTotalPages.set(msgs.totalPages);
        this.patient.set(patient);
        this.chatService.markAsRead(id).subscribe();
        this.cdr.markForCheck();
        this.shouldScrollToBottom = true;
      },
      error: () => this.notification.error('Erro ao carregar conversa.'),
    });
  }

  onMessagesScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    if (el.scrollTop > SCROLL_UP_THRESHOLD) return;
    if (this.isLoadingOlderMessages()) return;
    if (this.messagesPage() >= this.messagesTotalPages()) return;

    const id = this.activeConversationId();
    if (!id) return;

    this.isLoadingOlderMessages.set(true);
    const nextPage = this.messagesPage() + 1;

    this.chatService.getMessages(id, { page: nextPage, limit: PAGE_LIMIT }).subscribe({
      next: (res) => {
        this.pendingScrollAnchor = el.scrollHeight;
        this.messages.update((list) => [...[...res.data].reverse(), ...list]);
        this.messagesPage.set(nextPage);
        this.isLoadingOlderMessages.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingOlderMessages.set(false);
        this.notification.error('Erro ao carregar mensagens anteriores.');
      },
    });
  }

  // ── Deletar conversa ──
  async deleteConversation(): Promise<void> {
    const conv = this.activeConversation();
    if (!conv) return;

    const confirmed = await alertConfirm(
      `Excluir a conversa com "${conv.patientName ?? conv.phone}"?`,
    );
    if (!confirmed) return;

    this.chatService.deleteConversation(conv.id).subscribe({
      next: () => {
        this.conversations.update((list) => list.filter((c) => c.id !== conv.id));
        this.activeConversationId.set(null);
        this.messages.set([]);
        this.patient.set(null);
        this.notification.success('Conversa excluída com sucesso.');
      },
      error: () => this.notification.error('Erro ao excluir conversa.'),
    });
  }

  private listenSocket(): void {
    this.socketService
      .onNewMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => {
        if (msg.sender === 'patient') {
          this.notificationSound.play().catch(() => {});
        }

        if (msg.conversationId === this.activeConversationId()) {
          this.messages.update((list) => [...list, msg]);
          this.cdr.markForCheck();
          this.shouldScrollToBottom = true;

          if (msg.sender === 'patient') {
            this.chatService.markAsRead(msg.conversationId).subscribe();
          }
        }
      });

    this.socketService
      .onConversationUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((updated) => {
        const previous = this.conversations().find((c) => c.id === updated.id);

        this.conversations.update((list) => {
          const exists = list.some((c) => c.id === updated.id);
          const next = exists
            ? list.map((c) => (c.id === updated.id ? updated : c))
            : [updated, ...list];

          return [...next].sort((a, b) => {
            const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return timeB - timeA;
          });
        });

        this.cdr.markForCheck();

        if (updated.id !== this.activeConversationId() && updated.unread > 0) {
          this.notification.info(
            `Nova mensagem de ${updated.patientName ?? updated.phone}: ${updated.lastMessage ?? ''}`,
          );
        }

        if (previous?.status !== 'waiting' && updated.status === 'waiting') {
          this.notification.warning(
            `${updated.patientName ?? updated.phone} está aguardando atendimento`,
          );
        }
      });

    this.socketService
      .onMessageStatusUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((update) => {
        this.messages.update((list) =>
          list.map((m) =>
            m.id === update.messageId ? { ...m, status: update.status as MessageStatus } : m,
          ),
        );
        this.cdr.markForCheck();

        if (update.status === 'failed' && update.errorMessage) {
          this.notification.error(update.errorMessage);
        }

        if (update.errorCode === 131047) {
          this.windowExpiredConversationId.set(this.activeConversationId());
        }
      });

    this.socketService
      .onConversationDeleted()
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ conversationId }) => {
        this.conversations.update((list) => list.filter((c) => c.id !== conversationId));

        if (this.activeConversationId() === conversationId) {
          this.activeConversationId.set(null);
          this.messages.set([]);
          this.patient.set(null);
        }

        this.cdr.markForCheck();
      });
  }

  sendTemplate(templateName: string, components: object[] = []): void {
    const id = this.activeConversationId();
    if (!id) return;
    this.chatService.sendTemplate(id, templateName, components).subscribe({
      next: () => {
        this.windowExpiredConversationId.set(null);
        this.notification.success('Template enviado.');
      },
      error: () => this.notification.error('Erro ao enviar template.'),
    });
  }

  openTemplateModal(): void {
    this.isTemplateModalOpen.set(true);
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
    if (!text || !id || this.isSending() || this.patient()?.blocked) return;

    this.isSending.set(true);
    this.chatService.sendMessage(id, { text }).subscribe({
      next: () => {
        this.newMessage.set('');
        this.isSending.set(false);
      },
      error: () => {
        this.notification.error('Erro ao enviar mensagem.');
        this.isSending.set(false);
      },
    });
  }

  blockContact(): void {
    const id = this.activeConversationId();
    if (!id) return;
    this.chatService.blockContact(id).subscribe({
      next: (updated) => {
        this.patient.set(updated);
        this.notification.success(updated.blocked ? 'Contato bloqueado.' : 'Contato desbloqueado.');
      },
      error: () => this.notification.error('Erro ao atualizar bloqueio do contato.'),
    });
  }

  statusLabel(status: Conversation['status']): string {
    return { bot: 'Bot Ativo', human: 'Agente Humano', waiting: 'Aguardando' }[status];
  }

  statusClass(status: Conversation['status']): string {
    return {
      bot: 'bg-success-subtle text-success',
      human: 'bg-primary-subtle text-primary-text',
      waiting: 'bg-warning-subtle text-warning',
    }[status];
  }

  openAppointmentModal(): void {
    this.showAppointmentModal.set(true);
  }

  onAppointmentCreated(appointment: AppointmentResponse): void {
    this.showAppointmentModal.set(false);
    this.notification.success('Agendamento criado com sucesso.');
  }

  openRegisterPatientModal(): void {
    this.newPatient.set({ phone: this.patient()?.phone ?? '' });
    this.showRegisterPatientModal.set(true);
  }

  onSavePatient(entity: Partial<CreatePatientRequest>): void {
    if (!entity.name) {
      this.notification.warning('O campo Nome é obrigatório.');
      return;
    }
    if (entity.cpf && !/^\d{11}$/.test(entity.cpf)) {
      this.notification.warning('CPF deve conter exatamente 11 dígitos numéricos.');
      return;
    }

    this.patientsService.createPatient(entity as CreatePatientRequest).subscribe({
      next: (created) => {
        const id = this.activeConversationId();
        if (!id) return;

        this.chatService.linkPatient(id, created.id).subscribe({
          next: () => {
            this.showRegisterPatientModal.set(false);
            this.notification.success('Paciente registrado com sucesso.');
            this.chatService.getPatient(id).subscribe({
              next: (p) => {
                this.patient.set(p);
                this.conversations.update((list) =>
                  list.map((c) => (c.id === id ? { ...c, patientName: p.name } : c)),
                );
                this.cdr.markForCheck();
              },
            });
          },
          error: (err: HttpErrorResponse) => {
            this.notification.error(this.getErrorMessage(err, 'Erro ao vincular paciente.'));
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao registrar paciente.'));
      },
    });
  }

  private getErrorMessage(err: HttpErrorResponse, defaultMsg: string): string {
    const nestMessage = err?.error?.message;
    if (nestMessage) {
      return Array.isArray(nestMessage) ? nestMessage.join('<br>') : nestMessage;
    }
    return defaultMsg;
  }
}
