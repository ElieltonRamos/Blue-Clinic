import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../core/services/environment';
import {
  AppointmentTypeSummary,
  CreateCommissionRequest,
  CreateScheduleRequest,
  DoctorCommission,
  DoctorProfile,
  DoctorSchedule,
  DoctorSummary,
  UpdateCommissionRequest,
  UpdateScheduleRequest,
} from '../types/schedule.types';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  // ── Doctors ───────────────────────────────────────────────────────────────

  getMe(): Observable<DoctorProfile> {
    return this.http.get<DoctorProfile>(`${this.apiUrl}/doctors/me`);
  }

  getDoctors(): Observable<DoctorSummary[]> {
    return this.http.get<DoctorSummary[]>(`${this.apiUrl}/doctors`);
  }

  getDoctor(id: number): Observable<DoctorProfile> {
    return this.http.get<DoctorProfile>(`${this.apiUrl}/doctors/${id}`);
  }

  // ── Schedules ─────────────────────────────────────────────────────────────

  createSchedule(doctorId: number, dto: CreateScheduleRequest): Observable<DoctorSchedule> {
    return this.http.post<DoctorSchedule>(`${this.apiUrl}/doctors/${doctorId}/schedules`, dto);
  }

  updateSchedule(
    doctorId: number,
    scheduleId: number,
    dto: UpdateScheduleRequest,
  ): Observable<DoctorSchedule> {
    return this.http.put<DoctorSchedule>(
      `${this.apiUrl}/doctors/${doctorId}/schedules/${scheduleId}`,
      dto,
    );
  }

  removeSchedule(doctorId: number, scheduleId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/doctors/${doctorId}/schedules/${scheduleId}`,
    );
  }

  // ── Appointment Types ─────────────────────────────────────────────────────

  getAppointmentTypes(): Observable<AppointmentTypeSummary[]> {
    return this.http.get<AppointmentTypeSummary[]>(`${this.apiUrl}/appointment-types`);
  }

  // ── Commissions ───────────────────────────────────────────────────────────

  createCommission(doctorId: number, dto: CreateCommissionRequest): Observable<DoctorCommission> {
    return this.http.post<DoctorCommission>(`${this.apiUrl}/doctors/${doctorId}/commissions`, dto);
  }

  updateCommission(
    doctorId: number,
    commissionId: number,
    dto: UpdateCommissionRequest,
  ): Observable<DoctorCommission> {
    return this.http.put<DoctorCommission>(
      `${this.apiUrl}/doctors/${doctorId}/commissions/${commissionId}`,
      dto,
    );
  }

  removeCommission(doctorId: number, commissionId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/doctors/${doctorId}/commissions/${commissionId}`,
    );
  }
}
