import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AccountType {
  BANK = 'bank',
  CARD = 'card',
  CASH = 'cash',
}

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: AccountType,
  })
  type: AccountType;

  /** Валюта счёта (ISO-4217). Баланс хранится в этой валюте. */
  @Column({ default: 'RUB' })
  currency: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column()
  color: string;

  /** Архивный счёт скрыт из выбора при вводе и из общего состояния, но история операций сохраняется. */
  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

