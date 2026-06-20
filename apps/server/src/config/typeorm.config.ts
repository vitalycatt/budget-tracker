import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Account } from '../accounts/entities/account.entity';
import { Category } from '../categories/entities/category.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { ExchangeRate } from '../exchange-rates/entities/exchange-rate.entity';
import { Transfer } from '../transfers/entities/transfer.entity';

config();

const entities = [User, Category, Account, Transaction, ExchangeRate, Transfer];

const dbConnection = process.env.DATABASE_URL
  ? { url: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'smart_wallet_tracker',
    };

export default new DataSource({
  type: 'postgres',
  ...dbConnection,
  entities,
  synchronize: true, // Автоматическая синхронизация схемы БД
  logging: process.env.NODE_ENV === 'development',
});
