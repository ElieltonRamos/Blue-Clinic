import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const bootstrap = () => bootstrapApplication(App, appConfig).catch((err) => console.error(err));

async function init() {
  if ('__TAURI_INTERNALS__' in window) {
    try {
      const m = await import('./tauri-init');
      await m.initTauri(bootstrap);
    } catch (err) {
      console.error('tauri-init falhou:', err);
      bootstrap();
    }
  } else {
    bootstrap();
  }
}
init();
