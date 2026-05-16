import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Appointment,
  AppointmentStatus,
  AutoConfirmation,
  BlockedHour,
} from '../types/calendar.types';
import { CalendarService } from '../services/calendar.service';

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  currentMonth: boolean;
  isToday: boolean;
  label: string;
  appointments: Appointment[];
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule],
  providers: [CalendarService],
  templateUrl: './calendar.html',
})
export class Calendar {
  private readonly service = inject(CalendarService);

  readonly weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  private currentDate = signal(new Date());
  private allAppointments: Appointment[] = [];
  private doctorMap = new Map<string, string>();

  blockedHours: BlockedHour[] = [];
  autoConfirmation!: AutoConfirmation;
  selectedDay: CalendarDay | null = null;

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

  doctorNameFor(doctorId: string): string {
    return this.doctorMap.get(doctorId) ?? doctorId;
  }

  dayCellClass(day: CalendarDay): string {
    if (!day.currentMonth) {
      return 'border-(--color-border) opacity-30 cursor-default';
    }
    if (day.isToday) {
      return 'border-(--color-primary)/40 bg-(--color-primary-subtle) cursor-pointer hover:border-(--color-primary)/60';
    }
    return 'border-(--color-border) bg-(--color-bg-card) cursor-pointer hover:border-(--color-border-md) hover:bg-(--color-bg-overlay)';
  }

  statusDotClass(status: AppointmentStatus): string {
    const map: Record<AppointmentStatus, string> = {
      confirmed: 'bg-(--color-primary-text)',
      pending: 'bg-(--color-info)',
      checkin: 'bg-(--color-success)',
      blocked: 'bg-(--color-danger)',
      external: 'bg-(--color-dot-neutral)',
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
