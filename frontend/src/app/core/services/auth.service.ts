import { Injectable } from '@angular/core';
import User from '../../features/users/types/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  isValidToken(token: string): boolean {
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now + 60;
    } catch {
      return false;
    }
  }

  hasRole(token: string, role: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role === role;
    } catch (e) {
      return false;
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return this.isValidToken(token || '');
  }

  getTokenPayload(token?: string): User | null {
    token = token || localStorage.getItem('token') || '';

    if (!token) return null;

    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
}
