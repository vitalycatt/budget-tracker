import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Account } from '../accounts/entities/account.entity';
import { Category } from '../categories/entities/category.entity';
import { Transaction } from '../transactions/entities/transaction.entity';

config();

const entities = [Category, Account, Transaction];

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'smart_wallet_tracker',
  entities,
  synchronize: true, // Автоматическая синхронизация схемы БД
  logging: process.env.NODE_ENV === 'development',
});
