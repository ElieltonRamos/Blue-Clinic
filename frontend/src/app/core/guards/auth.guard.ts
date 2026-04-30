// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NotificationService } from '../../shared/toastr/notification.service';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  const token = localStorage.getItem('token');
  
  // ✅ 1. TOKEN EXISTE?
  if (!token) {
    notification.warning('Faça login para continuar');
    router.navigate(['/'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // ✅ 2. JWT VÁLIDO? (expiração + formato)
  if (!auth.isValidToken(token)) {
    localStorage.removeItem('token');
    notification.error('Sessão expirada. Faça login novamente.');
    router.navigate(['/']);
    return false;
  }

  // ✅ 3. ROLE necessária? (opcional)
  const requiredRole = route.data['role'];
  if (requiredRole && !auth.hasRole(token, requiredRole)) {
    notification.error(`Acesso negado. ${requiredRole} necessário.`);
    return false;
  }

  return true;
};
