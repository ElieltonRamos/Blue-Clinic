import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ScheduleService } from '../services/schedule.service';
import {
  AppointmentTypeSummary,
  CommissionForm,
  CommissionRateType,
  DAY_LABELS,
  DAY_SHORT,
  DayOfWeek,
  DoctorCommission,
  DoctorProfile,
  DoctorSchedule,
  DoctorSummary,
} from '../types/schedule.types';
import { NotificationService } from '../../../shared/toastr/notification.service';
import { AuthService } from '../../../core/services/auth.service';

type ActiveTab = 'horarios' | 'comissoes';

interface ScheduleForm {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  active: boolean;
  editing: boolean;
  scheduleId?: number;
  saving: boolean;
}

interface CommissionRow {
  commission: DoctorCommission;
  editing: boolean;
  saving: boolean;
  form: CommissionForm;
}

const DEFAULT_COMMISSION_FORM = (): CommissionForm => ({
  appointmentTypeId: null,
  doctorRateType: 'percentage',
  doctorRate: 0,
  clinicRateType: 'percentage',
  clinicRate: 0,
});

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule.html',
})
export class Schedule implements OnInit {
  private readonly service = inject(ScheduleService);
  private readonly notification = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly dayLabels = DAY_LABELS;
  readonly dayShort = DAY_SHORT;
  readonly allDays: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
  readonly tabs: { key: ActiveTab; label: string }[] = [
    { key: 'horarios', label: 'Horários de Atendimento' },
    { key: 'comissoes', label: 'Comissões' },
  ];
  readonly rateTypes: { value: CommissionRateType; label: string }[] = [
    { value: 'percentage', label: '%' },
    { value: 'fixed', label: 'R$' },
  ];

  // ── State ─────────────────────────────────────────────────────────────────
  activeTab = signal<ActiveTab>('horarios');
  loading = signal(false);
  loadingDoctors = signal(false);

  doctors: DoctorSummary[] = [];
  selectedDoctor: DoctorProfile | null = null;
  selectedDoctorId: number | null = null;

  appointmentTypes: AppointmentTypeSummary[] = [];

  readonly isAdmin: boolean = (() => {
    const token = localStorage.getItem('token') ?? '';
    return this.auth.hasRole(token, 'admin') || this.auth.hasRole(token, 'atendimento');
  })();

  // ── Schedule forms ────────────────────────────────────────────────────────
  scheduleForms: ScheduleForm[] = this.buildEmptyForms();

  // ── Commission rows ───────────────────────────────────────────────────────
  commissionRows: CommissionRow[] = [];
  showNewCommissionForm = false;
  newCommissionForm: CommissionForm = DEFAULT_COMMISSION_FORM();
  savingNewCommission = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.service.getAppointmentTypes().subscribe({
      next: (types) => (this.appointmentTypes = types),
    });

    if (this.isAdmin) {
      this.loadDoctors();
    } else {
      this.loadMe();
    }
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private loadDoctors(): void {
    this.loadingDoctors.set(true);
    this.service.getDoctors().subscribe({
      next: (doctors) => {
        this.doctors = doctors;
        this.loadingDoctors.set(false);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDoctors.set(false);
        this.notification.error(this.getErrorMessage(err, 'Erro ao carregar médicos'));
      },
    });
  }

  private loadMe(): void {
    this.loading.set(true);
    this.service.getMe().subscribe({
      next: (doctor) => {
        this.selectedDoctor = doctor;
        this.selectedDoctorId = doctor.id;
        this.syncForms(doctor.schedules);
        this.syncCommissionRows(doctor.commissions);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.notification.error(this.getErrorMessage(err, 'Erro ao carregar dados do médico'));
      },
    });
  }

  selectDoctor(id: number): void {
    if (this.selectedDoctorId === id) return;
    this.selectedDoctorId = id;
    this.loading.set(true);
    this.service.getDoctor(id).subscribe({
      next: (doctor) => {
        this.selectedDoctor = doctor;
        this.syncForms(doctor.schedules);
        this.syncCommissionRows(doctor.commissions);
        this.showNewCommissionForm = false;
        this.newCommissionForm = DEFAULT_COMMISSION_FORM();
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.notification.error(this.getErrorMessage(err, 'Erro ao carregar médico'));
      },
    });
  }

  // ── Form sync ─────────────────────────────────────────────────────────────

  private buildEmptyForms(): ScheduleForm[] {
    return this.allDays.map((day) => ({
      dayOfWeek: day,
      startTime: '08:00',
      endTime: '18:00',
      active: false,
      editing: false,
      saving: false,
    }));
  }

  private syncForms(schedules: DoctorSchedule[]): void {
    this.scheduleForms = this.allDays.map((day) => {
      const existing = schedules.find((s) => s.dayOfWeek === day);
      return {
        dayOfWeek: day,
        startTime: existing?.startTime ?? '08:00',
        endTime: existing?.endTime ?? '18:00',
        active: !!existing?.active,
        editing: false,
        scheduleId: existing?.id,
        saving: false,
      };
    });
  }

  private syncCommissionRows(commissions: DoctorCommission[]): void {
    console.log('commissions', commissions);
    this.commissionRows = commissions.map((c) => ({
      commission: c,
      editing: false,
      saving: false,
      form: {
        appointmentTypeId: c.appointmentTypeId,
        doctorRateType: c.doctorRateType,
        doctorRate: c.doctorRate,
        clinicRateType: c.clinicRateType,
        clinicRate: c.clinicRate,
      },
    }));
  }

  // ── Schedule actions ──────────────────────────────────────────────────────

  toggleDay(form: ScheduleForm): void {
    if (form.saving) return;

    if (!form.scheduleId) {
      form.active = !form.active;
      form.editing = form.active;
      this.cdr.detectChanges();
      return;
    }

    form.saving = true;
    this.service
      .updateSchedule(this.selectedDoctor!.id, form.scheduleId, { active: !form.active })
      .subscribe({
        next: (updated) => {
          form.active = updated.active;
          form.saving = false;
          this.notification.success(
            `${this.dayLabels[form.dayOfWeek]} ${updated.active ? 'ativado' : 'desativado'}`,
          );
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          form.saving = false;
          this.notification.error(this.getErrorMessage(err, 'Erro ao atualizar dia'));
          this.cdr.detectChanges();
        },
      });
  }

  saveSchedule(form: ScheduleForm): void {
    if (!this.selectedDoctor) return;
    if (!this.validateScheduleForm(form)) return;

    form.saving = true;

    if (form.scheduleId) {
      this.service
        .updateSchedule(this.selectedDoctor.id, form.scheduleId, {
          startTime: form.startTime,
          endTime: form.endTime,
          active: form.active,
        })
        .subscribe({
          next: (updated) => {
            form.scheduleId = updated.id;
            form.active = updated.active;
            form.editing = false;
            form.saving = false;
            this.notification.success('Horário atualizado');
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => {
            form.saving = false;
            this.notification.error(this.getErrorMessage(err, 'Erro ao atualizar horário'));
            this.cdr.detectChanges();
          },
        });
    } else {
      this.service
        .createSchedule(this.selectedDoctor.id, {
          dayOfWeek: form.dayOfWeek,
          startTime: form.startTime,
          endTime: form.endTime,
          active: true,
        })
        .subscribe({
          next: (created) => {
            form.scheduleId = created.id;
            form.active = created.active;
            form.editing = false;
            form.saving = false;
            this.notification.success(`${this.dayLabels[form.dayOfWeek]} configurado`);
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => {
            form.saving = false;
            this.notification.error(this.getErrorMessage(err, 'Erro ao criar horário'));
            this.cdr.detectChanges();
          },
        });
    }
  }

  removeSchedule(form: ScheduleForm): void {
    if (!this.selectedDoctor || !form.scheduleId) return;
    form.saving = true;
    this.service.removeSchedule(this.selectedDoctor.id, form.scheduleId).subscribe({
      next: () => {
        form.scheduleId = undefined;
        form.active = false;
        form.editing = false;
        form.saving = false;
        form.startTime = '08:00';
        form.endTime = '18:00';
        this.notification.success('Horário removido');
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        form.saving = false;
        this.notification.error(this.getErrorMessage(err, 'Erro ao remover horário'));
        this.cdr.detectChanges();
      },
    });
  }

  // ── Commission actions ────────────────────────────────────────────────────

  get availableTypesForNew(): AppointmentTypeSummary[] {
    const used = this.commissionRows.map((r) => r.commission.appointmentTypeId);
    return this.appointmentTypes.filter((t) => !used.includes(t.id));
  }

  availableTypesForRow(row: CommissionRow): AppointmentTypeSummary[] {
    const used = this.commissionRows
      .filter((r) => r !== row)
      .map((r) => r.commission.appointmentTypeId);
    return this.appointmentTypes.filter((t) => !used.includes(t.id));
  }

  saveNewCommission(): void {
    if (!this.selectedDoctor) return;
    if (!this.validateCommissionForm(this.newCommissionForm)) return;

    this.savingNewCommission = true;
    this.service
      .createCommission(this.selectedDoctor.id, {
        appointmentTypeId: this.newCommissionForm.appointmentTypeId!,
        doctorRateType: this.newCommissionForm.doctorRateType,
        doctorRate: this.newCommissionForm.doctorRate,
        clinicRateType: this.newCommissionForm.clinicRateType,
        clinicRate: this.newCommissionForm.clinicRate,
      })
      .subscribe({
        next: (created) => {
          this.commissionRows.push({
            commission: created,
            editing: false,
            saving: false,
            form: { ...this.newCommissionForm, appointmentTypeId: created.appointmentTypeId },
          });
          this.newCommissionForm = DEFAULT_COMMISSION_FORM();
          this.showNewCommissionForm = false;
          this.savingNewCommission = false;
          this.notification.success('Comissão criada');
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.savingNewCommission = false;
          this.notification.error(this.getErrorMessage(err, 'Erro ao criar comissão'));
          this.cdr.detectChanges();
        },
      });
  }

  saveCommission(row: CommissionRow): void {
    if (!this.selectedDoctor) return;
    if (!this.validateCommissionForm(row.form)) return;

    row.saving = true;
    this.service
      .updateCommission(this.selectedDoctor.id, row.commission.id, {
        doctorRateType: row.form.doctorRateType,
        doctorRate: row.form.doctorRate,
        clinicRateType: row.form.clinicRateType,
        clinicRate: row.form.clinicRate,
      })
      .subscribe({
        next: (updated) => {
          row.commission = updated;
          row.editing = false;
          row.saving = false;
          this.notification.success('Comissão atualizada');
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          row.saving = false;
          this.notification.error(this.getErrorMessage(err, 'Erro ao atualizar comissão'));
          this.cdr.detectChanges();
        },
      });
  }

  removeCommission(row: CommissionRow): void {
    if (!this.selectedDoctor) return;
    row.saving = true;
    this.service.removeCommission(this.selectedDoctor.id, row.commission.id).subscribe({
      next: () => {
        this.commissionRows = this.commissionRows.filter((r) => r !== row);
        this.notification.success('Comissão removida');
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        row.saving = false;
        this.notification.error(this.getErrorMessage(err, 'Erro ao remover comissão'));
        this.cdr.detectChanges();
      },
    });
  }

  cancelEditCommission(row: CommissionRow): void {
    row.form = {
      appointmentTypeId: row.commission.appointmentTypeId,
      doctorRateType: row.commission.doctorRateType,
      doctorRate: row.commission.doctorRate,
      clinicRateType: row.commission.clinicRateType,
      clinicRate: row.commission.clinicRate,
    };
    row.editing = false;
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private validateScheduleForm(form: ScheduleForm): boolean {
    if (!form.startTime || !form.endTime) {
      this.notification.error('Preencha os horários');
      return false;
    }
    if (form.startTime >= form.endTime) {
      this.notification.error('Horário de início deve ser menor que o de término');
      return false;
    }
    return true;
  }

  private validateCommissionForm(form: CommissionForm): boolean {
    if (!form.appointmentTypeId) {
      this.notification.error('Selecione o tipo de consulta');
      return false;
    }
    if (form.doctorRate < 0 || form.clinicRate < 0) {
      this.notification.error('Taxas devem ser maiores ou iguais a zero');
      return false;
    }
    return true;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private getErrorMessage(err: HttpErrorResponse, defaultMsg: string): string {
    const nestMessage = err?.error?.message;
    if (nestMessage) {
      return Array.isArray(nestMessage) ? nestMessage.join(', ') : nestMessage;
    }
    return defaultMsg;
  }

  rateLabel(value: number, type: CommissionRateType): string {
    return type === 'percentage' ? `${value}%` : `R$ ${value.toFixed(2)}`;
  }

  trackByDay(_: number, form: ScheduleForm): number {
    return form.dayOfWeek;
  }

  trackByCommission(_: number, row: CommissionRow): number {
    return row.commission.id;
  }
}
