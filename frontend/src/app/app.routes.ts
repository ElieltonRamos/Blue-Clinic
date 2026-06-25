import { Routes } from '@angular/router';
import { Login } from './features/login/pages/login';
import { AppLayout } from './shared/app-layout/app-layout';
import { Dashboard } from './features/dashboard/pages/dashboard';
import { Calendar } from './features/calendar/pages/calendar';
import { Patients } from './features/patients/pages/patients';
import { ChatAutomation } from './features/chat-automation/pages/chat-automation';
import { Reports } from './features/reports/pages/reports';
import { Settings } from './features/settings/pages/settings';
import { Financial } from './features/financial/pages/financial';
import { authGuard } from './core/guards/auth.guard';
import { Schedule } from './features/schedule/pages/schedule';
import { AppointmentTypes } from './features/appointment-types/pages/appointment-types';

export const routes: Routes = [
  {
    path: '',
    component: Login,
  },
  {
    path: 'dashboard',
    component: AppLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: Dashboard,
      },
      {
        path: 'agenda',
        component: Calendar,
      },
      {
        path: 'pacientes',
        component: Patients,
      },
      {
        path: 'chats',
        component: ChatAutomation,
      },
      {
        path: 'relatorios',
        component: Reports,
      },
      {
        path: 'configuracoes',
        component: Settings,
      },
      {
        path: 'financeiro',
        component: Financial,
      },
      {
        path: 'agenda-config',
        component: Schedule,
      },
      {
        path: 'tipos-consulta',
        component: AppointmentTypes,
      },
    ],
  },
];
