import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/** Кэш курсов валют. Храним котировки относительно пивота USD: rate = USD → quote. */
@Entity('exchange_rates')
@Index(['base', 'quote', 'date'], { unique: true })
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  base: string;

  @Column()
  quote: string;

  @Column('decimal', { precision: 18, scale: 8 })
  rate: number;

  @Column('date')
  date: string;

  @CreateDateColumn()
  fetchedAt: Date;
}
