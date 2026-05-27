// reports.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChartBar, DoctorRow, OriginChannel, ReportStat, Specialty } from '../types/reports.types';
import { environment } from '../../../core/services/environment';

export interface ReportsFilter {
  dateFrom: string;
  dateTo: string;
}

export interface ReportsSummary {
  stats: ReportStat[];
  chartBars: ChartBar[];
  originChannels: OriginChannel[];
  originTotal: number;
  specialties: Specialty[];
}

@Injectable()
export class ReportsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/reports`;

  private params(filter: ReportsFilter): HttpParams {
    return new HttpParams().set('dateFrom', filter.dateFrom).set('dateTo', filter.dateTo);
  }

  getSummary(filter: ReportsFilter): Observable<ReportsSummary> {
    return this.http.get<ReportsSummary>(`${this.base}/summary`, {
      params: this.params(filter),
    });
  }

  getDoctors(filter: ReportsFilter): Observable<DoctorRow[]> {
    return this.http.get<DoctorRow[]>(`${this.base}/doctors`, {
      params: this.params(filter),
    });
  }
}
