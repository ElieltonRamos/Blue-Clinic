import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  Matches,
} from 'class-validator';
import { PatientStatus } from '../../../../generated/prisma/client.js';

export class UpdatePatientDto {
  @ApiPropertyOptional({ example: 'João da Silva' })
  @IsString({ message: 'Nome deve ser um texto.' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '(38) 99999-9999' })
  @IsString({ message: 'Telefone deve ser um texto.' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '00000000000' })
  @IsString({ message: 'CPF deve ser um texto.' })
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter exatamente 11 dígitos numéricos.',
  })
  @IsOptional()
  cpf?: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsDateString({}, { message: 'Data de nascimento inválida.' })
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ enum: PatientStatus, example: PatientStatus.Ativo })
  @IsEnum(PatientStatus, { message: 'Status inválido.' })
  @IsOptional()
  status?: PatientStatus;

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'whatsappActive deve ser verdadeiro ou falso.' })
  @IsOptional()
  whatsappActive?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'lgpdConsent deve ser verdadeiro ou falso.' })
  @IsOptional()
  lgpdConsent?: boolean;
}
