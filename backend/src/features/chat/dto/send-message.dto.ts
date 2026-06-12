// dto/send-message.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Olá, como posso ajudar?' })
  @IsString()
  @MinLength(1)
  text: string;
}
