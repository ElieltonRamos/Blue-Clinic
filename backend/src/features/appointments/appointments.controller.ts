import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  Put,
  Delete,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';
import { AppointmentFiltersDto } from './dto/appointment-filters.dto.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { AppointmentResponseDto } from './dto/appointment-response.dto.js';
import { PaymentResponseDto } from './dto/payment-response.dto.js';
import { BlockedSlotResponseDto } from './dto/blocked-slot-response.dto.js';
import { AutoConfirmationDto } from './dto/auto-confirmation.dto.js';
import { AvailableSlotsQueryDto, SlotDto } from './dto/available-slots.dto.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { Roles } from '../../core/decorators/roles.decorator.js';
import { UpdateBlockedSlotDto } from './dto/update-blocked-slot.dto.js';
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto.js';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto.js';

@ApiTags('Agendamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Roles('admin', 'atendimento', 'medico')
  @ApiOperation({ summary: 'Listar agendamentos' })
  @ApiQuery({ name: 'month', required: false, example: '2025-06' })
  @ApiQuery({ name: 'doctorId', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'confirmed',
      'pending',
      'checkin',
      'blocked',
      'external',
      'paid',
      'cancelled',
    ],
  })
  @ApiResponse({ status: HttpStatus.OK, type: [AppointmentResponseDto] })
  findAll(
    @CurrentUser('companyId') companyId: number,
    @Query() filters: AppointmentFiltersDto,
  ) {
    return this.appointmentsService.findAll(companyId, filters);
  }

  @Get('blocked-slots')
  @Roles('admin', 'atendimento', 'medico')
  @ApiOperation({ summary: 'Listar slots bloqueados' })
  @ApiQuery({ name: 'doctorId', required: false, type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: [BlockedSlotResponseDto] })
  findBlockedSlots(
    @CurrentUser('companyId') companyId: number,
    @Query('doctorId') doctorId?: number,
    @Query('global') global?: string,
  ) {
    return this.appointmentsService.findBlockedSlots(
      companyId,
      doctorId,
      global === 'true',
    );
  }

  @Post('blocked-slots')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Criar slot bloqueado' })
  @ApiResponse({ status: HttpStatus.CREATED, type: BlockedSlotResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Médico não encontrado',
  })
  createBlockedSlot(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateBlockedSlotDto,
  ) {
    return this.appointmentsService.createBlockedSlot(companyId, dto);
  }

  @Put('blocked-slots/:id')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Atualizar slot bloqueado' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: BlockedSlotResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bloqueio não encontrado',
  })
  updateBlockedSlot(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: UpdateBlockedSlotDto,
  ) {
    return this.appointmentsService.updateBlockedSlot(id, companyId, dto);
  }

  @Delete('blocked-slots/:id')
  @Roles('admin', 'atendimento')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover slot bloqueado' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bloqueio não encontrado',
  })
  deleteBlockedSlot(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    return this.appointmentsService.deleteBlockedSlot(id, companyId);
  }

  @Get('auto-confirmation')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Estatísticas de confirmação automática' })
  @ApiQuery({ name: 'month', required: true, example: '2025-06' })
  @ApiResponse({ status: HttpStatus.OK, type: AutoConfirmationDto })
  getAutoConfirmation(
    @CurrentUser('companyId') companyId: number,
    @Query('month') month: string,
  ) {
    return this.appointmentsService.getAutoConfirmation(companyId, month);
  }

  @Get('slots')
  @Roles('admin', 'atendimento', 'medico')
  @ApiOperation({
    summary: 'Listar slots disponíveis por médico, data e tipo de consulta',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [SlotDto] })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tipo de consulta não encontrado',
  })
  getAvailableSlots(
    @CurrentUser('companyId') companyId: number,
    @Query() query: AvailableSlotsQueryDto,
  ): Promise<SlotDto[]> {
    return this.appointmentsService.getAvailableSlots(companyId, query);
  }

  @Get(':id')
  @Roles('admin', 'atendimento', 'medico')
  @ApiOperation({ summary: 'Buscar agendamento por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Agendamento não encontrado',
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    return this.appointmentsService.findOne(id, companyId);
  }

  @Post()
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Criar agendamento' })
  @ApiResponse({ status: HttpStatus.CREATED, type: AppointmentResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Médico ou paciente não encontrado',
  })
  create(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(companyId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Atualizar agendamento' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Agendamento não encontrado',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, companyId, dto);
  }

  @Patch(':id/status')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Atualizar status do agendamento' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Agendamento não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Motivo do cancelamento é obrigatório',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(id, companyId, dto);
  }

  @Post(':id/payments')
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Registrar pagamento de agendamento' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.CREATED, type: PaymentResponseDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Agendamento não está confirmado ou já foi pago',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Agendamento não encontrado',
  })
  createPayment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @CurrentUser('userId') registeredById: number,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.appointmentsService.createPayment(
      id,
      companyId,
      dto,
      registeredById,
    );
  }
}
