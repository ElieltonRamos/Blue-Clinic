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
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { PatientFiltersDto } from './dto/patient-filters.dto.js';
import { PatientResponseDto } from './dto/patient-response.dto.js';
import { PatientDetailResponseDto } from './dto/patient-detail-response.dto.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { PatientsService, UploadedFileCustom } from './patient.service.js';

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

  @Post(':id/documents')
  @ApiOperation({ summary: 'Upload de documento do paciente' })
  @ApiParam({ name: 'id', type: Number })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const patientId = String(
            (req.params as Record<string, string>)['id'],
          );
          const dir = join(process.cwd(), 'uploads', 'patients', patientId);
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /pdf|jpeg|jpg|png|webp/;
        const ext = extname(file.originalname).toLowerCase().replace('.', '');
        if (allowed.test(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Tipo de arquivo não permitido.'), false);
        }
      },
    }),
  )
  uploadDocument(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Arquivo não enviado.');

    const uploadedFile: UploadedFileCustom = {
      originalname: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
    };

    return this.patientsService.uploadDocument(id, companyId, uploadedFile);
  }
}
