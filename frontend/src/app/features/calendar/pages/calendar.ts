import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Appointment,
  AppointmentStatus,
  AutoConfirmation,
  BlockedHour,
  CalendarDay,
  Doctor,
  PaymentEntry,
  PaymentMethodConfig,
  PaymentResponseDto,
} from '../types/calendar.types';
import { CalendarService } from '../services/calendar.service';
import { PaymentMethod } from '../../financial/types/financial.types';
import { CreateAppointmentModal } from '../../../shared/create-appointment-modal/pages/create-appointment-modal';
import { AppointmentResponse } from '../../../shared/create-appointment-modal/types/create-appointment.types';
import { NotificationService } from '../../../shared/toastr/notification.service';
import { ModalAppointmentReceipt } from '../../../shared/modal-appointment-receipt/modal-appointment-receipt';

const PAYMENT_METHODS: PaymentMethodConfig[] = [
  { method: 'pix', label: 'PIX', icon: '📱' },
  { method: 'dinheiro', label: 'Dinheiro', icon: '💵' },
  { method: 'cartao', label: 'Cartão', icon: '💳' },
  { method: 'convenio', label: 'Convênio', icon: '🏥' },
];

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateAppointmentModal, ModalAppointmentReceipt],
  templateUrl: './calendar.html',
})
export class Calendar implements OnInit {
  private readonly service = inject(CalendarService);
  private readonly notify = inject(NotificationService);

  readonly weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  readonly availablePaymentMethods = PAYMENT_METHODS;

  private currentDate = signal(new Date());
  private allAppointments = signal<Appointment[]>([]);
  private doctorMap = new Map<number, string>();

  doctors: Doctor[] = [];
  receiptData: PaymentResponseDto | null = null;
  blockedHours: BlockedHour[] = [];
  autoConfirmation: AutoConfirmation = { confirmed: 0, total: 0 };

  selectedDay = signal<CalendarDay | null>(null);
  actionLoading = signal(false); // bloqueia modais durante ações
  pageLoading = signal(false); // carregamento mensal

  showCreateModal = false;
  cancelReasonText = '';
  rescheduleReasonText = '';
  pendingCancelId: number | null = null;
  pendingRescheduleId: number | null = null;
  pendingReschedulePatientId: number | null = null;

  paymentModal: Appointment | null = null;
  paymentEntries: PaymentEntry[] = [];
  newPaymentMethod: PaymentMethod | null = null;
  newPaymentAmount = 0;

  // ── Getters ───────────────────────────────────────────────────

  get monthLabel(): string {
    return this.currentDate().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  private get currentMonthParam(): string {
    const d = this.currentDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  get paymentRemaining(): number {
    const expected = this.paymentModal?.price ?? null;
    if (expected == null) return 0;
    const paid = this.paymentEntries.reduce((sum, e) => sum + e.amount - e.change, 0);
    return Math.max(0, expected - paid);
  }

  get paymentPreviewChange(): number {
    if (this.newPaymentMethod !== 'dinheiro') return 0;
    return Math.max(0, this.newPaymentAmount - this.paymentRemaining);
  }

  get paymentValid(): boolean {
    return this.paymentEntries.length > 0 && this.paymentRemaining <= 0.01;
  }

  // ── Calendar computed ─────────────────────────────────────────

  readonly calendarDays = computed((): CalendarDay[] => {
    const ref = this.currentDate();
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    const days: CalendarDay[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(this.buildDay(new Date(year, month, -firstDay.getDay() + i + 1), false, today));
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(this.buildDay(new Date(year, month, d), true, today));
    }
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        days.push(this.buildDay(new Date(year, month + 1, d), false, today));
      }
    }
    return days;
  });

  // ── Lifecycle ─────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadDoctors();
    this.loadMonthData();
    this.loadBlockedSlots();
  }

  // ── Navigation ────────────────────────────────────────────────

  prevMonth(): void {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.loadMonthData();
  }

  nextMonth(): void {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.loadMonthData();
  }

  // ── Day modal ─────────────────────────────────────────────────

  openModal(day: CalendarDay): void {
    this.selectedDay.set(day);
  }

  closeModal(): void {
    if (this.actionLoading()) return;
    this.selectedDay.set(null);
  }

  // ── Inline actions ────────────────────────────────────────────

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

  // ── Create modal ──────────────────────────────────────────────

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  onAppointmentCreated(_appointment: AppointmentResponse): void {
    this.showCreateModal = false;
    this.loadMonthData();
    this.notify.success('Agendamento criado com sucesso');
  }

  // ── Payment modal ─────────────────────────────────────────────

  openPaymentModal(apt: Appointment): void {
    this.paymentModal = apt;
    this.paymentEntries = [];
    this.newPaymentMethod = null;
    this.newPaymentAmount = 0;
  }

  closePaymentModal(): void {
    if (this.actionLoading()) return;
    this.paymentModal = null;
    this.paymentEntries = [];
    this.newPaymentMethod = null;
    this.newPaymentAmount = 0;
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.newPaymentMethod = method;
    this.newPaymentAmount = this.paymentRemaining;
  }

  addPaymentEntry(): void {
    if (!this.newPaymentMethod || this.newPaymentAmount <= 0) return;

    if (this.newPaymentMethod !== 'dinheiro' && this.newPaymentAmount > this.paymentRemaining) {
      this.notify.warning(
        `${this.methodLabel(this.newPaymentMethod)} não pode exceder o valor restante`,
      );
      return;
    }

    this.paymentEntries.push({
      method: this.newPaymentMethod,
      amount: this.newPaymentAmount,
      change: this.paymentPreviewChange,
    });

    this.newPaymentMethod = null;
    this.newPaymentAmount = 0;
  }

  removePaymentEntry(index: number): void {
    this.paymentEntries.splice(index, 1);
  }

  confirmPayment(): void {
    if (!this.paymentModal || !this.paymentValid || this.actionLoading()) return;

    const apt = this.paymentModal;
    this.actionLoading.set(true);

    this.service.createPayment(apt.id, this.paymentEntries).subscribe({
      next: (response) => {
        this.receiptData = response; // abre o recibo
        this.updateAppointmentStatus(apt.id, 'paid');
        this.notify.success('Pagamento registrado com sucesso');
        this.actionLoading.set(false);
        this.closePaymentModal();
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao registrar pagamento'));
        this.actionLoading.set(false);
      },
    });
  }

  // ── Appointment actions ───────────────────────────────────────

  confirmAppointment(apt: Appointment): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);

    this.service.updateStatus(apt.id, 'confirmed').subscribe({
      next: () => {
        this.updateAppointmentStatus(apt.id, 'confirmed');
        this.notify.success('Agendamento confirmado');
        this.actionLoading.set(false);
      },
      error: (err) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao confirmar'));
        this.actionLoading.set(false);
      },
    });
  }

  finishAppointment(apt: Appointment): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);

    this.service.updateStatus(apt.id, 'finished').subscribe({
      next: () => {
        this.updateAppointmentStatus(apt.id, 'finished');
        this.notify.success('Consulta finalizada');
        this.actionLoading.set(false);
      },
      error: (err) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao finalizar'));
        this.actionLoading.set(false);
      },
    });
  }

  cancelAppointment(apt: Appointment): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);

    this.service.updateStatus(apt.id, 'cancelled', this.cancelReasonText).subscribe({
      next: () => {
        this.updateAppointmentStatus(apt.id, 'cancelled');
        this.notify.success('Agendamento cancelado');
        this.dismissInline();
        this.actionLoading.set(false);
      },
      error: (err) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao cancelar'));
        this.actionLoading.set(false);
      },
    });
  }

  rescheduleAppointment(apt: Appointment): void {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);

    this.service.updateStatus(apt.id, 'rescheduled', this.rescheduleReasonText).subscribe({
      next: () => {
        this.updateAppointmentStatus(apt.id, 'rescheduled');
        this.notify.success('Agendamento remarcado');
        this.dismissInline();
        this.actionLoading.set(false);
        this.pendingReschedulePatientId = apt.patientId;
        this.closeModal();
        this.showCreateModal = true;
      },
      error: (err) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao remarcar'));
        this.actionLoading.set(false);
      },
    });
  }

  // ── CSS helpers ───────────────────────────────────────────────

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
      checkin: 'bg-(--color-warning)',
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
      checkin: 'bg-warning-subtle text-warning',
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
      checkin: 'Check-in',
      paid: 'Pago',
      finished: 'Finalizado',
      cancelled: 'Cancelado',
      blocked: 'Bloqueado',
      external: 'Externo',
      rescheduled: 'Remarcado',
    };
    return map[status] ?? status;
  }

  doctorNameFor(doctorId: number): string {
    return this.doctorMap.get(doctorId) ?? String(doctorId);
  }

  methodLabel(method: PaymentMethod): string {
    return PAYMENT_METHODS.find((m) => m.method === method)?.label ?? method;
  }

  methodIcon(method: PaymentMethod): string {
    return PAYMENT_METHODS.find((m) => m.method === method)?.icon ?? '';
  }

  // ── Private ───────────────────────────────────────────────────

  private loadDoctors(): void {
    this.service.getDoctors().subscribe({
      next: (doctors) => {
        this.doctors = doctors;
        doctors.forEach((d) => this.doctorMap.set(d.id, d.name));
      },
      error: (err: HttpErrorResponse) =>
        this.notify.error(this.getErrorMessage(err, 'Erro ao carregar médicos')),
    });
  }

  private loadMonthData(): void {
    const month = this.currentMonthParam;
    this.pageLoading.set(true);

    this.service.getAppointments(month).subscribe({
      next: (appointments) => {
        this.allAppointments.set(appointments);
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao carregar agendamentos'));
        this.pageLoading.set(false);
      },
    });

    this.service.getAutoConfirmation(month).subscribe({
      next: (data) => (this.autoConfirmation = data),
      error: (err) => this.notify.error(this.getErrorMessage(err, 'Erro ao carregar confirmações')),
    });
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
      error: (err: HttpErrorResponse) =>
        this.notify.error(this.getErrorMessage(err, 'Erro ao carregar bloqueios')),
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
    const msg = err?.error?.message;
    return msg ? (Array.isArray(msg) ? msg.join(', ') : msg) : defaultMsg;
  }
}
