import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('frontend');

  constructor(
    private theme: ThemeService,
    private router: Router,
  ) {
    if ((window as any).__TAURI_OFFLINE__) {
      this.router.navigateByUrl('/offline');
    }
  }
}
