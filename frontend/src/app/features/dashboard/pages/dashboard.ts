import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StatCard {
  label: string;
  value: string;
  trend: number;
  icon: string;
  highlight?: boolean;
  extra?: string;
  toggle?: boolean;
}

interface Appointment {
  initials: string;
  color: string;
  patient: string;
  type: string;
  time: string;
  doctorAvatar: string;
  doctor: string;
  status: 'Confirmado' | 'Pendente' | 'Cancelado';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  readonly stats: StatCard[] = [
    { label: 'Total de Consultas', value: '1.284', trend: 12, icon: 'calendar' },
    { label: 'Receita Mensal', value: 'R$ 42.390', trend: 8, icon: 'dollar' },
    { label: 'Taxa de Faltas', value: '2.4%', trend: -4, icon: 'x' },
    {
      label: 'Chats de WhatsApp Ativos',
      value: '48',
      trend: 0,
      icon: 'chat',
      highlight: true,
      toggle: true,
    },
  ];

  readonly chartMonths = ['MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO'];

  readonly chartData = {
    newPatients: [30, 45, 38, 55, 42, 65],
    completed: [50, 60, 55, 70, 65, 80],
  };

  readonly appointments: Appointment[] = [
    {
      initials: 'EK',
      color: '#4f8ef7',
      patient: 'Eleanor Kade',
      type: 'Check-up de Retina',
      time: '09:00',
      doctorAvatar: 'SV',
      doctor: 'Dra. Sarah Vane',
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
      status: 'Pendente',
    },
  ];

  readonly chatbotStats = {
    percent: 75,
    botInteractions: 842,
    humanInteractions: 214,
  };

  statusClass(status: string): string {
    return (
      {
        Confirmado: 'status-confirmed',
        Pendente: 'status-pending',
        Cancelado: 'status-cancelled',
      }[status] ?? ''
    );
  }

  maxChart(): number {
    return Math.max(...this.chartData.newPatients, ...this.chartData.completed);
  }

  barHeight(value: number): number {
    return (value / this.maxChart()) * 100;
  }
}
