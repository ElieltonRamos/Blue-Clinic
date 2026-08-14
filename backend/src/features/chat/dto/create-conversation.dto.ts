/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { normalizeBrazilianPhone } from '../../../core/utils/phone.util';

export class CreateConversationDto {
  @ApiProperty({ example: '5538988663580' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeBrazilianPhone(value))
  @Matches(/^\d{10,15}$/, {
    message: 'phone deve conter apenas dígitos (10 a 15)',
  })
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  patientId?: number;
}
