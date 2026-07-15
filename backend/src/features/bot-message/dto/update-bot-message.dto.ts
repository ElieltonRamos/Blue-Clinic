import { PartialType } from '@nestjs/swagger';
import { CreateBotMessageDto } from './create-bot-message.dto';

export class UpdateBotMessageDto extends PartialType(CreateBotMessageDto) {}
