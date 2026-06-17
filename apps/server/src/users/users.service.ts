import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { DEFAULT_CATEGORIES } from './default-categories';
import { TelegramUser } from '../auth/telegram.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  /** Находит пользователя по Telegram ID или создаёт нового (+ дефолтные категории). */
  async findOrCreateByTelegram(tgUser: TelegramUser): Promise<User> {
    const telegramId = String(tgUser.id);
    const existing = await this.usersRepository.findOne({ where: { telegramId } });
    if (existing) {
      return existing;
    }

    const user = this.usersRepository.create({
      telegramId,
      username: tgUser.username ?? null,
      firstName: tgUser.first_name ?? null,
      lastName: tgUser.last_name ?? null,
      languageCode: tgUser.language_code ?? null,
      baseCurrency: 'RUB',
      isOnboarded: false,
    });
    const saved = await this.usersRepository.save(user);
    await this.seedDefaultCategories(saved.id);
    return saved;
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }
    return user;
  }

  /** Завершение онбординга: фиксирует базовую валюту и помечает пользователя. */
  async completeOnboarding(id: string, baseCurrency: string): Promise<User> {
    const user = await this.findById(id);
    user.baseCurrency = baseCurrency;
    user.isOnboarded = true;
    return this.usersRepository.save(user);
  }

  private async seedDefaultCategories(userId: string): Promise<void> {
    const categories = DEFAULT_CATEGORIES.map((c) =>
      this.categoriesRepository.create({ ...c, userId }),
    );
    await this.categoriesRepository.save(categories);
  }
}
