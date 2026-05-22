// dto/update-company.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'Clínica Exemplo' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '(38) 99999-9999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contato@clinica.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Rua Exemplo, 123' })
  @IsOptional()
  @IsString()
  address?: string;
}
