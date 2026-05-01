import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

interface NavItem {
  label: string;
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
  mainNav: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'grid' },
    { label: 'Agenda', route: '/agenda', icon: 'calendar' },
    { label: 'Pacientes', route: '/pacientes', icon: 'users' },
    { label: 'Chat/Automação', route: '/chat', icon: 'message-square' },
    { label: 'Relatórios', route: '/relatorios', icon: 'file-text' },
  ];

  bottomNav: NavItem[] = [
    { label: 'Configurações', route: '/configuracoes', icon: 'settings' },
    { label: 'Sair', route: '/', icon: 'log-out' },
  ];
}
