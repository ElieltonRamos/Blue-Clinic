import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../services/settings.service';
import {
  CompanyData,
  IntegrationStatus,
  NewMemberForm,
  TeamMember,
  UserLevel,
} from '../types/settings.types';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  private settingsService = inject(SettingsService);

  allMembers: TeamMember[] = [];
  companyData!: CompanyData;
  integration!: IntegrationStatus;

  memberFilter = '';
  menuOpenId: number | null = null;

  showAddMemberModal = false;
  companySaved = false;
  loading = false;

  newMember: NewMemberForm = {
    name: '',
    role: '',
    detail: '',
    level: 'atendimento',
    icon: '👤',
  };

  // TODO: pegar do token JWT (companyId do usuário logado)
  private companyId = 1;

  ngOnInit(): void {
    this.loadTeamMembers();
    this.loadCompany();
    this.loadIntegration();
  }

  private loadTeamMembers(): void {
    this.settingsService.getTeamMembers().subscribe({
      next: (members) => (this.allMembers = members),
      error: (err) => console.error('Erro ao carregar membros', err),
    });
  }

  private loadCompany(): void {
    this.settingsService.getCompany(this.companyId).subscribe({
      next: (company) => (this.companyData = company),
      error: (err) => console.error('Erro ao carregar empresa', err),
    });
  }

  private loadIntegration(): void {
    this.settingsService.getIntegration(this.companyId).subscribe({
      next: (integration) => (this.integration = integration),
      error: (err) => console.error('Erro ao carregar integração', err),
    });
  }

  get members(): TeamMember[] {
    const q = this.memberFilter.toLowerCase();
    return q
      ? this.allMembers.filter(
          (m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q),
        )
      : this.allMembers;
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

  toggleMenu(id: number): void {
    this.menuOpenId = this.menuOpenId === id ? null : id;
  }

  removeMember(id: number, level: UserLevel): void {
    this.settingsService.removeMember(id, level).subscribe({
      next: () => {
        this.allMembers = this.allMembers.filter((m) => m.id !== id);
        this.menuOpenId = null;
      },
      error: (err) => console.error('Erro ao remover membro', err),
    });
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

    this.loading = true;
    this.settingsService
      .createMember({
        ...this.newMember,
        companyId: this.companyId,
        specialty: this.newMember.role,
      })
      .subscribe({
        next: (member) => {
          this.allMembers = [...this.allMembers, member];
          this.loading = false;
          this.closeAddMemberModal();
        },
        error: (err) => {
          console.error('Erro ao cadastrar membro', err);
          this.loading = false;
        },
      });
  }

  saveCompany(): void {
    if (!this.companyData) return;
    this.settingsService.updateCompany(this.companyId, this.companyData).subscribe({
      next: () => {
        this.companySaved = true;
        setTimeout(() => (this.companySaved = false), 2000);
      },
      error: (err) => console.error('Erro ao salvar empresa', err),
    });
  }
}
