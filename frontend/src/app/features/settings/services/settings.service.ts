import { Injectable } from '@angular/core';
import {
  CompanyData,
  IntegrationStatus,
  SecurityAlert,
  SecurityConfig,
  TeamMember,
} from '../types/settings.types';

@Injectable()
export class SettingsService {
  getTeamMembers(): TeamMember[] {
    return [
      {
        id: 'ricardo-menezes',
        name: 'Dr. Ricardo Menezes',
        role: 'Cardiologista',
        detail: 'CRM 12345-SP',
        level: 'medico',
        icon: '🩺',
      },
      {
        id: 'mariana-costa',
        name: 'Mariana Costa',
        role: 'Recepção',
        detail: 'Turno Manhã',
        level: 'atendimento',
        icon: '🎧',
      },
      {
        id: 'beatriz-santos',
        name: 'Dra. Beatriz Santos',
        role: 'Neurologista',
        detail: 'CRM 98765-SP',
        level: 'medico',
        icon: '🩹',
      },
    ];
  }

  getCompanyData(): CompanyData {
    return {
      name: 'Clínica Digital Ltda.',
      cnpj: '12.345.678/0001-99',
      phone: '(11) 99999-0000',
      email: 'contato@clinicadigital.com.br',
      address: 'Av. Paulista, 1000 – São Paulo, SP',
    };
  }

  getSecurityAlert(): SecurityAlert {
    return {
      message:
        'Existem 2 colaboradores com Autenticação de Dois Fatores (2FA) desativada. Recomenda a ativação imediata.',
    };
  }

  getIntegration(): IntegrationStatus {
    return {
      label: 'WhatsApp Business',
      status: 'connected',
      syncInfo: 'Última sincronização: hoje às 14:32',
    };
  }

  getSecurity(): SecurityConfig {
    return {
      backupLabel: 'Backup em Nuvem',
      backupStatus: 'Ativado (Diário)',
    };
  }

  getLicenseUsage(): { used: number; total: number; plan: string } {
    return { used: 8, total: 10, plan: 'Advanced' };
  }
}
