import {
  Component,
  inject,
  signal,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { Patient } from '../../../patients/types/patients.types';
import { PatientsService } from '../../../patients/services/patients.service';
import { ChatService } from '../../services/chat.service';
import { Conversation } from '../../types/chat.types';
import { NotificationService } from '../../../../shared/toastr/notification.service';

const SEARCH_DEBOUNCE_MS = 400;
const RESULTS_LIMIT = 15;

type ModalTab = 'search' | 'phone';

@Component({
  selector: 'app-new-conversation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-conversation-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewConversationModal implements OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<Conversation>();

  private patientsService = inject(PatientsService);
  private chatService = inject(ChatService);
  private notification = inject(NotificationService);
  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  activeTab = signal<ModalTab>('search');

  searchTerm = signal('');
  results = signal<Patient[]>([]);
  isLoading = signal(false);
  selectedId = signal<number | null>(null);

  phoneValue = signal('');
  isCreating = signal(false);

  constructor() {
    this.search$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((term) => {
          const trimmed = term.trim();
          if (!trimmed) {
            this.isLoading.set(false);
            return of({ data: [], total: 0 });
          }
          this.isLoading.set(true);
          return this.patientsService.getPatients({
            search: trimmed,
            skip: 0,
            take: RESULTS_LIMIT,
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res) => {
          this.results.set(res.data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: ModalTab): void {
    this.activeTab.set(tab);
    this.selectedId.set(null);
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.selectedId.set(null);
    if (!value.trim()) this.results.set([]);
    this.search$.next(value);
  }

  selectPatient(id: number): void {
    const patient = this.results().find((p) => p.id === id);
    if (!patient?.phone) return; // paciente sem telefone não pode iniciar conversa
    this.selectedId.set(id);
  }

  onPhoneChange(value: string): void {
    this.phoneValue.set(value);
  }

  confirmSearchTab(): void {
    const patient = this.results().find((p) => p.id === this.selectedId());
    if (!patient?.phone) return;
    this.createConversation(patient.phone, patient.id);
  }

  confirmPhoneTab(): void {
    const phone = this.phoneValue().trim();
    if (!phone) return;
    this.createConversation(phone);
  }

  private createConversation(phone: string, patientId?: number): void {
    if (this.isCreating()) return;
    this.isCreating.set(true);

    this.chatService.createConversation({ phone, patientId }).subscribe({
      next: (conv) => {
        this.isCreating.set(false);
        this.created.emit(conv);
        this.reset();
      },
      error: (err: HttpErrorResponse) => {
        this.isCreating.set(false);
        this.notification.error(this.getErrorMessage(err, 'Erro ao criar conversa.'));
      },
    });
  }

  onClose(): void {
    this.reset();
    this.close.emit();
  }

  private reset(): void {
    this.activeTab.set('search');
    this.searchTerm.set('');
    this.results.set([]);
    this.selectedId.set(null);
    this.phoneValue.set('');
    this.isCreating.set(false);
  }

  private getErrorMessage(err: HttpErrorResponse, defaultMsg: string): string {
    const nestMessage = err?.error?.message;
    if (nestMessage) {
      return Array.isArray(nestMessage) ? nestMessage.join('<br>') : nestMessage;
    }
    return defaultMsg;
  }
}
