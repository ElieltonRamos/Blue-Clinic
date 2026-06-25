import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'Blue Clinic' })
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiPropertyOptional({ example: 'Blue Clinic Ltda' })
  @IsOptional()
  @IsString()
  corporateName?: string;

  @ApiPropertyOptional({ example: '(38) 99999-9999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contato@clinica.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Rua Exemplo' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional({ example: 'Apto 1' })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'Espinosa' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'MG' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '3124302' })
  @IsOptional()
  @IsString()
  cityCode?: string;
}
