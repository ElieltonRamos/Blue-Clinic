import { Injectable } from '@angular/core';
import {
  Appointment,
  ChatbotStats,
  ChartData,
  NextPatient,
  StatCard,
} from '../types/dashboard.types';

@Injectable()
export class DashboardService {
  getStats(): StatCard[] {
    return [
      {
        label: 'Total de Consultas',
        value: '1.284',
        trend: 12,
        icon: 'calendar',
        roles: ['admin', 'medico', 'balconista'],
      },
      {
        label: 'Receita Mensal',
        value: 'R$ 42.390',
        trend: 8,
        icon: 'dollar',
        roles: ['admin'],
      },
      {
        label: 'Taxa de Faltas',
        value: '2.4%',
        trend: -4,
        icon: 'x',
        roles: ['admin', 'medico'],
      },
      {
        label: 'Chats de WhatsApp Ativos',
        value: '48',
        trend: 0,
        icon: 'chat',
        highlight: true,
        toggle: true,
        roles: ['admin', 'balconista'],
      },
    ];
  }

  getAppointments(): Appointment[] {
    return [
      {
        initials: 'EK',
        color: '#4f8ef7',
        patient: 'Eleanor Kade',
        type: 'Check-up de Retina',
        time: '09:00',
        doctorAvatar: 'SV',
        doctor: 'Dra. Sarah Vane',
        doctorId: 'sarah-vane',
        status: 'Confirmado',
      },
      {
        initials: 'ML',
        color: '#a78bfa',
        patient: 'Marcus Lowery',
        type: 'Retorno Cardiologia',
        time: '10:30',
        doctorAvatar: 'JS',
        doctor: 'Dr. Julian Smith',
        doctorId: 'julian-smith',
        status: 'Pendente',
      },
      {
        initials: 'RB',
        color: '#34d399',
        patient: 'Riley Brooks',
        type: 'Consulta Pediátrica',
        time: '11:15',
        doctorAvatar: 'SV',
        doctor: 'Dra. Sarah Vane',
        doctorId: 'sarah-vane',
        status: 'Confirmado',
      },
      {
        initials: 'AT',
        color: '#f59e0b',
        patient: 'Ana Torres',
        type: 'Dermatologia',
        time: '13:00',
        doctorAvatar: 'JS',
        doctor: 'Dr. Julian Smith',
        doctorId: 'julian-smith',
        status: 'Pendente',
      },
    ];
  }

  getNextPatient(): NextPatient {
    return {
      name: 'Eleanor Kade',
      type: 'Check-up de Retina',
      time: '09:00',
      initials: 'EK',
      color: '#4f8ef7',
    };
  }

  getChartMonths(): string[] {
    return ['MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO'];
  }

  getChartData(): ChartData {
    return {
      newPatients: [30, 45, 38, 55, 42, 65],
      completed: [50, 60, 55, 70, 65, 80],
    };
  }

  getChatbotStats(): ChatbotStats {
    return {
      percent: 75,
      botInteractions: 842,
      humanInteractions: 214,
    };
  }
}
