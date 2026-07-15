import { Component } from '@angular/core';

@Component({
  selector: 'app-offline',
  standalone: true,
  template: `
    <main class="bg-bg-base min-h-screen w-screen flex items-center justify-center p-4">
      <div
        class="bg-bg-sidebar border border-(--color-border) rounded-md p-8 flex flex-col items-center gap-4 max-w-md w-full text-center"
      >
        <p class="text-(--color-text-muted) text-7xl font-bold">!</p>
        <h1 class="text-(--color-text-primary) text-2xl font-bold">Sem conexão</h1>
        <p class="text-(--color-text-secondary) text-sm">Não foi possível conectar ao servidor.</p>
        <button
          (click)="retry()"
          class="h-10 px-6 bg-(--color-primary) hover:bg-(--color-primary-hover) rounded-md text-(--color-text-inverse) transition-colors text-sm"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  `,
})
export class OfflineComponent {
  retry() {
    window.location.reload();
  }
}