import {
  Entity,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  name: string;

  @Column()
  icon: string;

  @Column()
  color: string;

  @Column({
    type: 'enum',
    enum: CategoryType,
    default: CategoryType.EXPENSE,
  })
  type: CategoryType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
