import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    example: 'Ativo',
    description: 'Status do usuário: Ativo ou Inativo',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'Ativo' || value === true) return true;
    if (value === 'Inativo' || value === false) return false;
    return false;
  })
  @IsBoolean({ message: 'active deve ser "Ativo" ou "Inativo"' })
  active?: boolean;
}
