import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, map } from 'rxjs';
import { environment } from '../../../core/services/environment';
import {
  CompanyData,
  IntegrationStatus,
  TeamMember,
  CreateMemberRequest,
} from '../types/settings.types';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getCompany(id: number) {
    return this.http.get<CompanyData>(`${this.apiUrl}/companies/${id}`);
  }

  updateCompany(id: number, dto: Partial<CompanyData>) {
    return this.http.patch<CompanyData>(`${this.apiUrl}/companies/${id}`, dto);
  }

  getTeamMembers() {
    const doctors$ = this.http.get<TeamMember[]>(`${this.apiUrl}/doctors?active=true`);
    const staff$ = this.http.get<TeamMember[]>(`${this.apiUrl}/users?active=true`);
    return forkJoin([doctors$, staff$]).pipe(map(([doctors, staff]) => [...doctors, ...staff]));
  }

  createMember(dto: CreateMemberRequest) {
    if (dto.level === 'medico') {
      return this.http.post<TeamMember>(`${this.apiUrl}/doctors`, dto);
    }
    return this.http.post<TeamMember>(`${this.apiUrl}/users`, dto);
  }

  removeMember(id: number, level: TeamMember['level']) {
    if (level === 'medico') {
      return this.http.delete<{ message: string }>(`${this.apiUrl}/doctors/${id}`);
    }
    return this.http.delete<{ message: string }>(`${this.apiUrl}/users/${id}`);
  }

  getUsersByRole(role: 'admin' | 'atendimento' | 'medico') {
    const params = new HttpParams().set('role', role).set('active', 'true');
    return this.http.get<TeamMember[]>(`${this.apiUrl}/users`, { params });
  }

  getIntegration(companyId: number) {
    return this.http.get<IntegrationStatus>(`${this.apiUrl}/whatsapp-config/${companyId}`);
  }
}
