import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CategoriesModule } from './categories/categories.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { TelegramModule } from './telegram/telegram.module';
import { TransfersModule } from './transfers/transfers.module';
import { Category } from './categories/entities/category.entity';
import { Account } from './accounts/entities/account.entity';
import { Transaction } from './transactions/entities/transaction.entity';
import { User } from './users/entities/user.entity';
import { ExchangeRate } from './exchange-rates/entities/exchange-rate.entity';
import { Transfer } from './transfers/entities/transfer.entity';

// Подключение к БД: если задан DATABASE_URL (Render «Add from Database») — берём его,
// иначе — раздельные DB_* (локальный запуск / Docker).
const dbConnection = process.env.DATABASE_URL
  ? { url: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'smart_wallet_tracker',
    };

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...dbConnection,
      entities: [User, Category, Account, Transaction, ExchangeRate, Transfer],
      synchronize: true, // Автоматическая синхронизация схемы БД
      logging: process.env.NODE_ENV === 'development',
    }),
    UsersModule,
    AuthModule,
    ExchangeRatesModule,
    CategoriesModule,
    AccountsModule,
    TransactionsModule,
    TransfersModule,
    TelegramModule,
  ],
})
export class AppModule {}
