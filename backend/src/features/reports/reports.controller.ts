// reports.controller.ts

import { Controller, Get, Query, UseGuards, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import { ReportsFilterDto } from './dto/reports-filter.dto.js';
import { ReportsSummaryDto } from './dto/reports-summary.dto.js';
import { ReportsDoctorDto } from './dto/reports-doctor.dto.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { Roles } from '../../core/decorators/roles.decorator.js';

@ApiTags('Relatórios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Resumo de relatórios do período' })
  @ApiResponse({ status: HttpStatus.OK, type: ReportsSummaryDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datas inválidas',
  })
  getSummary(
    @CurrentUser('companyId') companyId: number,
    @Query() filter: ReportsFilterDto,
  ): Promise<ReportsSummaryDto> {
    return this.reportsService.getSummary(companyId, filter);
  }

  @Get('doctors')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Desempenho por médico no período' })
  @ApiResponse({ status: HttpStatus.OK, type: [ReportsDoctorDto] })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datas inválidas',
  })
  getDoctors(
    @CurrentUser('companyId') companyId: number,
    @Query() filter: ReportsFilterDto,
  ): Promise<ReportsDoctorDto[]> {
    return this.reportsService.getDoctors(companyId, filter);
  }
}
