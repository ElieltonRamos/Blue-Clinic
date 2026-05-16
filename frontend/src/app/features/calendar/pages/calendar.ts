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
export class Calendar implements OnInit {
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
      return 'border-[#434652]/10 opacity-30 cursor-default';
    }
    if (day.isToday) {
      return 'border-[#b0c6ff]/40 bg-[#0d47a1]/20 cursor-pointer hover:border-[#b0c6ff]/60';
    }
    return 'border-[#434652]/20 bg-[#151b2d] cursor-pointer hover:border-[#434652]/50';
  }

  statusDotClass(status: AppointmentStatus): string {
    const map: Record<AppointmentStatus, string> = {
      confirmed: 'bg-[#b0c6ff]',
      pending: 'bg-[#44d8f1]',
      checkin: 'bg-[#66d9cc]',
      blocked: 'bg-[#ffb4ab]',
      external: 'bg-[#8d9199]',
    };
    return map[status] ?? 'bg-[#8d9199]';
  }

  statusBadgeClass(status: AppointmentStatus): string {
    const map: Record<AppointmentStatus, string> = {
      confirmed: 'bg-[#0d47a1]/40 text-[#b0c6ff]',
      pending: 'bg-[#004e59]/40 text-[#44d8f1]',
      checkin: 'bg-[#005049]/40 text-[#66d9cc]',
      blocked: 'bg-[#93000a]/40 text-[#ffb4ab]',
      external: 'bg-[#434652]/40 text-[#c3c6d4]',
    };
    return map[status] ?? 'bg-[#434652]/40 text-[#c3c6d4]';
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
    // Filtrar por date quando o campo existir no tipo
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
