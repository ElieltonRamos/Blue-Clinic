import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Appointment,
  AppointmentStatus,
  AutoConfirmation,
  BlockedHour,
  Doctor,
  PaymentMethodEntry,
} from '../types/calendar.types';
import { CalendarService } from '../services/calendar.service';
import { PaymentMethod } from '../../financial/types/financial.types';
import { CreateAppointmentModal } from '../../../shared/create-appointment-modal/pages/create-appointment-modal';
import { AppointmentResponse } from '../../../shared/create-appointment-modal/types/create-appointment.types';

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  currentMonth: boolean;
  isToday: boolean;
  label: string;
  appointments: Appointment[];
}

const PAYMENT_METHODS: { method: PaymentMethod; label: string }[] = [
  { method: 'pix', label: 'PIX' },
  { method: 'dinheiro', label: 'Dinheiro' },
  { method: 'cartao', label: 'Cartão' },
  { method: 'convenio', label: 'Convênio' },
];

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateAppointmentModal],
  templateUrl: './calendar.html',
})
export class Calendar implements OnInit {
  private readonly service = inject(CalendarService);

  readonly weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  readonly availablePaymentMethods = PAYMENT_METHODS;

  private currentDate = signal(new Date());
  private allAppointments = signal<Appointment[]>([]);
  private doctorMap = new Map<number, string>();

  doctors: Doctor[] = [];
  blockedHours: BlockedHour[] = [];
  autoConfirmation: AutoConfirmation = { confirmed: 0, total: 0 };
  selectedDay = signal<CalendarDay | null>(null);
  showCreateModal = false;
  cancelReasonText = '';
  rescheduleReasonText = '';
  pendingCancelId: number | null = null;
  pendingRescheduleId: number | null = null;

  paymentModal: Appointment | null = null;
  paymentEntries: { method: PaymentMethod; value: number; enabled: boolean }[] = [];
  pendingReschedulePatientId: number | null = null;

  loading = false;
  error: string | null = null;

  get monthLabel(): string {
    const d = this.currentDate();
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  private get currentMonthParam(): string {
    const d = this.currentDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  readonly calendarDays = computed((): CalendarDay[] => {
    const ref = this.currentDate();
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    const days: CalendarDay[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      const date = new Date(year, month, -firstDay.getDay() + i + 1);
      days.push(this.buildDay(date, false, today));
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push(this.buildDay(date, true, today));
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const date = new Date(year, month + 1, d);
        days.push(this.buildDay(date, false, today));
      }
    }

    return days;
  });

  ngOnInit(): void {
    this.loadDoctors();
    this.loadMonthData();
    this.loadBlockedSlots();
  }

  prevMonth(): void {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.loadMonthData();
  }

  requestCancel(apt: Appointment): void {
    this.pendingCancelId = apt.id;
    this.pendingRescheduleId = null;
    this.cancelReasonText = '';
  }

  requestReschedule(apt: Appointment): void {
    this.pendingRescheduleId = apt.id;
    this.pendingCancelId = null;
    this.rescheduleReasonText = '';
  }

  dismissInline(): void {
    this.pendingCancelId = null;
    this.pendingRescheduleId = null;
  }

  private loadBlockedSlots(): void {
    this.service.getBlockedSlots().subscribe({
      next: (slots) => {
        this.blockedHours = slots.map((s) => ({
          label: s.label,
          recurrence: this.recurrenceLabel(s.recurrence),
          color: s.type === 'break' ? 'primary' : 'error',
        }));
      },
      error: (err: HttpErrorResponse) => {
        this.error = this.getErrorMessage(err, 'Erro ao carregar bloqueios');
      },
    });
  }

  private recurrenceLabel(recurrence: string): string {
    const map: Record<string, string> = {
      none: 'Sem recorrência',
      daily: 'Diário',
      weekly: 'Semanal',
      monthly: 'Mensal',
    };
    return map[recurrence] ?? recurrence;
  }

  nextMonth(): void {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.loadMonthData();
  }

  openModal(day: CalendarDay): void {
    this.selectedDay.set(day);
  }

  closeModal(): void {
    this.selectedDay.set(null);
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  onAppointmentCreated(appointment: AppointmentResponse): void {
    this.showCreateModal = false;
    this.loadMonthData();
  }

  // ── Payment modal ─────────────────────────────────────────────

  openPaymentModal(apt: Appointment): void {
    this.paymentModal = apt;
    this.paymentEntries = PAYMENT_METHODS.map((m) => ({
      method: m.method,
      value: 0,
      enabled: false,
    }));
  }

  closePaymentModal(): void {
    this.paymentModal = null;
    this.paymentEntries = [];
  }

  get paymentTotal(): number {
    return this.paymentEntries.filter((e) => e.enabled).reduce((sum, e) => sum + (e.value || 0), 0);
  }

  get paymentValid(): boolean {
    return this.paymentTotal > 0 && this.paymentEntries.some((e) => e.enabled && e.value > 0);
  }

  confirmPayment(): void {
    if (!this.paymentModal || !this.paymentValid) return;

    const apt = this.paymentModal;
    const entries: PaymentMethodEntry[] = this.paymentEntries
      .filter((e) => e.enabled && e.value > 0)
      .map((e) => ({ method: e.method, value: e.value }));

    this.service.createPayment(apt.id, entries).subscribe({
      next: () => {
        this.updateAppointmentStatus(apt.id, 'paid');
        this.closePaymentModal();
      },
      error: (err: HttpErrorResponse) => {
        this.error = this.getErrorMessage(err, 'Erro ao registrar pagamento');
      },
    });
  }

  doctorNameFor(doctorId: number): string {
    return this.doctorMap.get(doctorId) ?? String(doctorId);
  }

  methodLabel(method: PaymentMethod): string {
    return { pix: 'PIX', dinheiro: 'Dinheiro', cartao: 'Cartão', convenio: 'Convênio' }[method];
  }

  dayCellClass(day: CalendarDay): string {
    if (!day.currentMonth) return 'border-(--color-border) opacity-30 cursor-default';
    if (day.isToday)
      return 'border-(--color-primary)/40 bg-(--color-primary-subtle) cursor-pointer hover:border-(--color-primary)/60';
    return 'border-(--color-border) bg-(--color-bg-card) cursor-pointer hover:border-(--color-border-md) hover:bg-(--color-bg-overlay)';
  }

  statusDotClass(status: AppointmentStatus): string {
    const map: Record<AppointmentStatus, string> = {
      pending: 'bg-(--color-info)',
      confirmed: 'bg-(--color-primary-text)',
      paid: 'bg-(--color-success)',
      finished: 'bg-(--color-primary-text)',
      cancelled: 'bg-(--color-dot-neutral)',
      blocked: 'bg-(--color-danger)',
      rescheduled: 'bg-(--color-warning)',
      external: 'bg-(--color-dot-neutral)',
    };
    return map[status] ?? 'bg-(--color-dot-neutral)';
  }

  statusBadgeClass(status: AppointmentStatus): string {
    const map: Record<AppointmentStatus, string> = {
      pending: 'bg-(--color-info-subtle) text-(--color-info)',
      confirmed: 'bg-(--color-primary-subtle) text-(--color-primary-text)',
      paid: 'bg-(--color-success-subtle) text-(--color-success)',
      finished: 'bg-(--color-bg-hover-md) text-(--color-text-secondary)',
      cancelled: 'bg-(--color-bg-hover-md) text-(--color-text-muted)',
      blocked: 'bg-(--color-danger-subtle) text-(--color-danger)',
      rescheduled: 'bg-warning-subtle text-warning',
      external: 'bg-(--color-bg-hover-md) text-(--color-text-secondary)',
    };
    return map[status] ?? 'bg-(--color-bg-hover-md) text-(--color-text-secondary)';
  }

  statusLabel(status: AppointmentStatus): string {
    const map: Record<AppointmentStatus, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      paid: 'Pago',
      finished: 'Finalizado',
      cancelled: 'Cancelado',
      blocked: 'Bloqueado',
      external: 'Externo',
      rescheduled: 'Remarcado',
    };
    return map[status] ?? status;
  }

  // ── Private / Helpers ─────────────────────────────────────────

  private loadDoctors(): void {
    this.service.getDoctors().subscribe({
      next: (doctors) => {
        this.doctors = doctors;
        doctors.forEach((d) => this.doctorMap.set(d.id, d.name));
      },
      error: (err: HttpErrorResponse) => {
        this.error = this.getErrorMessage(err, 'Erro ao carregar médicos');
      },
    });
  }

  private loadMonthData(): void {
    const month = this.currentMonthParam;
    this.loading = true;
    this.error = null;

    this.service.getAppointments(month).subscribe({
      next: (appointments) => {
        this.allAppointments.set(appointments);
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.error = this.getErrorMessage(err, 'Erro ao carregar agendamentos');
        this.loading = false;
      },
    });

    this.service.getAutoConfirmation(month).subscribe({
      next: (data) => (this.autoConfirmation = data),
    });
  }

  private updateAppointmentStatus(id: number, status: AppointmentStatus): void {
    this.allAppointments.update((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));

    const day = this.selectedDay();
    if (day) {
      this.selectedDay.set({
        ...day,
        appointments: day.appointments.map((a) => (a.id === id ? { ...a, status } : a)),
      });
    }
  }

  private buildDay(date: Date, currentMonth: boolean, today: Date): CalendarDay {
    return {
      date,
      dayNumber: date.getDate(),
      currentMonth,
      isToday: currentMonth && this.isSameDay(date, today),
      label: date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
      appointments: currentMonth ? this.appointmentsForDate(date) : [],
    };
  }

  private appointmentsForDate(date: Date): Appointment[] {
    return this.allAppointments().filter((a) => {
      const [year, month, day] = (a.date as string).split('-').map(Number);
      return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
    });
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private getErrorMessage(err: HttpErrorResponse, defaultMsg: string): string {
    const nestMessage = err?.error?.message;
    if (nestMessage) {
      return Array.isArray(nestMessage) ? nestMessage.join(', ') : nestMessage;
    }
    return defaultMsg;
  }

  confirmAppointment(apt: Appointment): void {
    this.service.updateStatus(apt.id, 'confirmed').subscribe({
      next: () => this.updateAppointmentStatus(apt.id, 'confirmed'),
      error: (err) => (this.error = this.getErrorMessage(err, 'Erro ao confirmar')),
    });
  }

  finishAppointment(apt: Appointment): void {
    this.service.updateStatus(apt.id, 'finished').subscribe({
      next: () => this.updateAppointmentStatus(apt.id, 'finished'),
      error: (err) => (this.error = this.getErrorMessage(err, 'Erro ao finalizar')),
    });
  }

  cancelAppointment(apt: Appointment): void {
    this.service.updateStatus(apt.id, 'cancelled', this.cancelReasonText).subscribe({
      next: () => {
        this.updateAppointmentStatus(apt.id, 'cancelled');
        this.dismissInline();
      },
      error: (err) => (this.error = this.getErrorMessage(err, 'Erro ao cancelar')),
    });
  }

  rescheduleAppointment(apt: Appointment): void {
    this.service.updateStatus(apt.id, 'rescheduled', this.rescheduleReasonText).subscribe({
      next: () => {
        this.updateAppointmentStatus(apt.id, 'rescheduled');
        this.dismissInline();
        this.pendingReschedulePatientId = apt.patientId;
        this.showCreateModal = true;
      },
      error: (err) => (this.error = this.getErrorMessage(err, 'Erro ao remarcar')),
    });
  }
}
