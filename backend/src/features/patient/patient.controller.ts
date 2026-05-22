// patients.controller.ts
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
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { PatientFiltersDto } from './dto/patient-filters.dto.js';
import { PatientResponseDto } from './dto/patient-response.dto.js';
import { PatientDetailResponseDto } from './dto/patient-detail-response.dto.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { PatientsService } from './patient.service.js';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pacientes' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['Ativo', 'Inativo'] })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: [PatientResponseDto] })
  findAll(
    @CurrentUser('companyId') companyId: number,
    @Query() filters: PatientFiltersDto,
  ) {
    return this.patientsService.findAll(companyId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar paciente por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: PatientDetailResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Paciente não encontrado',
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    return this.patientsService.findOne(id, companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar paciente' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PatientDetailResponseDto })
  create(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreatePatientDto,
  ) {
    return this.patientsService.create(companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar paciente' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: PatientDetailResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Paciente não encontrado',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(id, companyId, dto);
  }
}
