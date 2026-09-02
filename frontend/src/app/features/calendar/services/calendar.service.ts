import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../core/services/environment';
import {
  Appointment,
  AppointmentStatus,
  AutoConfirmation,
  BlockedSlot,
  CreatePaymentRequest,
  Doctor,
  PaymentEntry,
  PaymentResponseDto,
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

  createPayment(appointmentId: number, entries: PaymentEntry[], discount: number) {
    const body: CreatePaymentRequest = {
      entries: entries.map(({ method, amount, change }) => ({ method, amount, change })),
      discount,
    };
    return this.http.post<PaymentResponseDto>(
      `${this.apiUrl}/appointments/${appointmentId}/payments`,
      body,
    );
  }

  getPaymentByAppointment(appointmentId: number) {
    return this.http.get<PaymentResponseDto>(
      `${this.apiUrl}/appointments/${appointmentId}/payment`,
    );
  }

  updateStatus(appointmentId: number, status: AppointmentStatus, cancellationReason?: string) {
    const body: Record<string, unknown> = { status };
    if (cancellationReason?.trim()) body['cancellationReason'] = cancellationReason.trim();

    return this.http.patch<Appointment>(
      `${this.apiUrl}/appointments/${appointmentId}/status`,
      body,
    );
  }

  getConversationByPatient(patientId: number) {
    return this.http.get<{ id: number }>(
      `${this.apiUrl}/chat/conversations/by-patient/${patientId}`,
    );
  }

  updatePayment(
    appointmentId: number,
    paymentId: number,
    entries: PaymentEntry[],
    discount: number,
  ) {
    const body: CreatePaymentRequest = {
      entries: entries.map(({ method, amount, change }) => ({ method, amount, change })),
      discount,
    };
    return this.http.put<PaymentResponseDto>(
      `${this.apiUrl}/appointments/${appointmentId}/payments/${paymentId}`,
      body,
    );
  }

  updateAppointment(
    appointmentId: number,
    data: { price?: number; notes?: string; responsible?: string },
  ) {
    const body: Record<string, unknown> = {};
    if (data.price !== undefined) body['feeOverride'] = data.price;
    if (data.notes !== undefined) body['notes'] = data.notes;
    if (data.responsible !== undefined) body['responsible'] = data.responsible;

    return this.http.patch<Appointment>(`${this.apiUrl}/appointments/${appointmentId}`, body);
  }

  reversePayment(appointmentId: number, paymentId: number) {
    return this.http.delete<void>(
      `${this.apiUrl}/appointments/${appointmentId}/payments/${paymentId}`,
    );
  }

  deleteAppointment(appointmentId: number) {
    return this.http.delete<void>(`${this.apiUrl}/appointments/${appointmentId}`);
  }
}
