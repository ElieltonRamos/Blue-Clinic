import { Component } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

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
export class AppLayout {
  company = { name: 'Sua Empresa' };
  exactMatch = { exact: false };
  isDark = true;

  currentUser = {
    initials: 'JS',
    name: 'Dr. Julian Smith',
    role: 'Diretor Médico',
  };

  currentRouteTitle = 'Visão Geral da Clínica';

  mainNav: NavItem[] = [
    { label: 'Dashboard', title: 'Visão Geral da Clínica', route: '/dashboard', icon: 'grid' },
    { label: 'Agenda', title: 'Agenda', route: '/dashboard/agenda', icon: 'calendar' },
    { label: 'Pacientes', title: 'Pacientes', route: '/dashboard/pacientes', icon: 'users' },
    {
      label: 'Chat/Automação',
      title: 'Chat e Automação',
      route: '/dashboard/chats',
      icon: 'message-square',
    },
    { label: 'Relatórios', title: 'Relatórios', route: '/dashboard/relatorios', icon: 'file-text' },
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

  constructor(private router: Router) {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: any) => {
      const url = e.urlAfterRedirects;
      const match = this.allNav
        .filter((item) => item.route !== '/')
        .sort((a, b) => b.route.length - a.route.length)
        .find((item) => url.startsWith(item.route));
      this.currentRouteTitle = match?.title ?? '';
    });
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    document.documentElement.classList.toggle('light', !this.isDark);
  }
}
