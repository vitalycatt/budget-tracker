import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Account } from '../accounts/entities/account.entity';
import { Category } from '../categories/entities/category.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(Account)
    private accountsRepository: Repository<Account>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async create(userId: string, createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    // Счёт и категория должны принадлежать текущему пользователю
    const account = await this.accountsRepository.findOne({
      where: { id: createTransactionDto.accountId, userId },
    });
    if (!account) {
      throw new NotFoundException(`Счет с ID ${createTransactionDto.accountId} не найден`);
    }

    const category = await this.categoriesRepository.findOne({
      where: { id: createTransactionDto.categoryId, userId },
    });
    if (!category) {
      throw new NotFoundException(`Категория с ID ${createTransactionDto.categoryId} не найдена`);
    }

    // Используем транзакцию для атомарности операций
    return await this.dataSource.transaction(async (manager) => {
      const transaction = manager.create(Transaction, {
        ...(createTransactionDto as Partial<Transaction>),
        userId,
      });
      const savedTransaction = await manager.save(Transaction, transaction);

      // Обновляем баланс счета
      if (createTransactionDto.type === TransactionType.INCOME) {
        account.balance = Number(account.balance) + createTransactionDto.amount;
      } else {
        account.balance = Number(account.balance) - createTransactionDto.amount;
        if (account.balance < 0) {
          throw new BadRequestException('Недостаточно средств на счете');
        }
      }

      await manager.save(Account, account);

      return savedTransaction;
    });
  }

  async findAll(userId: string): Promise<Transaction[]> {
    return await this.transactionsRepository.find({
      where: { userId },
      relations: ['category', 'account'],
      order: { date: 'DESC' },
    });
  }

  async findByType(userId: string, type: TransactionType): Promise<Transaction[]> {
    return await this.transactionsRepository.find({
      where: { userId, type },
      relations: ['category', 'account'],
      order: { date: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findOne({
      where: { id, userId },
      relations: ['category', 'account'],
    });
    if (!transaction) {
      throw new NotFoundException(`Транзакция с ID ${id} не найдена`);
    }
    return transaction;
  }

  async remove(userId: string, id: string): Promise<void> {
    const transaction = await this.findOne(userId, id);
    const account = await this.accountsRepository.findOne({
      where: { id: transaction.accountId, userId },
    });

    if (!account) {
      throw new NotFoundException(`Счет с ID ${transaction.accountId} не найден`);
    }

    // Используем транзакцию для атомарности операций
    await this.dataSource.transaction(async (manager) => {
      // Откатываем изменение баланса
      if (transaction.type === TransactionType.INCOME) {
        account.balance = Number(account.balance) - Number(transaction.amount);
      } else {
        account.balance = Number(account.balance) + Number(transaction.amount);
      }

      await manager.save(Account, account);
      await manager.remove(Transaction, transaction);
    });
  }
}
