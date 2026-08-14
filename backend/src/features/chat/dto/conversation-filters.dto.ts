import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto.js';

export enum ConversationsFilterTab {
  todas = 'todas',
  aguardando = 'aguardando',
}

export class ConversationFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ConversationsFilterTab })
  @IsOptional()
  @IsEnum(ConversationsFilterTab)
  filter?: ConversationsFilterTab;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
