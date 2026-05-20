import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Nome de usuário',
    example: 'admin',
  })
  @IsString({ message: 'Nome de usuário deve ser uma string' })
  @IsNotEmpty({ message: 'Nome de usuário é obrigatório' })
  username: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'senha123',
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Token JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Aviso sobre licença em modo offline',
    example: 'Sistema em modo offline. 3 dia(s) restante(s) para reconectar.',
    required: false,
  })
  licenseWarning?: string;
}
