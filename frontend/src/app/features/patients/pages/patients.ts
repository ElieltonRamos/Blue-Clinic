import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PatientsService } from '../services/patients.service';
import {
  Patient,
  PatientDetail,
  CreatePatientRequest,
  UpdatePatientRequest,
} from '../types/patients.types';
import { FormField, ModalEditEntity } from '../../../shared/modal-edit-entity/modal-edit-entity';
import { NotificationService } from '../../../shared/toastr/notification.service';
import { PaginatorComponent } from '../../../shared/paginator/paginator.component';
import { environment } from '../../../core/services/environment';
import { AppointmentResponse } from '../../../shared/create-appointment-modal/types/create-appointment.types';
import { CreateAppointmentModal } from "../../../shared/create-appointment-modal/pages/create-appointment-modal";

const AVATAR_COLORS = [
  'bg-primary text-btn-primary-text',
  'bg-info text-btn-primary-text',
  'bg-success text-btn-primary-text',
];

const ITEMS_PER_PAGE = 100;

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalEditEntity, PaginatorComponent, CreateAppointmentModal],
  templateUrl: './patients.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Patients implements OnInit {
  private patientsService = inject(PatientsService);
  private notification = inject(NotificationService);

  patients = signal<Patient[]>([]);
  selectedDetail = signal<PatientDetail | null>(null);
  totalCount = signal(0);
  loading = signal(false);

  page = signal(1);
  searchName = signal('');
  searchCpf = signal('');
  readonly itemsPerPage = ITEMS_PER_PAGE;

  showCreateModal = signal(false);
  newPatient = signal<Partial<CreatePatientRequest>>({});

  showEditModal = signal(false);
  showAppointmentModal = signal(false);
  editPatient = signal<Partial<UpdatePatientRequest>>({});

  patientFields: FormField[] = [
    { name: 'name', label: 'Nome', type: 'text', placeholder: 'Nome completo', required: true },
    { name: 'email', label: 'E-mail', type: 'email', placeholder: 'email@exemplo.com' },
    { name: 'phone', label: 'Telefone', type: 'text', placeholder: '(00) 00000-0000' },
    { name: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00' },
    { name: 'birthDate', label: 'Data de Nascimento', type: 'date' },
  ];

  editFields: FormField[] = [
    { name: 'name', label: 'Nome', type: 'text', placeholder: 'Nome completo' },
    { name: 'phone', label: 'Telefone', type: 'text', placeholder: '(00) 00000-0000' },
    { name: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00' },
    { name: 'birthDate', label: 'Data de Nascimento', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: ['Ativo', 'Inativo'] },
    { name: 'whatsappActive', label: 'WhatsApp Ativo', type: 'select', options: ['true', 'false'] },
  ];

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading.set(true);
    const skip = (this.page() - 1) * this.itemsPerPage;
    const search = this.searchName().trim() || this.searchCpf().trim() || undefined;

    this.patientsService.getPatients({ skip, take: this.itemsPerPage, search }).subscribe({
      next: ({ data, total }) => {
        this.patients.set(
          data.map((p, i) => ({
            ...p,
            initials: this.getInitials(p.name),
            avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
          })),
        );
        this.totalCount.set(total);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.notification.error(this.getErrorMessage(err, 'Erro ao carregar pacientes'));
      },
    });
  }

  openAppointmentModal(): void {
    this.showAppointmentModal.set(true);
  }

  onAppointmentCreated(appointment: AppointmentResponse): void {
    this.showAppointmentModal.set(false);
    this.notification.success('Agendamento criado com sucesso.');
    this.selectPatient(this.selectedDetail()!.id); // recarrega o detalhe para atualizar nextAppointment
  }

  onSearch(): void {
    this.page.set(1);
    this.loadPatients();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.loadPatients();
  }

  selectPatient(id: number): void {
    this.patientsService.getPatientDetail(id).subscribe({
      next: (detail) => this.selectedDetail.set(detail),
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao carregar detalhes do paciente'));
      },
    });
  }

  openEditModal(): void {
    const detail = this.selectedDetail();
    if (!detail) return;
    this.editPatient.set({ name: detail.name, whatsappActive: detail.whatsappActive });
    this.showEditModal.set(true);
  }

  onUpdatePatient(entity: Partial<UpdatePatientRequest>): void {
    const detail = this.selectedDetail();
    if (!detail) return;
    this.patientsService.updatePatient(detail.id, entity).subscribe({
      next: () => {
        this.showEditModal.set(false);
        this.notification.success('Paciente atualizado com sucesso.');
        this.loadPatients();
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao atualizar paciente.'));
      },
    });
  }

  clearSelection(): void {
    this.selectedDetail.set(null);
  }

  openCreateModal(): void {
    this.newPatient.set({});
    this.showCreateModal.set(true);
  }

  onSavePatient(entity: Partial<CreatePatientRequest>): void {
    if (!entity.name) {
      this.notification.warning('O campo Nome é obrigatório.');
      return;
    }
    this.patientsService.createPatient(entity as CreatePatientRequest).subscribe({
      next: () => {
        this.showCreateModal.set(false);
        this.notification.success('Paciente registrado com sucesso.');
        this.loadPatients();
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao registrar paciente.'));
      },
    });
  }

  isSelected(id: number): boolean {
    return this.selectedDetail()?.id === id;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatMemberSince(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  formatNextAppointment(date: string, startTime: string): string {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const isToday = d.toDateString() === today.toDateString();
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const label = isToday
      ? 'Hoje'
      : isTomorrow
        ? 'Amanhã'
        : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return `${label}, ${startTime}`;
  }

  onUploadDocument(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const detail = this.selectedDetail();
    if (!file || !detail) return;

    this.patientsService.uploadDocument(detail.id, file).subscribe({
      next: (doc) => {
        this.selectedDetail.update((d) => (d ? { ...d, documents: [...d.documents, doc] } : d));
        this.notification.success('Documento enviado com sucesso.');
      },
      error: (err: HttpErrorResponse) => {
        this.notification.error(this.getErrorMessage(err, 'Erro ao enviar documento.'));
      },
    });

    input.value = '';
  }

  getDocumentUrl(url: string): string {
    return `${environment.apiUrl}${url}`;
  }

  private getErrorMessage(err: HttpErrorResponse, defaultMsg: string): string {
    const nestMessage = err?.error?.message;
    if (nestMessage) {
      return Array.isArray(nestMessage) ? nestMessage.join('<br>') : nestMessage;
    }
    return defaultMsg;
  }
}
