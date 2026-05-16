import { Injectable } from '@angular/core';
import {
  Appointment,
  AutoConfirmation,
  BlockedHour,
  BlockedSlot,
  Doctor,
} from '../types/calendar.types';

@Injectable()
export class CalendarService {
  getDoctors(): Doctor[] {
    return [
      { id: 'dr-smith', name: 'Dr. Smith', specialty: 'Cardiologia' },
      { id: 'dra-garcia', name: 'Dra. Garcia', specialty: 'Pediatria' },
    ];
  }

  getAppointments(): Appointment[] {
    return [
      {
        id: 'apt-1',
        doctorId: 'dr-smith',
        patientName: 'Arthur Morgan',
        specialty: 'Cardiologia',
        startTime: '08:00',
        endTime: '08:45',
        status: 'confirmed',
        startSlot: 10,
        height: 80,
      },
      {
        id: 'apt-2',
        doctorId: 'dr-smith',
        patientName: 'Sarah Jenkins',
        specialty: 'Geral',
        startTime: '09:00',
        endTime: '10:30',
        status: 'pending',
        startSlot: 106,
        height: 160,
      },
      {
        id: 'apt-3',
        doctorId: 'dra-garcia',
        patientName: 'Leo Messi (Jr)',
        specialty: 'Pediatria',
        startTime: '08:00',
        endTime: '09:00',
        status: 'checkin',
        responsible: 'Jorge Messi',
        startSlot: 20,
        height: 96,
      },
    ];
  }

  getBlockedSlots(): BlockedSlot[] {
    return [
      {
        doctorId: 'dr-smith',
        label: 'Intervalo Almoço',
        startSlot: 288,
        height: 192,
        type: 'break',
      },
      {
        doctorId: 'dra-garcia',
        label: 'Plantão Externo',
        startSlot: 192,
        height: 384,
        type: 'external',
      },
    ];
  }

  getBlockedHours(): BlockedHour[] {
    return [
      { label: 'Almoço', recurrence: 'Diário • 12:00 - 13:00', color: 'error' },
      { label: 'Treinamento Equipe', recurrence: 'Sexta • 15:00 - 17:00', color: 'primary' },
    ];
  }

  getTimeSlots(): string[] {
    return ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM'];
  }

  getAutoConfirmation(): AutoConfirmation {
    return { confirmed: 14, total: 20 };
  }
}
