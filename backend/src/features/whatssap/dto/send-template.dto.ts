import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  ValidateNested,
  IsIn,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateParameterDto {
  @ApiProperty({ example: 'text' })
  @IsString()
  @IsIn(['text', 'currency', 'date_time', 'image', 'document', 'video'])
  type: string = 'text';

  @ApiProperty({ example: 'João Silva' })
  @IsOptional()
  @IsString()
  text?: string;
}

export class TemplateComponentDto {
  @ApiProperty({ example: 'body', enum: ['header', 'body', 'button'] })
  @IsString()
  @IsIn(['header', 'body', 'button'])
  type: string = 'body';

  @ApiProperty({ type: [TemplateParameterDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateParameterDto)
  parameters: TemplateParameterDto[] = [];
}

export class SendTemplateDto {
  @ApiProperty({ example: 'lembrete_consulta' })
  @IsString()
  templateName: string = '';

  @ApiProperty({ type: [TemplateComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  components: TemplateComponentDto[] = [];
}
