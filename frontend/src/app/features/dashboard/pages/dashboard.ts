import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../services/dashboard.service';
import {
  Appointment,
  ChatbotStats,
  ChartData,
  NextPatient,
  Role,
  StatCard,
} from '../types/dashboard.types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  providers: [DashboardService],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  role: Role = 'admin';
  currentUserId = '';
  currentUserName = '';

  allStats: StatCard[] = [];
  allAppointments: Appointment[] = [];
  nextPatient!: NextPatient;
  chartMonths: string[] = [];
  chartData!: ChartData;
  chatbotStats!: ChatbotStats;

  ngOnInit(): void {
    this.loadData();
    // TODO: descomentar quando tiver API
    // const payload = this.authService.getTokenPayload();
    // if (payload) {
    //   this.role = payload.role ?? 'balconista';
    //   this.currentUserId = payload.id ?? '';
    //   this.currentUserName = payload.username ?? '';
    // }
    this.setRole('admin');
  }

  private loadData(): void {
    this.allStats = this.dashboardService.getStats();
    this.allAppointments = this.dashboardService.getAppointments();
    this.nextPatient = this.dashboardService.getNextPatient();
    this.chartMonths = this.dashboardService.getChartMonths();
    this.chartData = this.dashboardService.getChartData();
    this.chatbotStats = this.dashboardService.getChatbotStats();
  }

  setRole(role: Role): void {
    this.role = role;
    this.currentUserId = role === 'medico' ? 'sarah-vane' : '';
    this.currentUserName = role === 'medico' ? 'Dra. Sarah Vane' : 'Mariana Costa';
  }

  get stats(): StatCard[] {
    return this.allStats.filter((s) => s.roles.includes(this.role));
  }

  get appointments(): Appointment[] {
    if (this.role === 'medico') {
      return this.allAppointments.filter((a) => a.doctorId === this.currentUserId);
    }
    return this.allAppointments;
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
    return Math.max(...this.chartData.newPatients, ...this.chartData.completed);
  }

  barHeight(value: number): number {
    return (value / this.maxChart()) * 100;
  }
}
