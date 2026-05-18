import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { TelegramService } from './telegram.service';

type OrderSummary = {
  paid: { count: number; total: number };
  open: { count: number; ids: number[] };
  closed: { count: number; ids: number[] };
  canceled: { count: number };
  total: number;
};

type SalesSummary = {
  count: number;
  total: number;
};

type CrossDayOrder = {
  id: number;
  createdAt: Date;
};

@Injectable()
export class DailyReportService {
  private readonly logger = new Logger(DailyReportService.name);

  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  private getStartOfDay(dateString: string): Date {
    return new Date(`${dateString}T00:00:00-03:00`);
  }

  private getEndOfDay(dateString: string): Date {
    return new Date(`${dateString}T23:59:59.999-03:00`);
  }

  private getYesterdayString(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d
      .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      .split('/')
      .reverse()
      .join('-');
  }

  private fmt(v: number): string {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private async fetchOrderSummary(dateString: string): Promise<OrderSummary> {
    const start = this.getStartOfDay(dateString);
    const end = this.getEndOfDay(dateString);

    const [groups, pendingOrders] = await Promise.all([
      this.prisma.client.order.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: start, lte: end },
        },
        _count: { id: true },
        _sum: { total: true },
      }),
      this.prisma.client.order.findMany({
        where: {
          status: { in: ['CLOSED', 'OPEN'] },
          createdAt: { gte: start, lte: end },
        },
        select: { id: true, status: true },
      }),
    ]);

    const byStatus = (status: string) =>
      groups.find((g) => g.status === status);
    const paid = byStatus('PAID');
    const open = byStatus('OPEN');
    const closed = byStatus('CLOSED');
    const canceled = byStatus('CANCELED');

    return {
      paid: {
        count: paid?._count?.id ?? 0,
        total: Number(paid?._sum?.total ?? 0),
      },
      open: {
        count: open?._count?.id ?? 0,
        ids: pendingOrders.filter((o) => o.status === 'OPEN').map((o) => o.id),
      },
      closed: {
        count: closed?._count?.id ?? 0,
        ids: pendingOrders
          .filter((o) => o.status === 'CLOSED')
          .map((o) => o.id),
      },
      canceled: { count: canceled?._count?.id ?? 0 },
      total: groups.reduce((acc, g) => acc + g._count.id, 0),
    };
  }

  private async fetchSalesSummary(dateString: string): Promise<SalesSummary> {
    const result = await this.prisma.client.sale.aggregate({
      where: {
        date: {
          gte: this.getStartOfDay(dateString),
          lte: this.getEndOfDay(dateString),
        },
      },
      _sum: { totalProductsWithoutDiscount: true },
      _count: { id: true },
    });

    return {
      count: result._count.id,
      total: Number(result._sum.totalProductsWithoutDiscount ?? 0),
    };
  }

  private async fetchCrossDayOrders(
    dateString: string,
  ): Promise<CrossDayOrder[]> {
    return this.prisma.client.order.findMany({
      where: {
        status: 'PAID',
        finishedAt: {
          gte: this.getStartOfDay(dateString),
          lte: this.getEndOfDay(dateString),
        },
        createdAt: {
          lt: this.getStartOfDay(dateString),
        },
      },
      select: { id: true, createdAt: true },
    });
  }

  private buildMessage(
    dateString: string,
    orders: OrderSummary,
    sales: SalesSummary,
    crossDayOrders: CrossDayOrder[],
  ): string {
    const divergence = Math.abs(orders.paid.total - sales.total);
    const hasDivergence = divergence > 0.01;

    const date = new Date(`${dateString}T12:00:00-03:00`).toLocaleDateString(
      'pt-BR',
    );

    const crossDayInfo =
      crossDayOrders.length > 0
        ? `\n   ⏱ ${crossDayOrders.length} comanda(s) de dia anterior pagas hoje: ${crossDayOrders
            .map(
              (o) =>
                `ID ${o.id} (aberta em ${o.createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })})`,
            )
            .join(
              ', ',
            )}\n   ➡️ Oriente os operadores a fechar comandas no mesmo dia`
        : '';

    const lines = [
      `📊 <b>Relatório Operacional — ${date}</b>`,
      ``,
      `💰 <b>Financeiro</b>`,
      `├ Vendas brutas: <b>${this.fmt(sales.total)}</b> | ${sales.count} registros`,
      `└ Comandas pagas: <b>${this.fmt(orders.paid.total)}</b> | ${orders.paid.count} comandas`,
      ``,
      hasDivergence
        ? `⚠️ <b>DIVERGÊNCIA: ${this.fmt(divergence)}</b>${crossDayInfo}`
        : `✔️ Financeiro: <b>sem divergência</b>`,
      ``,
      `📋 <b>Comandas do dia (${orders.total} total)</b>`,
      `✅ Pagas       ${orders.paid.count}  — pagas e finalizadas`,
      `🔵 Fechadas    ${orders.closed.count}  — aguardando pagamento`,
      `🟢 Abertas     ${orders.open.count}  — ainda em atendimento`,
      `❌ Canceladas  ${orders.canceled.count}  — canceladas`,
    ];

    if (orders.closed.count > 0) {
      lines.push(``);
      lines.push(
        `🔵 <b>${orders.closed.count} comanda(s) fechadas sem pagamento</b>`,
      );
      lines.push(`   IDs: ${orders.closed.ids.join(', ')}`);
      lines.push(
        `   ➡️ Acesse o sistema e finalize o pagamento dessas comandas`,
      );
    }

    if (orders.open.count > 0) {
      lines.push(``);
      lines.push(
        `🚨 <b>${orders.open.count} comanda(s) abertas do dia anterior</b>`,
      );
      lines.push(`   IDs: ${orders.open.ids.join(', ')}`);
      lines.push(
        `   ➡️ Verifique se foram esquecidas abertas ou se houve falha no fechamento`,
      );
    }

    return lines.join('\n');
  }

  @Cron('0 6 * * *', { name: 'daily-report' })
  async sendDailyReport(): Promise<void> {
    this.logger.log('Gerando relatório diário...');
    try {
      const dateString = this.getYesterdayString();

      const [orders, sales, crossDayOrders] = await Promise.all([
        this.fetchOrderSummary(dateString),
        this.fetchSalesSummary(dateString),
        this.fetchCrossDayOrders(dateString),
      ]);

      const message = this.buildMessage(
        dateString,
        orders,
        sales,
        crossDayOrders,
      );
      await this.telegram.sendMessage(message);
      this.logger.log('Relatório enviado.');
    } catch (error) {
      this.logger.error('Erro ao gerar relatório', error);
      await this.telegram.sendMessage(
        '❌ Erro ao gerar relatório diário. Verifique os logs.',
      );
    }
  }
}
