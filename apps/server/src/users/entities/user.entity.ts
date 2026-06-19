import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Telegram ID — связь «1 TG-юзер = 1 юзер приложения». */
  @Column({ type: 'bigint', unique: true })
  telegramId: string;

  @Column({ nullable: true })
  username: string | null;

  @Column({ nullable: true })
  firstName: string | null;

  @Column({ nullable: true })
  lastName: string | null;

  @Column({ nullable: true })
  languageCode: string | null;

  /** Базовая валюта для подсчёта общего «состояния» и сводной статистики. */
  @Column({ default: 'RUB' })
  baseCurrency: string;

  /** Прошёл ли пользователь онбординг (выбор базовой валюты). */
  @Column({ default: false })
  isOnboarded: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
