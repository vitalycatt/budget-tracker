import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { TelegramBotService } from './telegram-bot.service';
import { TransactionParserService } from './transaction-parser.service';

@Module({
  imports: [UsersModule, AccountsModule, CategoriesModule, TransactionsModule],
  providers: [TelegramBotService, TransactionParserService],
})
export class TelegramModule {}
