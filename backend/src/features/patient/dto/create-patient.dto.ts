import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDateString } from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString({ message: 'Nome deve ser um texto.' })
  name: string;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '(38) 99999-9999' })
  @IsString({ message: 'Telefone deve ser um texto.' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '000.000.000-00' })
  @IsString({ message: 'CPF deve ser um texto.' })
  @IsOptional()
  cpf?: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsDateString({}, { message: 'Data de nascimento inválida.' })
  @IsOptional()
  birthDate?: string;
}
