import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../core/services/environment';
import {
  AppointmentType,
  AppointmentResponse,
  CreateAppointmentRequest,
  DoctorSummary,
  PatientSummary,
  Slot,
} from '../types/create-appointment.types';

@Injectable({ providedIn: 'root' })
export class CreateAppointmentService {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getDoctors(search?: string): Observable<DoctorSummary[]> {
    let params = new HttpParams();
    if (search) params = params.set('name', search);
    return this.http.get<DoctorSummary[]>(`${this.apiUrl}/doctors`, { params });
  }

  getAppointmentTypes(): Observable<AppointmentType[]> {
    return this.http.get<AppointmentType[]>(`${this.apiUrl}/appointment-types`);
  }

  getSlots(doctorId: number, date: string, appointmentTypeId: number): Observable<Slot[]> {
    const params = new HttpParams()
      .set('doctorId', String(doctorId))
      .set('date', date)
      .set('appointmentTypeId', String(appointmentTypeId));
    return this.http.get<Slot[]>(`${this.apiUrl}/appointments/slots`, { params });
  }

  searchPatients(search: string): Observable<{ data: PatientSummary[]; total: number }> {
    const params = new HttpParams().set('search', search).set('take', '10');
    return this.http.get<{ data: PatientSummary[]; total: number }>(`${this.apiUrl}/patients`, {
      params,
    });
  }

  createAppointment(dto: CreateAppointmentRequest): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(`${this.apiUrl}/appointments`, dto);
  }

  getPatientById(id: number) {
    return this.http.get<PatientSummary>(`${this.apiUrl}/patients/${id}`);
  }
}
