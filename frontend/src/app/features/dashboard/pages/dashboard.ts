import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../services/dashboard.service';
import { NotificationService } from '../../../shared/toastr/notification.service';
import {
  Appointment,
  AppointmentChartData,
  ChatbotStats,
  NextPatient,
  Role,
  StatCard,
} from '../types/dashboard.types';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  providers: [DashboardService],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private notify = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

  role: Role = 'admin';
  currentUserId = 0;
  currentUserName = '';

  pageLoading = signal(false);

  allStats: StatCard[] = [];
  allAppointments: Appointment[] = [];
  nextPatient: NextPatient | null = null;
  chartMonths: string[] = [];
  chartData: AppointmentChartData = {
    agendados: [],
    concluidos: [],
    cancelados: [],
    reagendados: [],
  };
  chatbotStats: ChatbotStats = { percent: 0, botInteractions: 0, humanInteractions: 0 };

  ngOnInit(): void {
    const payload = this.authService.getTokenPayload();
    if (payload) {
      this.role = payload.role as Role;
      this.currentUserId = payload.doctorId ?? 0;
      this.currentUserName = payload.username ?? '';
    }
    this.loadData();
  }

  // DEV only — remover antes de produção
  setRole(role: Role): void {
    this.role = role;
    this.currentUserId = role === 'medico' ? 1 : 0;
    this.currentUserName = role === 'medico' ? 'Dra. Sarah Vane' : 'Mariana Costa';
    this.loadData();
  }

  private loadData(): void {
    this.pageLoading.set(true);
    const year = new Date().getFullYear();

    const requests: any = {
      stats: this.dashboardService.getStats(),
      appointments: this.dashboardService.getAppointmentsToday(
        this.role === 'medico' ? this.currentUserId : undefined,
      ),
      chart: this.dashboardService.getAppointmentsChart(year),
    };

    if (this.role === 'medico' && this.currentUserId) {
      requests.nextPatient = this.dashboardService.getNextPatient(this.currentUserId);
    }

    if (this.role === 'admin' || this.role === 'atendimento') {
      requests.chatbot = this.dashboardService.getChatbotStats();
    }

    forkJoin(requests).subscribe({
      next: (data: any) => {
        this.allStats = this.dashboardService.buildStatCards(data.stats);
        this.allAppointments = data.appointments;
        this.chartMonths = data.chart.months;
        this.chartData = data.chart.data;
        this.nextPatient = data.nextPatient ?? null;
        this.chatbotStats = data.chatbot ?? this.chatbotStats;
        this.pageLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao carregar dashboard'));
        this.pageLoading.set(false);
      },
    });
  }

  get stats(): StatCard[] {
    return this.allStats.filter((s) => s.roles.includes(this.role));
  }

  get appointments(): Appointment[] {
    return this.allAppointments;
    // filtro por doctorId já aplicado no request quando role === 'medico'
  }

  get showGrowthChart(): boolean {
    return this.role === 'admin';
  }

  get showChatbot(): boolean {
    return this.role === 'admin' || this.role === 'atendimento';
  }

  get showNextPatient(): boolean {
    return this.role === 'medico';
  }

  maxChart(): number {
    const all = [
      ...this.chartData.agendados,
      ...this.chartData.concluidos,
      ...this.chartData.cancelados,
      ...this.chartData.reagendados,
    ];
    return Math.max(...all, 1);
  }

  barHeight(value: number): number {
    return (value / this.maxChart()) * 100;
  }

  private getErrorMessage(err: HttpErrorResponse, defaultMsg: string): string {
    const msg = err?.error?.message;
    return msg ? (Array.isArray(msg) ? msg.join(', ') : msg) : defaultMsg;
  }
}
