import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../services/settings.service';
import {
  CompanyData,
  IntegrationStatus,
  NewMemberForm,
  SecurityAlert,
  SecurityConfig,
  TeamMember,
  UserLevel,
} from '../types/settings.types';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [SettingsService],
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  private settingsService = inject(SettingsService);

  allMembers: TeamMember[] = [];
  companyData!: CompanyData;
  securityAlert!: SecurityAlert;
  integration!: IntegrationStatus;
  security!: SecurityConfig;
  license = { used: 0, total: 0, plan: '' };

  memberFilter = '';
  menuOpenId: string | null = null;

  showAddMemberModal = false;
  companySaving = false;
  companySaved = false;

  newMember: NewMemberForm = {
    name: '',
    role: '',
    detail: '',
    level: 'atendimento',
    icon: '👤',
  };

  ngOnInit(): void {
    this.allMembers = this.settingsService.getTeamMembers();
    this.companyData = this.settingsService.getCompanyData();
    this.securityAlert = this.settingsService.getSecurityAlert();
    this.integration = this.settingsService.getIntegration();
    this.security = this.settingsService.getSecurity();
    this.license = this.settingsService.getLicenseUsage();
  }

  get members(): TeamMember[] {
    const q = this.memberFilter.toLowerCase();
    return q
      ? this.allMembers.filter(
          (m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q),
        )
      : this.allMembers;
  }

  get licensePercent(): number {
    return Math.round((this.license.used / this.license.total) * 100);
  }

  levelLabel(level: UserLevel): string {
    return { medico: 'Médico', atendimento: 'Atendimento', admin: 'Admin' }[level];
  }

  levelClass(level: UserLevel): string {
    return {
      medico: 'bg-(--color-primary-subtle) text-(--color-primary-text)',
      atendimento: 'bg-(--color-bg-overlay) text-(--color-text-secondary)',
      admin: 'bg-success-subtle text-success',
    }[level];
  }

  toggleMenu(id: string): void {
    this.menuOpenId = this.menuOpenId === id ? null : id;
  }

  removeMember(id: string): void {
    this.allMembers = this.allMembers.filter((m) => m.id !== id);
    this.menuOpenId = null;
  }

  openAddMemberModal(): void {
    this.newMember = { name: '', role: '', detail: '', level: 'atendimento', icon: '👤' };
    this.showAddMemberModal = true;
  }

  closeAddMemberModal(): void {
    this.showAddMemberModal = false;
  }

  submitNewMember(): void {
    if (!this.newMember.name.trim() || !this.newMember.role.trim()) return;
    const member: TeamMember = {
      id: crypto.randomUUID(),
      ...this.newMember,
    };
    this.allMembers = [...this.allMembers, member];
    this.closeAddMemberModal();
  }

  saveCompany(): void {
    this.companySaving = true;
    // substituir por chamada real ao service
    setTimeout(() => {
      this.companySaving = false;
      this.companySaved = true;
      setTimeout(() => (this.companySaved = false), 2000);
    }, 600);
  }
}
