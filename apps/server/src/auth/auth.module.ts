import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module';
import { TelegramAuthGuard } from './telegram-auth.guard';

@Module({
  imports: [UsersModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: TelegramAuthGuard,
    },
  ],
})
export class AuthModule {}
