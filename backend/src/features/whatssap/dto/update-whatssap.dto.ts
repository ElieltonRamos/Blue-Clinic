import { PartialType } from '@nestjs/swagger';
import { CreateWhatssapDto } from './create-whatssap.dto';

export class UpdateWhatssapDto extends PartialType(CreateWhatssapDto) {}
