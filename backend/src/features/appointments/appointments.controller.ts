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
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
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
  @ApiOperation({ summary: 'Listar slots bloqueados' })
  @ApiQuery({ name: 'doctorId', required: false, type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: [BlockedSlotResponseDto] })
  findBlockedSlots(
    @CurrentUser('companyId') companyId: number,
    @Query('doctorId') doctorId?: number,
  ) {
    return this.appointmentsService.findBlockedSlots(companyId, doctorId);
  }

  @Get('auto-confirmation')
  @ApiOperation({ summary: 'Estatísticas de confirmação automática' })
  @ApiQuery({ name: 'month', required: true, example: '2025-06' })
  @ApiResponse({ status: HttpStatus.OK, type: AutoConfirmationDto })
  getAutoConfirmation(
    @CurrentUser('companyId') companyId: number,
    @Query('month') month: string,
  ) {
    return this.appointmentsService.getAutoConfirmation(companyId, month);
  }

  @Get(':id')
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

  @Post(':id/payments')
  @ApiOperation({ summary: 'Registrar pagamento de agendamento' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.CREATED, type: PaymentResponseDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Agendamento não está em check-in ou já foi pago',
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
