import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  isTauri(): boolean {
    return '__TAURI_INTERNALS__' in window;
  }

  async openExternal(url: string): Promise<void> {
    if (this.isTauri()) {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } else {
      window.open(url, '_blank');
    }
  }

  async openBlob(blob: Blob, fileName: string, mimeType: string): Promise<void> {
    if (this.isTauri()) {
      const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const { openPath } = await import('@tauri-apps/plugin-opener');
      const { tempDir, join } = await import('@tauri-apps/api/path');

      const buffer = new Uint8Array(await blob.arrayBuffer());
      await writeFile(fileName, buffer, { baseDir: BaseDirectory.Temp });
      const fullPath = await join(await tempDir(), fileName);
      await openPath(fullPath);
    } else {
      const url = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    }
  }
}
