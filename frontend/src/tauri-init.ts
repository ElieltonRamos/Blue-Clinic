import { exists, readTextFile, writeTextFile, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';

const DEFAULT_CONFIG = { mode: 'local', remote_url: null as string | null };

async function loadConfig() {
  const configExists = await exists('config.json', { baseDir: BaseDirectory.AppConfig });

  if (!configExists) {
    await mkdir('', { baseDir: BaseDirectory.AppConfig, recursive: true });
    await writeTextFile('config.json', JSON.stringify(DEFAULT_CONFIG, null, 2), {
      baseDir: BaseDirectory.AppConfig,
    });
    return DEFAULT_CONFIG;
  }

  const content = await readTextFile('config.json', { baseDir: BaseDirectory.AppConfig });
  return JSON.parse(content);
}

export async function initTauri(bootstrap: () => void): Promise<void> {
  const config = await loadConfig();

  if (config.mode === 'remote' && config.remote_url) {
    try {
      await Promise.race([
        fetch(config.remote_url, { mode: 'no-cors' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      window.location.href = config.remote_url;
      return;
    } catch (e) {
      console.error('falhou conexão remota:', e);
      (window as any).__TAURI_OFFLINE__ = true;
    }
  }

  console.log('chamando bootstrap');
  bootstrap();
}
