/* eslint-disable @typescript-eslint/no-unsafe-return */
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
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { Roles } from '../../core/decorators/roles.decorator.js';

@ApiTags('Médicos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  @Roles('admin', 'atendimento')
  @ApiOperation({ summary: 'Criar médico' })
  @ApiResponse({ status: 201, type: DoctorResponseDto })
  @ApiResponse({ status: 409, description: 'Nome de usuário já está em uso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
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
}
