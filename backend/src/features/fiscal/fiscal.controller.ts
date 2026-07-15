import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { FiscalService, UploadedFileCustom } from './fiscal.service.js';
import { FiscalDocumentResponseDto } from './dto/fiscal-document-response.dto.js';

@ApiTags('fiscal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments/:id/fiscal-documents')
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Post()
  @ApiOperation({ summary: 'Upload de XML/PDF da nota fiscal do pagamento' })
  @ApiParam({ name: 'id', type: Number })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        xml: { type: 'string', format: 'binary' },
        pdf: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: FiscalDocumentResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pagamento não encontrado',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'xml', maxCount: 1 },
        { name: 'pdf', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: (req, _file, cb) => {
            const paymentId = String(
              (req.params as Record<string, string>)['id'],
            );
            const dir = join(process.cwd(), 'uploads', 'payments', paymentId);
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
          const ext = extname(file.originalname).toLowerCase().replace('.', '');
          const allowed =
            file.fieldname === 'xml' ? ext === 'xml' : ext === 'pdf';
          if (allowed) {
            cb(null, true);
          } else {
            cb(
              new BadRequestException(
                `Tipo de arquivo inválido para o campo ${file.fieldname}.`,
              ),
              false,
            );
          }
        },
      },
    ),
  )
  uploadInvoice(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @UploadedFiles()
    files: {
      xml?: Express.Multer.File[];
      pdf?: Express.Multer.File[];
    },
  ) {
    if (!files.xml?.[0] && !files.pdf?.[0]) {
      throw new BadRequestException('Arquivo não enviado.');
    }

    const xmlFile: UploadedFileCustom | null = files.xml?.[0]
      ? {
          originalname: files.xml[0].originalname,
          filename: files.xml[0].filename,
          mimetype: files.xml[0].mimetype,
          size: files.xml[0].size,
        }
      : null;

    const pdfFile: UploadedFileCustom | null = files.pdf?.[0]
      ? {
          originalname: files.pdf[0].originalname,
          filename: files.pdf[0].filename,
          mimetype: files.pdf[0].mimetype,
          size: files.pdf[0].size,
        }
      : null;

    return this.fiscalService.uploadInvoice(id, companyId, xmlFile, pdfFile);
  }

  @Get('xml')
  @ApiOperation({ summary: 'Baixar XML da nota fiscal' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pagamento ou arquivo não encontrado',
  })
  downloadXml(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ): Promise<StreamableFile> {
    return this.fiscalService.streamFile(id, companyId, 'xml');
  }

  @Get('pdf')
  @ApiOperation({ summary: 'Baixar PDF da nota fiscal' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pagamento ou arquivo não encontrado',
  })
  downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ): Promise<StreamableFile> {
    return this.fiscalService.streamFile(id, companyId, 'pdf');
  }

  @Delete()
  @ApiOperation({ summary: 'Remove a nota fiscal anexada ao pagamento' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: FiscalDocumentResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pagamento não encontrado',
  })
  removeInvoice(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    return this.fiscalService.removeInvoice(id, companyId);
  }
}
