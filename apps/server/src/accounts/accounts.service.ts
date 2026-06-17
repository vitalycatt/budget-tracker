import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private accountsRepository: Repository<Account>,
  ) {}

  async create(userId: string, createAccountDto: CreateAccountDto): Promise<Account> {
    const account = this.accountsRepository.create({
      ...(createAccountDto as Partial<Account>),
      userId,
    });
    return await this.accountsRepository.save(account);
  }

  async findAll(userId: string): Promise<Account[]> {
    return await this.accountsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Account> {
    const account = await this.accountsRepository.findOne({ where: { id, userId } });
    if (!account) {
      throw new NotFoundException(`Счет с ID ${id} не найден`);
    }
    return account;
  }

  async update(userId: string, id: string, updateAccountDto: UpdateAccountDto): Promise<Account> {
    const account = await this.findOne(userId, id);
    Object.assign(account, updateAccountDto);
    return await this.accountsRepository.save(account);
  }

  async remove(userId: string, id: string): Promise<void> {
    const account = await this.findOne(userId, id);
    await this.accountsRepository.remove(account);
  }
}
