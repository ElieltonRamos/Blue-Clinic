import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../core/services/environment';
import {
  AppointmentType,
  CreateAppointmentTypeRequest,
  UpdateAppointmentTypeRequest,
} from '../types/appointment-type.types';

@Injectable({ providedIn: 'root' })
export class AppointmentTypeService {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getAll(): Observable<AppointmentType[]> {
    return this.http.get<AppointmentType[]>(`${this.apiUrl}/appointment-types`);
  }

  create(dto: CreateAppointmentTypeRequest): Observable<AppointmentType> {
    return this.http.post<AppointmentType>(`${this.apiUrl}/appointment-types`, dto);
  }

  update(id: number, dto: UpdateAppointmentTypeRequest): Observable<AppointmentType> {
    return this.http.put<AppointmentType>(`${this.apiUrl}/appointment-types/${id}`, dto);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/appointment-types/${id}`);
  }
}
