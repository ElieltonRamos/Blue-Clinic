// appointment-types.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AppointmentTypesService } from './appointment-types.service.js';
import { CreateAppointmentTypeDto } from './dto/create-appointment-type.dto.js';
import { UpdateAppointmentTypeDto } from './dto/update-appointment-type.dto.js';
import { AppointmentTypeResponseDto } from './dto/appointment-type-response.dto.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { Roles } from '../../core/decorators/roles.decorator.js';

@ApiTags('Tipos de Consulta')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointment-types')
export class AppointmentTypesController {
  constructor(private readonly service: AppointmentTypesService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Criar tipo de consulta' })
  @ApiResponse({ status: HttpStatus.CREATED, type: AppointmentTypeResponseDto })
  create(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateAppointmentTypeDto,
  ): Promise<AppointmentTypeResponseDto> {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Roles('admin', 'atendimento', 'medico')
  @ApiOperation({ summary: 'Listar tipos de consulta' })
  @ApiResponse({ status: HttpStatus.OK, type: [AppointmentTypeResponseDto] })
  findAll(
    @CurrentUser('companyId') companyId: number,
  ): Promise<AppointmentTypeResponseDto[]> {
    return this.service.findAll(companyId);
  }

  @Get(':id')
  @Roles('admin', 'atendimento', 'medico')
  @ApiOperation({ summary: 'Buscar tipo de consulta por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentTypeResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tipo de consulta não encontrado',
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ): Promise<AppointmentTypeResponseDto> {
    return this.service.findOne(id, companyId);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar tipo de consulta' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentTypeResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tipo de consulta não encontrado',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: UpdateAppointmentTypeDto,
  ): Promise<AppointmentTypeResponseDto> {
    return this.service.update(id, companyId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover tipo de consulta (soft delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tipo de consulta removido com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tipo de consulta não encontrado',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ): Promise<{ message: string }> {
    return this.service.remove(id, companyId);
  }
}
