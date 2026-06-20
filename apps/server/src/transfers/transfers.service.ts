import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transfer } from './entities/transfer.entity';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Account } from '../accounts/entities/account.entity';

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(Transfer)
    private transfersRepository: Repository<Transfer>,
    @InjectRepository(Account)
    private accountsRepository: Repository<Account>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateTransferDto): Promise<Transfer> {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Счёт-источник и счёт-приёмник должны отличаться');
    }

    const from = await this.accountsRepository.findOne({
      where: { id: dto.fromAccountId, userId },
    });
    if (!from) {
      throw new NotFoundException(`Счёт-источник с ID ${dto.fromAccountId} не найден`);
    }

    const to = await this.accountsRepository.findOne({
      where: { id: dto.toAccountId, userId },
    });
    if (!to) {
      throw new NotFoundException(`Счёт-приёмник с ID ${dto.toAccountId} не найден`);
    }

    // Снимок фактического курса перевода (учитывает банковский спред, если суммы введены вручную)
    const rate = Number((dto.amountTo / dto.amountFrom).toFixed(8));

    return await this.dataSource.transaction(async (manager) => {
      from.balance = Number(from.balance) - dto.amountFrom;
      if (from.balance < 0) {
        throw new BadRequestException('Недостаточно средств на счёте-источнике');
      }
      to.balance = Number(to.balance) + dto.amountTo;

      await manager.save(Account, from);
      await manager.save(Account, to);

      const transfer = manager.create(Transfer, {
        userId,
        fromAccountId: dto.fromAccountId,
        toAccountId: dto.toAccountId,
        amountFrom: dto.amountFrom,
        currencyFrom: from.currency,
        amountTo: dto.amountTo,
        currencyTo: to.currency,
        rate,
        description: dto.description ?? '',
        date: dto.date,
      });
      return await manager.save(Transfer, transfer);
    });
  }

  async findAll(userId: string): Promise<Transfer[]> {
    return await this.transfersRepository.find({
      where: { userId },
      relations: ['fromAccount', 'toAccount'],
      order: { date: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Transfer> {
    const transfer = await this.transfersRepository.findOne({
      where: { id, userId },
      relations: ['fromAccount', 'toAccount'],
    });
    if (!transfer) {
      throw new NotFoundException(`Перевод с ID ${id} не найден`);
    }
    return transfer;
  }

  /** Удаление перевода с откатом балансов (атомарно). */
  async remove(userId: string, id: string): Promise<void> {
    const transfer = await this.findOne(userId, id);

    await this.dataSource.transaction(async (manager) => {
      const from = await manager.findOne(Account, {
        where: { id: transfer.fromAccountId, userId },
      });
      const to = await manager.findOne(Account, {
        where: { id: transfer.toAccountId, userId },
      });
      if (!from || !to) {
        throw new NotFoundException('Счёт перевода не найден');
      }

      // Откат: возвращаем источнику, снимаем с приёмника
      to.balance = Number(to.balance) - Number(transfer.amountTo);
      if (to.balance < 0) {
        throw new BadRequestException(
          'На счёте-приёмнике недостаточно средств для отмены перевода',
        );
      }
      from.balance = Number(from.balance) + Number(transfer.amountFrom);

      await manager.save(Account, from);
      await manager.save(Account, to);
      await manager.remove(Transfer, transfer);
    });
  }
}
