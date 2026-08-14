import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  Post,
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
import { ConversationResponseDto } from './dto/conversation-response.dto.js';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto.js';
import { PatientInfoResponseDto } from './dto/patient-info-response.dto.js';
import { PaginationQueryDto } from './dto/pagination-query.dto.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat/conversations')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Buscar ou criar conversa pelo telefone' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ConversationResponseDto })
  createConversation(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.findOrCreateConversationByPhone(
      companyId,
      dto.phone,
      dto.patientId ?? null,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar conversas (paginado)' })
  @ApiResponse({ status: HttpStatus.OK, type: [ConversationResponseDto] })
  findAll(
    @CurrentUser('companyId') companyId: number,
    @Query() filters: ConversationFiltersDto,
  ) {
    return this.chatService.getConversations(
      companyId,
      filters.page,
      filters.limit,
      filters.search,
      filters.filter,
    );
  }

  @Get('by-patient/:patientId')
  @ApiOperation({ summary: 'Buscar ou criar conversa pelo paciente' })
  @ApiParam({ name: 'patientId', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: ConversationResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Paciente não encontrado',
  })
  getOrCreateByPatient(
    @Param('patientId', ParseIntPipe) patientId: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    return this.chatService.getOrCreateConversationByPatient(
      companyId,
      patientId,
    );
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.chatService.markAsRead(companyId, id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Listar mensagens da conversa (paginado)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: [ChatMessageResponseDto] })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversa não encontrada',
  })
  getMessages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.chatService.getMessages(companyId, id, query.page, query.limit);
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

  @Patch(':id/patient')
  @ApiOperation({ summary: 'Vincular paciente à conversa' })
  @ApiParam({ name: 'id', type: Number })
  linkPatient(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Body('patientId', ParseIntPipe) patientId: number,
  ) {
    return this.chatService.linkPatient(companyId, id, patientId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir conversa' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversa não encontrada',
  })
  deleteConversation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    return this.chatService.deleteConversation(companyId, id);
  }
}
