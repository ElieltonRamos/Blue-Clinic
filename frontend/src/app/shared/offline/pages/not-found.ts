import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  template: `
    <main class="bg-bg-base min-h-screen w-screen flex items-center justify-center p-4">
      <div
        class="bg-bg-sidebar border border-(--color-border) rounded-md p-8 flex flex-col items-center gap-4 max-w-md w-full text-center"
      >
        <p class="text-(--color-text-muted) text-7xl font-bold">404</p>
        <h1 class="text-(--color-text-primary) text-2xl font-bold">Página não encontrada</h1>
        <p class="text-(--color-text-secondary) text-sm">
          A página que você está procurando não existe.
        </p>
        <button
          (click)="router.navigate(['/'])"
          class="h-10 px-6 bg-(--color-primary) hover:bg-(--color-primary-hover) rounded-md text-(--color-text-inverse) transition-colors text-sm"
        >
          Voltar ao início
        </button>
      </div>
    </main>
  `,
})
export class NotFound {
  constructor(public router: Router) {}
}
