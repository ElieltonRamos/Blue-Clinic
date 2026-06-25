import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  MinLength,
} from 'class-validator';

export class CreateDoctorDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  companyId: number;

  @ApiProperty({ example: 'Dr. João Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Clínica Geral' })
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  // Campos do usuário vinculado (opcional)
  @ApiPropertyOptional({ example: 'dr.joao' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'senha123', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
