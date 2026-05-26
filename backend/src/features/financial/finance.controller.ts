import { Controller, Get, Query, UseGuards, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FinanceService } from './finance.service.js';
import { FinanceFilterDto } from './dto/finance-filter.dto.js';
import { FinanceSummaryDto } from './dto/finance-summary.dto.js';
import { FinanceExpenseDto } from './dto/finance-expense.dto.js';
import { FinanceTransactionDto } from './dto/finance-transaction.dto.js';
import { ProfessionalRevenueDto } from './dto/professional-revenue.dto.js';
import { CashClosingRowDto } from './dto/cash-closing-row.dto.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { Roles } from '../../core/decorators/roles.decorator.js';

@ApiTags('Financeiro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Resumo financeiro do período' })
  @ApiResponse({ status: HttpStatus.OK, type: FinanceSummaryDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datas inválidas',
  })
  getSummary(
    @CurrentUser('companyId') companyId: number,
    @Query() filter: FinanceFilterDto,
  ): Promise<FinanceSummaryDto> {
    return this.financeService.getSummary(companyId, filter);
  }

  @Get('expenses')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Listar despesas do período' })
  @ApiResponse({ status: HttpStatus.OK, type: [FinanceExpenseDto] })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datas inválidas',
  })
  getExpenses(
    @CurrentUser('companyId') companyId: number,
    @Query() filter: FinanceFilterDto,
  ): Promise<FinanceExpenseDto[]> {
    return this.financeService.getExpenses(companyId, filter);
  }

  @Get('transactions')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Listar transações do período (entradas e saídas)' })
  @ApiResponse({ status: HttpStatus.OK, type: [FinanceTransactionDto] })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datas inválidas',
  })
  getTransactions(
    @CurrentUser('companyId') companyId: number,
    @Query() filter: FinanceFilterDto,
  ): Promise<FinanceTransactionDto[]> {
    return this.financeService.getTransactions(companyId, filter);
  }

  @Get('professional-revenues')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Receita por profissional no período' })
  @ApiResponse({ status: HttpStatus.OK, type: [ProfessionalRevenueDto] })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datas inválidas',
  })
  getProfessionalRevenues(
    @CurrentUser('companyId') companyId: number,
    @Query() filter: FinanceFilterDto,
  ): Promise<ProfessionalRevenueDto[]> {
    return this.financeService.getProfessionalRevenues(companyId, filter);
  }

  @Get('cash-closing')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Fechamento de caixa por operador no período' })
  @ApiResponse({ status: HttpStatus.OK, type: [CashClosingRowDto] })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datas inválidas',
  })
  getCashClosing(
    @CurrentUser('companyId') companyId: number,
    @Query() filter: FinanceFilterDto,
  ): Promise<CashClosingRowDto[]> {
    return this.financeService.getCashClosing(companyId, filter);
  }
}
