import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Appointment,
  AppointmentStatus,
  AutoConfirmation,
  BlockedHour,
  PaymentMethodEntry,
  PaymentRecord,
} from '../types/calendar.types';
import { CalendarService } from '../services/calendar.service';
import { PaymentMethod } from '../../financial/types/financial.types';

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  currentMonth: boolean;
  isToday: boolean;
  label: string;
  appointments: Appointment[];
}

export interface ContextMenu {
  appointment: Appointment;
  x: number;
  y: number;
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
  imports: [CommonModule, FormsModule],
  providers: [CalendarService],
  templateUrl: './calendar.html',
})
export class Calendar implements OnInit {
  private readonly service = inject(CalendarService);

  readonly weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  readonly availablePaymentMethods = PAYMENT_METHODS;

  private currentDate = signal(new Date());
  private allAppointments: Appointment[] = [];
  private doctorMap = new Map<string, string>();

  blockedHours: BlockedHour[] = [];
  autoConfirmation!: AutoConfirmation;
  selectedDay: CalendarDay | null = null;
  paymentRecords: PaymentRecord[] = [];

  // menu de contexto
  contextMenu: ContextMenu | null = null;

  // modal de pagamento
  paymentModal: Appointment | null = null;
  paymentEntries: { method: PaymentMethod; value: number; enabled: boolean }[] = [];

  get monthLabel(): string {
    const d = this.currentDate();
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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
    this.service.getDoctors().forEach((d) => this.doctorMap.set(d.id, d.name));
    this.allAppointments = this.service.getAppointments();
    this.blockedHours = this.service.getBlockedHours();
    this.autoConfirmation = this.service.getAutoConfirmation();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.contextMenu = null;
  }

  prevMonth(): void {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  openModal(day: CalendarDay): void {
    this.selectedDay = day;
  }

  closeModal(): void {
    this.selectedDay = null;
  }

  createAppointment(): void {
    // TODO
  }

  // ── Context menu ──────────────────────────────────────────────

  openContextMenu(event: MouseEvent, apt: Appointment): void {
    event.preventDefault();
    event.stopPropagation();
    if (apt.status !== 'checkin') return;
    this.contextMenu = { appointment: apt, x: event.clientX, y: event.clientY };
  }

  closeContextMenu(): void {
    this.contextMenu = null;
  }

  // ── Payment modal ─────────────────────────────────────────────

  openPaymentModal(apt: Appointment): void {
    this.contextMenu = null;
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
    const methods: PaymentMethodEntry[] = this.paymentEntries
      .filter((e) => e.enabled && e.value > 0)
      .map((e) => ({ method: e.method, value: e.value }));

    const doctorName = this.doctorMap.get(apt.doctorId) ?? apt.doctorId;
    const record = this.service.createPayment(apt, doctorName, methods);
    this.paymentRecords.push(record);

    // atualiza status do agendamento para 'paid'
    const idx = this.allAppointments.findIndex((a) => a.id === apt.id);
    if (idx !== -1) {
      this.allAppointments = [
        ...this.allAppointments.slice(0, idx),
        { ...this.allAppointments[idx], status: 'paid' as AppointmentStatus },
        ...this.allAppointments.slice(idx + 1),
      ];
    }

    // atualiza o dia selecionado no modal do calendário, se aberto
    if (this.selectedDay) {
      this.selectedDay = {
        ...this.selectedDay,
        appointments: this.selectedDay.appointments.map((a) =>
          a.id === apt.id ? { ...a, status: 'paid' as AppointmentStatus } : a,
        ),
      };
    }

    this.closePaymentModal();
  }

  doctorNameFor(doctorId: string): string {
    return this.doctorMap.get(doctorId) ?? doctorId;
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
      confirmed: 'bg-(--color-primary-text)',
      pending: 'bg-(--color-info)',
      checkin: 'bg-(--color-success)',
      blocked: 'bg-(--color-danger)',
      external: 'bg-(--color-dot-neutral)',
      paid: 'bg-(--color-warning)',
    };
    return map[status] ?? 'bg-(--color-dot-neutral)';
  }

  statusBadgeClass(status: AppointmentStatus): string {
    const map: Record<AppointmentStatus, string> = {
      confirmed: 'bg-(--color-primary-subtle) text-(--color-primary-text)',
      pending: 'bg-(--color-info-subtle) text-(--color-info)',
      checkin: 'bg-(--color-success-subtle) text-(--color-success)',
      blocked: 'bg-(--color-danger-subtle) text-(--color-danger)',
      external: 'bg-(--color-bg-hover-md) text-(--color-text-secondary)',
      paid: 'bg-(--color-warning-subtle) text-(--color-warning)',
    };
    return map[status] ?? 'bg-(--color-bg-hover-md) text-(--color-text-secondary)';
  }

  statusLabel(status: AppointmentStatus): string {
    const map: Record<AppointmentStatus, string> = {
      confirmed: 'Confirmado',
      pending: 'Pendente',
      checkin: 'Check-in',
      blocked: 'Bloqueado',
      external: 'Externo',
      paid: 'Pago',
    };
    return map[status] ?? status;
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

  private appointmentsForDate(_date: Date): Appointment[] {
    return this.allAppointments;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
