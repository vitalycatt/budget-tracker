import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Account } from '../../accounts/entities/account.entity';

/**
 * Перемещение средств между двумя счетами пользователя.
 * Не доход и не расход — в агрегаты доходов/расходов не попадает.
 * Кросс-валютный перевод: со счёта-источника списывается `amountFrom` в его валюте,
 * на счёт-приёмник зачисляется `amountTo` в его валюте; `rate` — снимок amountTo/amountFrom.
 */
@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  fromAccountId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'fromAccountId' })
  fromAccount: Account;

  @Column('uuid')
  toAccountId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'toAccountId' })
  toAccount: Account;

  /** Списано со счёта-источника, в его валюте. */
  @Column('decimal', { precision: 10, scale: 2 })
  amountFrom: number;

  @Column({ default: 'RUB' })
  currencyFrom: string;

  /** Зачислено на счёт-приёмник, в его валюте. */
  @Column('decimal', { precision: 10, scale: 2 })
  amountTo: number;

  @Column({ default: 'RUB' })
  currencyTo: string;

  /** Снимок фактического курса перевода = amountTo / amountFrom. */
  @Column('decimal', { precision: 18, scale: 8, default: 1 })
  rate: number;

  @Column({ default: '' })
  description: string;

  @Column('timestamp')
  date: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
