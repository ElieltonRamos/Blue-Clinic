// src/license/interfaces/license.interface.ts

export interface LicenseTokenPayload {
  companyId: number;
  cnpj: string;
  plan: 'basic' | 'pro';
  licenseValidUntil: number;
  maxOfflineDays: number;
  iat: number;
  exp: number;
}

export interface LicenseStatus {
  isValid: boolean;
  plan: 'basic' | 'pro' | 'none';
  mode: 'online' | 'offline' | 'expired';
  daysRemaining?: number;
  message?: string;
}

export interface LicenseServerResponse {
  licenseToken?: string;
}
