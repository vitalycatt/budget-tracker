import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CategoriesModule } from './categories/categories.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { Category } from './categories/entities/category.entity';
import { Account } from './accounts/entities/account.entity';
import { Transaction } from './transactions/entities/transaction.entity';
import { User } from './users/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'smart_wallet_tracker',
      entities: [User, Category, Account, Transaction],
      synchronize: true, // Автоматическая синхронизация схемы БД
      logging: process.env.NODE_ENV === 'development',
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    AccountsModule,
    TransactionsModule,
  ],
})
export class AppModule {}
