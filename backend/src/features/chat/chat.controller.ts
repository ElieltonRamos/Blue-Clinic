import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { ChatService } from './chat.service.js';
import { ConversationFiltersDto } from './dto/conversation-filters.dto.js';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { ConversationResponseDto } from './dto/conversation-response.dto.js';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto.js';
import { PatientInfoResponseDto } from './dto/patient-info-response.dto.js';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat/conversations')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Patch(':id/read')
  markAsRead(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.chatService.markAsRead(companyId, id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar conversas' })
  @ApiResponse({ status: HttpStatus.OK, type: [ConversationResponseDto] })
  findAll(
    @CurrentUser('companyId') companyId: number,
    @Query() filters: ConversationFiltersDto,
  ) {
    return this.chatService.getConversations(companyId, filters.status);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Listar mensagens da conversa' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: [ChatMessageResponseDto] })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversa não encontrada',
  })
  getMessages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    return this.chatService.getMessages(companyId, id);
  }

  @Get(':id/patient')
  @ApiOperation({ summary: 'Dados do paciente da conversa' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: PatientInfoResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversa não encontrada',
  })
  getPatient(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    return this.chatService.getPatient(companyId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status da conversa' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: ConversationResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversa não encontrada',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    return this.chatService.updateStatus(companyId, id, dto.status);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Enviar mensagem como atendente' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.CREATED, type: ChatMessageResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversa não encontrada',
  })
  sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @CurrentUser('username') username: string,
    @CurrentUser('role') role: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(
      companyId,
      id,
      dto.text,
      username,
      role,
    );
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Bloquear contato' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: PatientInfoResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversa não encontrada',
  })
  blockContact(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    return this.chatService.toggleBlock(companyId, id);
  }
}
