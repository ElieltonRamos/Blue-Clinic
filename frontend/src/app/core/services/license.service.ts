// services/license.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from './environment';

export interface LicenseStatus {
  isValid: boolean;
  plan: string;
}

export interface LicenseTokenInfo {
  companyId: number;
  cnpj: string;
  plan: string;
  licenseValidUntil: number;
  maxOfflineDays: number;
  iat: number;
  exp: number;
  iss: string;
  sub: string;
}

@Injectable({
  providedIn: 'root',
})
export class LicenseService {
  private apiUrl = environment.apiUrl;
  private client = inject(HttpClient);

  getStatus(): Observable<LicenseStatus> {
    return this.client.get<LicenseStatus>(`${this.apiUrl}/license/status`);
  }

  validateLicense(): Observable<LicenseStatus> {
    return this.client.post<LicenseStatus>(`${this.apiUrl}/license/validate`, {});
  }

  getTokenInfo(): Observable<LicenseTokenInfo> {
    return this.client.get<LicenseTokenInfo>(`${this.apiUrl}/license/info`);
  }

  getCurrentPlan(): string {
    return (localStorage.getItem('licensePlan')) || 'basic';
  }
}
