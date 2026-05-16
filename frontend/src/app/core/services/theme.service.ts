import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private current = signal<'dark' | 'light'>(this.loadTheme());
  
  constructor() {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(this.current());
  }

  toggle() {
    const next = this.current() === 'dark' ? 'light' : 'dark';
    this.current.set(next);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  theme = this.current.asReadonly();

  private loadTheme(): 'dark' | 'light' {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' ? 'light' : 'dark';
  }
}
