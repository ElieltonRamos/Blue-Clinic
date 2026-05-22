import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientsService } from '../services/patients.service';
import {
  Patient,
  PatientDetail,
  CreatePatientRequest,
  UpdatePatientRequest,
} from '../types/patients.types';
import { FormField, ModalEditEntity } from '../../../shared/modal-edit-entity/modal-edit-entity';
import { NotificationService } from '../../../shared/toastr/notification.service';

const AVATAR_COLORS = [
  'bg-primary text-btn-primary-text',
  'bg-info text-btn-primary-text',
  'bg-success text-btn-primary-text',
];

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, ModalEditEntity],
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

  showCreateModal = signal(false);
  newPatient = signal<Partial<CreatePatientRequest>>({});

  showEditModal = signal(false);
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
    this.patientsService.getPatients().subscribe({
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
      error: () => this.loading.set(false),
    });
  }

  selectPatient(id: number): void {
    this.patientsService.getPatientDetail(id).subscribe({
      next: (detail) => this.selectedDetail.set(detail),
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
      error: (err) => {
        const msg = err?.error?.message;
        this.notification.error(
          Array.isArray(msg) ? msg.join('<br>') : (msg ?? 'Erro ao atualizar paciente.'),
        );
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
      error: (err) => {
        const msg = err?.error?.message;
        this.notification.error(
          Array.isArray(msg) ? msg.join('<br>') : (msg ?? 'Erro ao registrar paciente.'),
        );
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
}
