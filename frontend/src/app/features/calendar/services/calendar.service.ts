import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../core/services/environment';
import {
  Appointment,
  AutoConfirmation,
  BlockedSlot,
  CreatePaymentRequest,
  Doctor,
  PaymentMethodEntry,
} from '../types/calendar.types';

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getDoctors() {
    return this.http.get<Doctor[]>(`${this.apiUrl}/doctors`);
  }

  getAppointments(month: string, doctorId?: number) {
    const params: Record<string, string> = { month };
    if (doctorId) params['doctorId'] = String(doctorId);
    return this.http.get<Appointment[]>(`${this.apiUrl}/appointments`, { params });
  }

  getBlockedSlots(doctorId?: number) {
    const params: Record<string, string> = {};
    if (doctorId) params['doctorId'] = String(doctorId);
    return this.http.get<BlockedSlot[]>(`${this.apiUrl}/appointments/blocked-slots`, {
      params,
    });
  }

  getAutoConfirmation(month: string) {
    return this.http.get<AutoConfirmation>(`${this.apiUrl}/appointments/auto-confirmation`, {
      params: { month },
    });
  }

  createPayment(appointmentId: number, entries: PaymentMethodEntry[]) {
    const body: CreatePaymentRequest = {
      entries: entries.map((e) => ({
        method: e.method,
        amount: e.value,
      })),
    };
    return this.http.post<PaymentResponse>(
      `${this.apiUrl}/appointments/${appointmentId}/payments`,
      body,
    );
  }
}
