import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../services/reports.service';
import { ChartBar, DoctorRow, OriginChannel, ReportStat, Specialty } from '../types/reports.types';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [ReportsService],
  templateUrl: './reports.html',
})
export class Reports implements OnInit {
  private reportsService = inject(ReportsService);

  stats: ReportStat[] = [];
  chartBars: ChartBar[] = [];
  originChannels: OriginChannel[] = [];
  specialties: Specialty[] = [];
  allDoctors: DoctorRow[] = [];
  doctorFilter = '';

  ngOnInit(): void {
    this.stats = this.reportsService.getStats();
    this.chartBars = this.reportsService.getChartBars();
    this.originChannels = this.reportsService.getOriginChannels();
    this.specialties = this.reportsService.getSpecialties();
    this.allDoctors = this.reportsService.getDoctors();
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
    return Math.max(...this.chartBars.map((b) => Math.max(b.realized, b.goal)));
  }

  barH(v: number): number {
    return (v / this.maxBar) * 100;
  }

  /** Circumference of donut r=38 → 2π×38 ≈ 238.76 */
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
    // No-show: trend negativo é bom
    return accent === 'danger' ? trend < 0 : trend > 0;
  }
}
