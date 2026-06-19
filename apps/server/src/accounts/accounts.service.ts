import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Currency } from '@swt/shared';

export interface NetWorth {
  baseCurrency: string;
  total: number;
  accounts: { id: string; name: string; currency: string; balance: number; balanceInBase: number }[];
}

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private accountsRepository: Repository<Account>,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  /** Суммарное «состояние»: балансы всех счетов, приведённые к базовой валюте по текущим курсам. */
  async getNetWorth(userId: string, baseCurrency: string): Promise<NetWorth> {
    const accounts = await this.findAll(userId);
    const items = await Promise.all(
      accounts.map(async (a) => {
        const balanceInBase = Number(
          (
            await this.exchangeRatesService.convert(
              Number(a.balance),
              a.currency as Currency,
              baseCurrency as Currency,
            )
          ).toFixed(2),
        );
        return {
          id: a.id,
          name: a.name,
          currency: a.currency,
          balance: Number(a.balance),
          balanceInBase,
        };
      }),
    );
    const total = Number(items.reduce((sum, i) => sum + i.balanceInBase, 0).toFixed(2));
    return { baseCurrency, total, accounts: items };
  }

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
