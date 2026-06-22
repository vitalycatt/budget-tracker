import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Transfer } from '../transfers/entities/transfer.entity';
import { Account } from '../accounts/entities/account.entity';
import { Category } from '../categories/entities/category.entity';
import { TelegramBotService } from './telegram-bot.service';
import { TransactionParserService } from './transaction-parser.service';
import { StatsService } from './stats.service';

@Module({
  imports: [
    UsersModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    // Прямой доступ к репозиториям для агрегатной статистики (/stats).
    TypeOrmModule.forFeature([User, Transaction, Transfer, Account, Category]),
  ],
  providers: [TelegramBotService, TransactionParserService, StatsService],
})
export class TelegramModule {}
