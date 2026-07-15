import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { Roles } from '../../core/decorators/roles.decorator.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { FiscalService } from './fiscal.service.js';
import { FiscalFilterDto } from './dto/fiscal-filter.dto.js';
import { FiscalSummaryDto } from './dto/fiscal-summary.dto.js';
import { FiscalDocumentItemDto } from './dto/fiscal-document-item.dto.js';
import { FiscalPendingItemDto } from './dto/fiscal-pending-item.dto.js';

@ApiTags('fiscal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fiscal')
export class FiscalReportsController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Get('summary')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Resumo fiscal do período' })
  @ApiResponse({ status: 200, type: FiscalSummaryDto })
  getSummary(
    @CurrentUser('companyId') companyId: number,
    @Query() filter: FiscalFilterDto,
  ) {
    return this.fiscalService.getSummary(companyId, filter);
  }

  @Get('documents')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Notas fiscais emitidas no período' })
  @ApiResponse({ status: 200, type: [FiscalDocumentItemDto] })
  getDocuments(
    @CurrentUser('companyId') companyId: number,
    @Query() filter: FiscalFilterDto,
  ) {
    return this.fiscalService.getDocuments(companyId, filter);
  }

  @Get('pending')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Pagamentos sem nota fiscal emitida no período' })
  @ApiResponse({ status: 200, type: [FiscalPendingItemDto] })
  getPending(
    @CurrentUser('companyId') companyId: number,
    @Query() filter: FiscalFilterDto,
  ) {
    return this.fiscalService.getPending(companyId, filter);
  }
}
