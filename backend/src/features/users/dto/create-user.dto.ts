import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ValidationMessages } from '../../../core/utils/validation-messages';
import { Role } from '../../../../generated/prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'john_doe' })
  @IsString({ message: ValidationMessages.IS_STRING('Nome de usuário') })
  @IsNotEmpty({ message: ValidationMessages.IS_NOT_EMPTY('Nome de usuário') })
  username: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString({ message: ValidationMessages.IS_STRING('Senha') })
  @MinLength(6, { message: ValidationMessages.MIN_LENGTH('Senha', 6) })
  @IsNotEmpty({ message: ValidationMessages.IS_NOT_EMPTY('Senha') })
  password: string;

  @ApiProperty({ example: 'atendimento', enum: Role })
  @IsEnum(Role, { message: ValidationMessages.IS_STRING('Função') })
  @IsOptional()
  role?: Role;

  @ApiProperty({ required: false, default: true })
  @IsBoolean({ message: ValidationMessages.IS_BOOLEAN('Ativo') })
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ example: 'Dr. João Silva' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Cardiologia' })
  @IsString()
  @IsOptional()
  specialty?: string;
}
