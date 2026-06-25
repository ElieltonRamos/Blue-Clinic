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
import { takeUntil } from 'rxjs/operators';
import { ChatService } from '../services/chat.service';
import {
  ChatMessage,
  Conversation,
  ConversationStatus,
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
import { CreatePatientRequest } from '../../patients/types/patients.types';
import { PatientsService } from '../../patients/services/patients.service';
import { HttpErrorResponse } from '@angular/common/http';

type FilterTab = 'todas' | 'aguardando';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, TemplateModal, CreateAppointmentModal, ModalEditEntity],
  templateUrl: './chat-automation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatAutomation implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  private chatService = inject(ChatService);
  private socketService = inject(ChatSocketService);
  private notification = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private shouldScroll = false;
  private authService = inject(AuthService);
  private patientsService = inject(PatientsService);

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

  allConversations = signal<Conversation[]>([]);
  activeConversationId = signal<number | null>(null);
  messages = signal<ChatMessage[]>([]);
  patient = signal<PatientInfo | null>(null);
  filterTab = signal<FilterTab>('todas');
  newMessage = signal('');
  isSending = signal(false);
  windowExpiredConversationId = signal<number | null>(null);
  isTemplateModalOpen = signal(false);
  showAppointmentModal = signal(false);

  conversations = computed(() =>
    this.filterTab() === 'aguardando'
      ? this.allConversations().filter((c) => c.status === 'waiting' || c.unread > 0)
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

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (list) => {
        this.allConversations.set(list);
        const companyId = this.authService.getTokenPayload()?.companyId;
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
          this.cdr.markForCheck();
          setTimeout(() => this.scrollToBottom());

          if (msg.sender === 'patient') {
            this.chatService.markAsRead(msg.conversationId).subscribe();
          }
        }
      });

    this.socketService
      .onConversationUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((updated) => {
        const previous = this.allConversations().find((c) => c.id === updated.id);

        this.allConversations.update((list) =>
          list.map((c) => (c.id === updated.id ? updated : c)),
        );
        this.cdr.markForCheck();

        if (updated.id !== this.activeConversationId() && updated.unread > 0) {
          this.notification.info(`Nova mensagem de ${updated.patientName ?? updated.phone}`);
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
        this.chatService.markAsRead(id).subscribe();
        this.cdr.markForCheck();
        setTimeout(() => this.scrollToBottom());
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
    if (!entity.cpf) {
      this.notification.warning('O campo CPF é obrigatório.');
      return;
    }
    if (!/^\d{11}$/.test(entity.cpf)) {
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
                this.allConversations.update((list) =>
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
