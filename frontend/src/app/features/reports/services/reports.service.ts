import { Injectable } from '@angular/core';
import { ChartBar, DoctorRow, OriginChannel, ReportStat, Specialty } from '../types/reports.types';

@Injectable()
export class ReportsService {
  getStats(): ReportStat[] {
    return [
      { label: 'Total de Consultas', value: '1.284', trend: 12, accent: 'primary' },
      { label: 'Faturamento Total', value: 'R$ 42.390', trend: 8, accent: 'success' },
      { label: 'Taxa de No-Show', value: '2.4%', trend: -4, accent: 'danger' },
      { label: 'Conversão Chatbot', value: '75%', trend: 5, accent: 'info' },
    ];
  }

  getChartBars(): ChartBar[] {
    return [
      { month: 'JAN', realized: 55, goal: 70 },
      { month: 'FEV', realized: 68, goal: 70 },
      { month: 'MAR', realized: 60, goal: 72 },
      { month: 'ABR', realized: 78, goal: 75 },
      { month: 'MAI', realized: 82, goal: 78 },
      { month: 'JUN', realized: 92, goal: 80 },
    ];
  }

  getOriginChannels(): OriginChannel[] {
    return [
      { label: 'WhatsApp', percent: 60, color: 'var(--color-primary)' },
      { label: 'Telefone', percent: 25, color: 'var(--color-info)' },
      { label: 'Presencial', percent: 15, color: 'var(--color-success)' },
    ];
  }

  getSpecialties(): Specialty[] {
    return [
      { name: 'Cardiologia', count: 452, max: 452 },
      { name: 'Pediatria', count: 310, max: 452 },
      { name: 'Clínica Geral', count: 284, max: 452 },
      { name: 'Dermatologia', count: 238, max: 452 },
    ];
  }

  getDoctors(): DoctorRow[] {
    return [
      {
        id: 'ricardo-alencar',
        name: 'Dr. Ricardo Alencar',
        avatar: 'RA',
        specialty: 'Cardiologia',
        appointments: 214,
        revenue: 'R$ 18.240',
        rating: 4.9,
      },
      {
        id: 'beatriz-santos',
        name: 'Dra. Beatriz Santos',
        avatar: 'BS',
        specialty: 'Pediatria',
        appointments: 198,
        revenue: 'R$ 12.450',
        rating: 4.8,
      },
      {
        id: 'marcos-viana',
        name: 'Dr. Marcos Viana',
        avatar: 'MV',
        specialty: 'Clínica Geral',
        appointments: 284,
        revenue: 'R$ 8.520',
        rating: 4.7,
      },
    ];
  }
}
