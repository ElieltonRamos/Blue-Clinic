import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../core/services/environment';
import {
  CompanyData,
  IntegrationStatus,
  TeamMember,
  CreateMemberRequest,
  UserLevel,
} from '../types/settings.types';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getCompany() {
    return this.http.get<CompanyData>(`${this.apiUrl}/company`);
  }

  updateCompany(dto: Partial<CompanyData>) {
    return this.http.patch<CompanyData>(`${this.apiUrl}/company`, dto);
  }

  getIntegration() {
    return this.http.get<IntegrationStatus>(`${this.apiUrl}/company/integration`);
  }

  getUsers(filters?: { username?: string; role?: UserLevel }) {
    let params = new HttpParams().set('active', 'true');
    if (filters?.username) params = params.set('username', filters.username);
    if (filters?.role) params = params.set('role', filters.role);
    return this.http.get<TeamMember[]>(`${this.apiUrl}/users`, { params });
  }

  createMember(dto: CreateMemberRequest) {
    return this.http.post<TeamMember>(`${this.apiUrl}/users`, dto);
  }

  removeMember(id: number) {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/users/${id}`);
  }

  updateMember(id: number, dto: Partial<CreateMemberRequest> & { active?: boolean }) {
    return this.http.patch<TeamMember>(`${this.apiUrl}/users/${id}`, dto);
  }
}
