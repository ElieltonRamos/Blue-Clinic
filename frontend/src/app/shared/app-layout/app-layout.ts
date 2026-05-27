import { Component, OnInit } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../features/settings/services/settings.service';

interface NavItem {
  label: string;
  title: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './app-layout.html',
})
export class AppLayout implements OnInit {
  company = { name: '' };
  isDark = true;
  currentRouteTitle = 'Visão Geral da Clínica';

  currentUser = {
    initials: '',
    name: '',
    role: '',
  };

  mainNav: NavItem[] = [
    { label: 'Dashboard', title: 'Visão Geral da Clínica', route: '/dashboard', icon: 'grid' },
    { label: 'Agenda', title: 'Agenda', route: '/dashboard/agenda', icon: 'calendar' },
    {
      label: 'Config. Agenda',
      title: 'Configuração de Agenda',
      route: '/dashboard/agenda-config',
      icon: 'clock',
    },
    {
      label: 'Tipos Consulta',
      title: 'Tipos de Consulta',
      route: '/dashboard/tipos-consulta',
      icon: 'tag',
    },
    { label: 'Pacientes', title: 'Pacientes', route: '/dashboard/pacientes', icon: 'users' },
    {
      label: 'Chat/Automação',
      title: 'Chat e Automação',
      route: '/dashboard/chats',
      icon: 'message-square',
    },
    { label: 'Relatórios', title: 'Relatórios', route: '/dashboard/relatorios', icon: 'file-text' },
    {
      label: 'Financeiro',
      title: 'Financeiro e Controle de Caixa',
      route: '/dashboard/financeiro',
      icon: 'dollar-sign',
    },
  ];

  bottomNav: NavItem[] = [
    {
      label: 'Configurações',
      title: 'Configurações',
      route: '/dashboard/configuracoes',
      icon: 'settings',
    },
    { label: 'Sair', title: '', route: '/', icon: 'log-out' },
  ];

  private allNav = [...this.mainNav, ...this.bottomNav];

  constructor(
    private router: Router,
    private auth: AuthService,
    private settings: SettingsService,
  ) {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: any) => {
      const url = e.urlAfterRedirects;
      const match = this.allNav
        .filter((item) => item.route !== '/')
        .sort((a, b) => b.route.length - a.route.length)
        .find((item) => url.startsWith(item.route));
      this.currentRouteTitle = match?.title ?? '';
    });
  }

  ngOnInit(): void {
    const payload = this.auth.getTokenPayload();
    if (payload) {
      this.currentUser = {
        name: payload.username,
        role: payload.role ?? '',
        initials: payload.username.slice(0, 2).toUpperCase(),
      };
    }

    this.settings.getCompany().subscribe({
      next: (company) => (this.company.name = company.tradeName),
      error: () => {},
    });
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    document.documentElement.classList.toggle('light', !this.isDark);
  }
}
