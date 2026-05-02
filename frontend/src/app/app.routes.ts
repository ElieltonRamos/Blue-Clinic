import { Routes } from '@angular/router';
import { Login } from './features/login/pages/login';
import { AppLayout } from './shared/app-layout/app-layout';
import { Dashboard } from './features/dashboard/pages/dashboard';

export const routes: Routes = [
  {
    path: '',
    component: Login,
  },
  {
    path: 'dashboard',
    component: AppLayout,
  },
];
