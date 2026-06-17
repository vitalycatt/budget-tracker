import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Account } from '../../accounts/entities/account.entity';
import { User } from '../../users/entities/user.entity';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('uuid')
  categoryId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column('uuid')
  accountId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column()
  description: string;

  @Column('timestamp')
  date: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

