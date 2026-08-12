import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../core/services/environment';
import {
  CompanyData,
  IntegrationStatus,
  TeamMember,
  CreateMemberRequest,
  UserLevel,
  UpsertIntegrationDto,
  BaileysStatus,
  ReminderRule,
  CreateReminderRuleDto,
  UpdateReminderRuleDto,
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

  upsertIntegration(dto: UpsertIntegrationDto) {
    return this.http.patch<IntegrationStatus>(`${this.apiUrl}/company/integration`, dto);
  }

  connectBaileys() {
    return this.http.post<{ ok: true }>(`${this.apiUrl}/whatssap/baileys/connect`, {});
  }

  getBaileysStatus() {
    return this.http.get<BaileysStatus>(`${this.apiUrl}/whatssap/baileys/status`);
  }

  disconnectBaileys() {
    return this.http.post<{ ok: true }>(`${this.apiUrl}/whatssap/baileys/disconnect`, {});
  }

  getReminderRules() {
    return this.http.get<ReminderRule[]>(`${this.apiUrl}/whatssap/reminder-rules`);
  }

  createReminderRule(dto: CreateReminderRuleDto) {
    return this.http.post<ReminderRule>(`${this.apiUrl}/whatssap/reminder-rules`, dto);
  }

  updateReminderRule(id: number, dto: UpdateReminderRuleDto) {
    return this.http.patch<ReminderRule>(`${this.apiUrl}/whatssap/reminder-rules/${id}`, dto);
  }

  removeReminderRule(id: number) {
    return this.http.delete<{ ok: true }>(`${this.apiUrl}/whatssap/reminder-rules/${id}`);
  }
}
