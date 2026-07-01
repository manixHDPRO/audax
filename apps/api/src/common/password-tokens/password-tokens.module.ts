import { Module } from '@nestjs/common';
import { PasswordTokensService } from './password-tokens.service';

@Module({
  providers: [PasswordTokensService],
  exports: [PasswordTokensService],
})
export class PasswordTokensModule {}
