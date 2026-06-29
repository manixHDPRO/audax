import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UseGuards,
  MessageEvent,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Observable } from 'rxjs';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ChatStreamService } from './chat-stream.service';
import { ChatService } from './chat.service';
import { CreateConversationDto, SendMessageDto } from './dto/chat.dto';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatStream: ChatStreamService,
  ) {}

  private userContext(user: JwtPayload) {
    return {
      id: user.sub,
      role: user.role as UserRole,
      cabinetId: user.cabinetId,
      bureauId: user.bureauId,
    };
  }

  @Get('contacts')
  listContacts(@CurrentUser() user: JwtPayload) {
    return this.chatService.listContacts(this.userContext(user));
  }

  @Get('conversations')
  listConversations(@CurrentUser('sub') userId: string) {
    return this.chatService.listConversations(userId);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser('sub') userId: string) {
    return this.chatService.getUnreadCount(userId).then((count) => ({ count }));
  }

  @Post('conversations')
  createConversation(@CurrentUser() user: JwtPayload, @Body() dto: CreateConversationDto) {
    return this.chatService.createOrGetConversation(this.userContext(user), dto.recipientId);
  }

  @Get('conversations/:id')
  getConversation(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.chatService.getConversation(id, userId);
  }

  @Get('conversations/:id/messages')
  listMessages(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatService.listMessages(id, userId, limit ? Number(limit) : 50, before);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(id, userId, dto.content);
  }

  @Patch('conversations/:id/read')
  markRead(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.chatService.markRead(id, userId);
  }

  @Sse('stream')
  stream(@CurrentUser('sub') userId: string): Observable<MessageEvent> {
    return this.chatStream.streamFor(userId);
  }
}
