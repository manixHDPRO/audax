import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatStreamService } from './chat-stream.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatStreamService],
  exports: [ChatStreamService],
})
export class ChatModule {}
