import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { CompanyService } from './company.service.js';

@ApiTags('company')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar dados da empresa' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  getCompany(@CurrentUser('companyId') companyId: number) {
    return this.companyService.getCompany(companyId);
  }

  @Patch()
  @ApiOperation({ summary: 'Atualizar dados da empresa' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  updateCompany(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.updateCompany(companyId, dto);
  }

  @Get('integration')
  @ApiOperation({ summary: 'Buscar configuração WhatsApp' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  getIntegration(@CurrentUser('companyId') companyId: number) {
    return this.companyService.getIntegration(companyId);
  }
}
