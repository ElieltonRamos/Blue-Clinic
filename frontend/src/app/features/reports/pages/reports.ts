// reports.component.ts

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ReportsService, ReportsFilter } from '../services/reports.service';
import { NotificationService } from '../../../shared/toastr/notification.service';
import { ChartBar, DoctorRow, OriginChannel, ReportStat, Specialty } from '../types/reports.types';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [ReportsService],
  templateUrl: './reports.html',
})
export class Reports implements OnInit {
  private service = inject(ReportsService);
  private notify = inject(NotificationService);

  stats: ReportStat[] = [];
  chartBars: ChartBar[] = [];
  originChannels: OriginChannel[] = [];
  specialties: Specialty[] = [];
  allDoctors: DoctorRow[] = [];
  doctorFilter = '';

  dateFrom = '';
  dateTo = '';
  activeRange: 'hoje' | 'semana' | 'mes' = 'mes';
  pageLoading = signal(false);
  originTotal = 0;

  ngOnInit(): void {
    this.setRange('mes');
  }

  private get filter(): ReportsFilter {
    return { dateFrom: this.dateFrom, dateTo: this.dateTo };
  }

  private loadAll(): void {
    if (!this.dateFrom || !this.dateTo) return;
    this.pageLoading.set(true);

    forkJoin({
      summary: this.service.getSummary(this.filter),
      doctors: this.service.getDoctors(this.filter),
    }).subscribe({
      next: (data) => {
        this.stats = data.summary.stats;
        this.chartBars = data.summary.chartBars;
        this.originChannels = data.summary.originChannels;
        this.specialties = data.summary.specialties;
        this.allDoctors = data.doctors;
        this.originTotal = data.summary.originTotal;
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.notify.error(this.getErrorMessage(err, 'Erro ao carregar relatórios'));
        this.pageLoading.set(false);
      },
    });
  }

  setRange(range: 'hoje' | 'semana' | 'mes'): void {
    this.activeRange = range;
    const today = new Date();
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (range === 'hoje') {
      this.dateFrom = fmt(today);
      this.dateTo = fmt(today);
    } else if (range === 'semana') {
      const day = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((day + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      this.dateFrom = fmt(monday);
      this.dateTo = fmt(sunday);
    } else {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      this.dateFrom = fmt(first);
      this.dateTo = fmt(last);
    }

    this.loadAll();
  }

  onDateChange(): void {
    this.activeRange = 'hoje';
    this.loadAll();
  }

  get doctors(): DoctorRow[] {
    const q = this.doctorFilter.toLowerCase();
    return q
      ? this.allDoctors.filter(
          (d) => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q),
        )
      : this.allDoctors;
  }

  get maxBar(): number {
    return Math.max(...this.chartBars.map((b) => b.realized), 1);
  }

  barH(v: number): number {
    return (v / this.maxBar) * 100;
  }

  donutDash(percent: number): string {
    const c = 238.76;
    return `${(percent / 100) * c} ${c}`;
  }

  donutOffset(index: number): number {
    const c = 238.76;
    const prior = this.originChannels.slice(0, index).reduce((s, ch) => s + ch.percent, 0);
    return -(prior / 100) * c;
  }

  accentClass(accent: ReportStat['accent']): string {
    return {
      primary: 'bg-(--color-primary)',
      success: 'bg-success',
      danger: 'bg-(--color-danger)',
      info: 'bg-(--color-info)',
    }[accent];
  }

  trendPositive(trend: number, accent: ReportStat['accent']): boolean {
    return accent === 'danger' ? trend < 0 : trend > 0;
  }

  private getErrorMessage(err: HttpErrorResponse, defaultMsg: string): string {
    const msg = err?.error?.message;
    return msg ? (Array.isArray(msg) ? msg.join(', ') : msg) : defaultMsg;
  }
}
