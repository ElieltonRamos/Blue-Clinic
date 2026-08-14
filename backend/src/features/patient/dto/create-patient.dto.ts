/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeBrazilianPhone } from '../../../core/utils/phone.util';

export class CreatePatientDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString({ message: 'Nome deve ser um texto.' })
  name: string;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  @IsOptional()
  email?: string;

  @Transform(({ value }) => (value ? normalizeBrazilianPhone(value) : value))
  @IsString({ message: 'Telefone deve ser um texto.' })
  @Matches(/^\d+$/, {
    message:
      'Telefone deve conter apenas números (sem parênteses, traço ou espaço).',
  })
  @Matches(/^55[1-9]{2}\d{8}$/, {
    message: 'Telefone deve ser um celular brasileiro válido: DDD + número.',
  })
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
}
