import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { Roles } from '../../core/decorators/roles.decorator.js';
import { DashboardStatsDto } from './dto/dashboard-stats.dto.js';
import { AppointmentTodayDto } from './dto/appointment-today.dto.js';
import { NextPatientDto } from './dto/next-patient.dto.js';
import { AppointmentsChartDto } from './dto/appointments-chart.dto.js';
import { ChatbotStatsDto } from './dto/chatbot-stats.dto.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles('admin', 'medico', 'atendimento')
  @ApiOperation({ summary: 'Cards de estatísticas do dashboard' })
  @ApiResponse({ status: HttpStatus.OK, type: DashboardStatsDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Não autorizado',
  })
  getStats(
    @CurrentUser('companyId') companyId: number,
  ): Promise<DashboardStatsDto> {
    return this.dashboardService.getStats(companyId);
  }

  @Get('appointments-today')
  @Roles('admin', 'medico', 'atendimento')
  @ApiOperation({ summary: 'Consultas do dia' })
  @ApiQuery({
    name: 'doctorId',
    required: false,
    type: Number,
    description: 'Filtrar por médico',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [AppointmentTodayDto] })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Não autorizado',
  })
  getAppointmentsToday(
    @CurrentUser('companyId') companyId: number,
    @Query('doctorId', new ParseIntPipe({ optional: true })) doctorId?: number,
  ): Promise<AppointmentTodayDto[]> {
    console.log('companyId:', companyId, typeof companyId);
    return this.dashboardService.getAppointmentsToday(companyId, doctorId);
  }

  @Get('next-patient/:doctorId')
  @Roles('admin', 'medico', 'atendimento')
  @ApiOperation({ summary: 'Próximo paciente do médico' })
  @ApiParam({ name: 'doctorId', type: Number, description: 'ID do médico' })
  @ApiResponse({ status: HttpStatus.OK, type: NextPatientDto, nullable: true })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Não autorizado',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  getNextPatient(
    @CurrentUser('companyId') companyId: number,
    @Param('doctorId', ParseIntPipe) doctorId: number,
  ): Promise<NextPatientDto | null> {
    return this.dashboardService.getNextPatient(companyId, doctorId);
  }

  @Get('appointments-chart')
  @Roles('admin', 'medico', 'atendimento')
  @ApiOperation({ summary: 'Dados do gráfico de consultas por mês' })
  @ApiQuery({
    name: 'year',
    required: true,
    type: Number,
    description: 'Ano de referência',
  })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentsChartDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Não autorizado',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  getAppointmentsChart(
    @CurrentUser('companyId') companyId: number,
    @Query('year', ParseIntPipe) year: number,
  ): Promise<AppointmentsChartDto> {
    return this.dashboardService.getAppointmentsChart(companyId, year);
  }

  @Get('chatbot-stats')
  @Roles('admin', 'medico', 'atendimento')
  @ApiOperation({ summary: 'Estatísticas de automação do chatbot' })
  @ApiResponse({ status: HttpStatus.OK, type: ChatbotStatsDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Não autorizado',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  getChatbotStats(
    @CurrentUser('companyId') companyId: number,
  ): Promise<ChatbotStatsDto> {
    return this.dashboardService.getChatbotStats(companyId);
  }
}
