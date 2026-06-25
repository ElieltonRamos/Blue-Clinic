import { Controller, Get, Header, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  async getDashboard(): Promise<string> {
    const data = await this.appService.getDashboardData();
    return this.appService.renderDashboard(data);
  }

  @Post('backup')
  async runBackup(@Res() res: Response) {
    try {
      await this.appService.execBackup();
      res.json({ success: true, message: 'Backup realizado com sucesso' });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';
      res.status(500).json({
        success: false,
        message: 'Falha ao executar backup',
        error: message,
      });
    }
  }
}
