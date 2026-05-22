// patients.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../core/services/environment';
import {
  Patient,
  PatientDetail,
  PatientFilters,
  PatientListResponse,
  CreatePatientRequest,
  UpdatePatientRequest,
} from '../types/patients.types';

@Injectable({
  providedIn: 'root',
})
export class PatientsService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getPatients(filters?: PatientFilters) {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.skip != null) params = params.set('skip', String(filters.skip));
    if (filters?.take != null) params = params.set('take', String(filters.take));
    return this.http.get<PatientListResponse>(`${this.apiUrl}/patients`, { params });
  }

  getPatientDetail(id: number) {
    return this.http.get<PatientDetail>(`${this.apiUrl}/patients/${id}`);
  }

  createPatient(dto: CreatePatientRequest) {
    return this.http.post<PatientDetail>(`${this.apiUrl}/patients`, dto);
  }

  updatePatient(id: number, dto: UpdatePatientRequest) {
    return this.http.patch<PatientDetail>(`${this.apiUrl}/patients/${id}`, dto);
  }
}
