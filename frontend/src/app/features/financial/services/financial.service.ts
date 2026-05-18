import { Injectable } from '@angular/core';
import {
  CashClosingRow,
  Expense,
  FinanceSummary,
  ProfessionalRevenue,
  Transaction,
} from '../types/financial.types';

@Injectable()
export class FinanceiroService {
  getSummary(): FinanceSummary {
    return {
      totalEntradas: 14250,
      entradasChange: 12,
      totalSaidas: 2410.5,
      saidasCount: 14,
    };
  }

  getExpenses(): Expense[] {
    return [
      {
        id: '1',
        description: 'Aluguel Consultório',
        category: 'Infraestrutura',
        receptionist: 'Juliana Meirelles',
        value: 3500,
        date: '05/10/2024',
        status: 'pago',
      },
      {
        id: '2',
        description: 'MedTools - Insumos',
        category: 'Insumos',
        receptionist: 'Ricardo Santos',
        value: 1120,
        date: '10/10/2024',
        status: 'pendente',
      },
      {
        id: '3',
        description: 'Energia Elétrica',
        category: 'Contas Fixas',
        receptionist: 'Juliana Meirelles',
        value: 480.5,
        date: '12/10/2024',
        status: 'pago',
      },
    ];
  }

  getTransactions(): Transaction[] {
    return [
      {
        id: '1',
        type: 'entrada',
        date: '14/10/2024',
        time: '14:30',
        patient: 'Pedro Alvares',
        doctor: 'Dr. Ricardo Silva',
        registeredBy: 'Juliana M.',
        value: 450,
        method: 'pix',
      },
      {
        id: '2',
        type: 'saida',
        date: '10/10/2024',
        time: '12:15',
        patient: 'MedTools - Insumos',
        doctor: 'N/A',
        registeredBy: 'Ricardo Santos',
        value: 1120,
        method: 'dinheiro',
      },
      {
        id: '3',
        type: 'entrada',
        date: '10/10/2024',
        time: '10:45',
        patient: 'Julia M.',
        doctor: 'Dra. Marina V.',
        registeredBy: 'Juliana M.',
        value: 2300,
        method: 'cartao',
      },
    ];
  }

  getProfessionalRevenues(): ProfessionalRevenue[] {
    return [
      { id: '1', name: 'Dr. Ricardo Silva', avatar: '👨‍⚕️', value: 8450 },
      { id: '2', name: 'Dra. Marina Vituzzo', avatar: '👩‍⚕️', value: 4200 },
      { id: '3', name: 'Laboratório (Geral)', avatar: '🔬', value: 1150 },
      { id: '4', name: 'Outros', avatar: '···', value: 450 },
    ];
  }

  getCashClosing(): CashClosingRow[] {
    return [
      { operator: 'Maria Costa', pix: 450, dinheiro: 100, cartao: 200, convenio: 0 },
      { operator: 'João Silva', pix: 300, dinheiro: 0, cartao: 500, convenio: 150 },
    ];
  }
}
