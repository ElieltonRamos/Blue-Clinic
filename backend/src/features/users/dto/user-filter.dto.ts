import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform as TransformFn } from 'class-transformer';
import { Role } from '../../../../generated/prisma/client';

export class UserFiltersDto {
  @ApiPropertyOptional({ example: 'john' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'atendimento', enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @TransformFn(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'active deve ser true/false' })
  active?: boolean;
}
