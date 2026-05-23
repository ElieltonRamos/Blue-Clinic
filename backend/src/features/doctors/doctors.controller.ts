import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DoctorsService } from './doctors.service.js';
import { CreateDoctorDto } from './dto/create-doctor.dto.js';
import { UpdateDoctorDto } from './dto/update-doctor.dto.js';
import { DoctorFiltersDto } from './dto/doctor-filters.dto.js';
import { DoctorResponseDto } from './dto/doctor-response.dto.js';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto.js';
import { UpdateDoctorScheduleDto } from './dto/update-doctor-schedule.dto.js';
import { CreateCommissionDto } from './dto/create-commission.dto.js';
import { UpdateCommissionDto } from './dto/update-commission.dto.js';
import { DoctorScheduleResponseDto } from './dto/doctor-schedule-response.dto.js';
import { CommissionResponseDto } from './dto/commission-response.dto.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { Roles } from '../../core/decorators/roles.decorator.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';

@ApiTags('Médicos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  // ── Doctor CRUD ────────────────────────────────────────────────────────────

  @Post()
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Criar médico' })
  @ApiResponse({ status: 201, type: DoctorResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Nome de usuário já está em uso' })
  create(@Body() dto: CreateDoctorDto): Promise<DoctorResponseDto> {
    return this.doctorsService.create(dto);
  }

  @Get()
  @Roles('admin', 'atendimento', 'medico')
  @ApiOperation({ summary: 'Listar médicos' })
  @ApiResponse({ status: 200, type: [DoctorResponseDto] })
  findAll(@Query() filters: DoctorFiltersDto): Promise<DoctorResponseDto[]> {
    return this.doctorsService.findAll(filters);
  }

  @Get('me')
  @Roles('medico')
  @ApiOperation({ summary: 'Buscar médico do usuário logado' })
  @ApiResponse({ status: 200, type: DoctorResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Médico não encontrado para este usuário',
  })
  findMe(@CurrentUser('userId') userId: number): Promise<DoctorResponseDto> {
    return this.doctorsService.findMe(userId);
  }

  @Get(':id')
  @Roles('admin', 'atendimento', 'medico')
  @ApiOperation({ summary: 'Buscar médico por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: DoctorResponseDto })
  @ApiResponse({ status: 404, description: 'Médico não encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<DoctorResponseDto> {
    return this.doctorsService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Atualizar médico' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: DoctorResponseDto })
  @ApiResponse({ status: 404, description: 'Médico não encontrado' })
  @ApiResponse({ status: 409, description: 'Nome de usuário já está em uso' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorDto,
  ): Promise<DoctorResponseDto> {
    return this.doctorsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover médico (soft delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Médico removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Médico não encontrado' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.doctorsService.remove(id);
  }

  // ── Schedule ───────────────────────────────────────────────────────────────

  @Post(':id/schedules')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Adicionar horário ao médico' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, type: DoctorScheduleResponseDto })
  @ApiResponse({ status: 404, description: 'Médico não encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Já existe horário cadastrado para este dia',
  })
  createSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDoctorScheduleDto,
  ): Promise<DoctorScheduleResponseDto> {
    return this.doctorsService.createSchedule(id, dto);
  }

  @Get(':id/schedules')
  @Roles('admin', 'atendimento', 'medico')
  @ApiOperation({ summary: 'Listar horários do médico' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: [DoctorScheduleResponseDto] })
  @ApiResponse({ status: 404, description: 'Médico não encontrado' })
  findSchedules(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DoctorScheduleResponseDto[]> {
    return this.doctorsService.findSchedules(id);
  }

  @Put(':id/schedules/:scheduleId')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Atualizar horário do médico' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'scheduleId', type: Number })
  @ApiResponse({ status: 200, type: DoctorScheduleResponseDto })
  @ApiResponse({ status: 404, description: 'Horário não encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Já existe horário cadastrado para este dia',
  })
  updateSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Body() dto: UpdateDoctorScheduleDto,
  ): Promise<DoctorScheduleResponseDto> {
    return this.doctorsService.updateSchedule(id, scheduleId, dto);
  }

  @Delete(':id/schedules/:scheduleId')
  @Roles('admin', 'atendimento')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover horário do médico' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'scheduleId', type: Number })
  @ApiResponse({ status: 200, description: 'Horário removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Horário não encontrado' })
  removeSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
  ): Promise<{ message: string }> {
    return this.doctorsService.removeSchedule(id, scheduleId);
  }

  // ── Commissions ────────────────────────────────────────────────────────────

  @Post(':id/commissions')
  @Roles('admin')
  @ApiOperation({ summary: 'Adicionar comissão ao médico' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, type: CommissionResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Médico ou tipo de consulta não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Comissão já cadastrada para este médico e tipo',
  })
  createCommission(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommissionDto,
  ): Promise<CommissionResponseDto> {
    return this.doctorsService.createCommission(id, dto);
  }

  @Get(':id/commissions')
  @Roles('admin', 'atendimento', 'medico')
  @ApiOperation({ summary: 'Listar comissões do médico' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: [CommissionResponseDto] })
  @ApiResponse({ status: 404, description: 'Médico não encontrado' })
  findCommissions(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CommissionResponseDto[]> {
    return this.doctorsService.findCommissions(id);
  }

  @Put(':id/commissions/:commissionId')
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar comissão do médico' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'commissionId', type: Number })
  @ApiResponse({ status: 200, type: CommissionResponseDto })
  @ApiResponse({ status: 404, description: 'Comissão não encontrada' })
  updateCommission(
    @Param('id', ParseIntPipe) id: number,
    @Param('commissionId', ParseIntPipe) commissionId: number,
    @Body() dto: UpdateCommissionDto,
  ): Promise<CommissionResponseDto> {
    return this.doctorsService.updateCommission(id, commissionId, dto);
  }

  @Delete(':id/commissions/:commissionId')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover comissão do médico' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'commissionId', type: Number })
  @ApiResponse({ status: 200, description: 'Comissão removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Comissão não encontrada' })
  removeCommission(
    @Param('id', ParseIntPipe) id: number,
    @Param('commissionId', ParseIntPipe) commissionId: number,
  ): Promise<{ message: string }> {
    return this.doctorsService.removeCommission(id, commissionId);
  }
}
