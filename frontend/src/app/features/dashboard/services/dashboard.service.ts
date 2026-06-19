import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  AppointmentChartData,
  Appointment,
  ChatbotStats,
  NextPatient,
  StatCard,
} from '../types/dashboard.types';
import { environment } from '../../../core/services/environment';

export interface DashboardStatsResponse {
  totalConsultasHoje: number;
  totalConsultasHojeTrend: number;
  receitaMensal: number;
  receitaMensalTrend: number;
  taxaFaltas: number;
  taxaFaltasTrend: number;
  chatsAtivos: number;
}

export interface AppointmentResponse {
  id: number;
  patient: { name: string };
  appointmentType: { name: string } | null;
  startTime: string;
  status: string;
  doctor: { id: number; name: string };
}

export interface NextPatientResponse {
  patient: { name: string };
  appointmentType: { name: string } | null;
  startTime: string;
}

@Injectable()
export class DashboardService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/dashboard`;

  getStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(`${this.base}/stats`);
  }

  getAppointmentsToday(doctorId?: number): Observable<Appointment[]> {
    const params: any = {};
    if (doctorId) params.doctorId = doctorId;
    return this.http
      .get<AppointmentResponse[]>(`${this.base}/appointments-today`, { params })
      .pipe(map((list) => list.map(this.mapAppointment)));
  }

  getNextPatient(doctorId: number): Observable<NextPatient | null> {
    return this.http.get<NextPatientResponse | null>(`${this.base}/next-patient/${doctorId}`).pipe(
      map((res) =>
        res
          ? {
              name: res.patient.name,
              type: res.appointmentType?.name ?? '—',
              time: res.startTime,
              initials: this.initials(res.patient.name),
              color: this.avatarColor(res.patient.name),
            }
          : null,
      ),
    );
  }

  getAppointmentsChart(year: number): Observable<{ months: string[]; data: AppointmentChartData }> {
    return this.http.get<{ months: string[]; data: AppointmentChartData }>(
      `${this.base}/appointments-chart`,
      { params: { year } },
    );
  }

  getChatbotStats(): Observable<ChatbotStats> {
    return this.http.get<ChatbotStats>(`${this.base}/chatbot-stats`);
  }

  buildStatCards(stats: DashboardStatsResponse): StatCard[] {
    return [
      {
        label: 'Total de Consultas',
        value: String(stats.totalConsultasHoje),
        trend: stats.totalConsultasHojeTrend,
        icon: 'calendar',
        roles: ['admin', 'medico', 'atendimento'],
      },
      {
        label: 'Receita Mensal',
        value: stats.receitaMensal.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }),
        trend: stats.receitaMensalTrend,
        icon: 'dollar',
        roles: ['admin'],
      },
      {
        label: 'Taxa de Faltas',
        value: `${stats.taxaFaltas.toFixed(1)}%`,
        trend: stats.taxaFaltasTrend,
        icon: 'x',
        roles: ['admin', 'medico'],
      },
      {
        label: 'Chats de WhatsApp Ativos',
        value: String(stats.chatsAtivos),
        trend: 0,
        icon: 'chat',
        highlight: true,
        toggle: true,
        roles: ['admin', 'atendimento'],
      },
    ];
  }

  private mapAppointment(a: AppointmentResponse): Appointment {
    const statusMap: Record<
      string,
      'Confirmado' | 'Pendente' | 'Cancelado' | 'Concluído' | 'Reagendado' | 'Bloqueado'
    > = {
      confirmed: 'Confirmado',
      checkin: 'Confirmado',
      pending: 'Pendente',
      cancelled: 'Cancelado',
      finished: 'Concluído',
      paid: 'Concluído',
      rescheduled: 'Reagendado',
      blocked: 'Bloqueado',
      external: 'Bloqueado',
    };
    return {
      initials: DashboardService.initialsStatic(a.patient.name),
      color: DashboardService.avatarColorStatic(a.patient.name),
      patient: a.patient.name,
      type: a.appointmentType?.name ?? '—',
      time: a.startTime,
      doctorAvatar: DashboardService.initialsStatic(a.doctor.name),
      doctor: a.doctor.name,
      doctorId: String(a.doctor.id),
      status: statusMap[a.status] ?? 'Pendente',
    };
  }

  private initials(name: string): string {
    return DashboardService.initialsStatic(name);
  }

  private avatarColor(name: string): string {
    return DashboardService.avatarColorStatic(name);
  }

  static initialsStatic(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');
  }

  static avatarColorStatic(name: string): string {
    const colors = ['#4f8ef7', '#a78bfa', '#34d399', '#f59e0b', '#f87171', '#60a5fa'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }
}
