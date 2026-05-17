import { Injectable } from '@angular/core';
import { Patient, PatientDetail } from '../types/patients.types';

@Injectable()
export class PatientsService {
  getPatients(): Patient[] {
    return [
      {
        id: 'jane-cooper',
        initials: 'JS',
        avatarColor: 'bg-primary-container text-on-primary-container',
        name: 'Jane S. Cooper',
        email: 'jane.cooper@email.com',
        phone: '+55 (11) 91234-5678',
        cpf: '123.456.789-00',
        lastVisit: '12 Out, 2023',
        status: 'Ativo',
      },
      {
        id: 'bernardo-williams',
        initials: 'BW',
        avatarColor: 'bg-surface-container-highest/20 text-on-surface-variant',
        name: 'Bernardo Williams',
        email: 'bernardo.w@provider.com',
        phone: '+55 (21) 98765-4321',
        cpf: '456.789.012-11',
        lastVisit: '28 Set, 2023',
        status: 'Inativo',
      },
      {
        id: 'albert-king',
        initials: 'AK',
        avatarColor: 'bg-tertiary-container text-on-tertiary-container',
        name: 'Albert King',
        email: 'albert.k@healthmail.com',
        phone: '+55 (31) 92468-1011',
        cpf: '789.012.345-22',
        lastVisit: '05 Out, 2023',
        status: 'Ativo',
      },
    ];
  }

  getPatientDetail(id: string): PatientDetail | null {
    const details: Record<string, PatientDetail> = {
      'jane-cooper': {
        id: 'jane-cooper',
        name: 'Jane S. Cooper',
        memberSince: 'Janeiro 2021',
        whatsappActive: true,
        lgpdConsent: true,
        consultationHistory: [
          {
            title: 'Retorno Cardiologia',
            date: '12 Out, 2023',
            doctor: 'Dr. Smith',
            note: 'Pressão estável, manter medicação atual.',
            active: true,
          },
          {
            title: 'Exames de Sangue',
            date: '05 Ago, 2023',
            doctor: 'Lab Dept',
            active: false,
          },
        ],
        documents: [
          { name: 'ECG_Scan.pdf', size: '2.4 MB', type: 'pdf' },
          { name: 'RaioX_Torax.jpg', size: '4.1 MB', type: 'image' },
        ],
        nextAppointment: {
          label: 'Amanhã, 09:30 AM',
          location: 'Sala 402 • Ala Principal',
        },
      },
    };
    return details[id] ?? null;
  }

  getTotalCount(): number {
    return 1284;
  }
}
