import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CURRENCIES, Currency } from '@swt/shared';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { FALLBACK_USD_RATES } from './fallback-rates';

const PIVOT = 'USD';
const API_URL = `https://open.er-api.com/v6/latest/${PIVOT}`;
const DAY_MS = 24 * 60 * 60 * 1000;

interface ErApiResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
}

@Injectable()
export class ExchangeRatesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExchangeRatesService.name);
  private refreshTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(ExchangeRate)
    private readonly ratesRepository: Repository<ExchangeRate>,
  ) {}

  /** При старте — гарантируем курсы на сегодня и запускаем суточное обновление. */
  async onModuleInit(): Promise<void> {
    await this.ensureFreshRates();
    // Суточное фоновое обновление (без внешнего планировщика)
    this.refreshTimer = setInterval(() => {
      void this.refresh();
    }, DAY_MS);
    this.refreshTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  /** Подгружает курсы, если на сегодня их ещё нет (ленивое обновление). */
  private async ensureFreshRates(): Promise<void> {
    const count = await this.ratesRepository.count({ where: { date: this.today() } });
    if (count === 0) {
      await this.refresh();
    }
  }

  /** Загружает курсы из open.er-api.com и кэширует. При сбое — fallback. */
  async refresh(): Promise<void> {
    const today = this.today();
    try {
      const response = await fetch(API_URL);
      const data = (await response.json()) as ErApiResponse;
      if (data.result !== 'success' || !data.rates) {
        throw new Error(`Неожиданный ответ API курсов: ${data.result}`);
      }
      await this.persist(today, data.rates);
      this.logger.log(`Курсы валют обновлены на ${today}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Не удалось получить курсы (${message}).`);
      const existing = await this.ratesRepository.count({ where: { date: today } });
      if (existing === 0) {
        await this.persist(today, FALLBACK_USD_RATES);
        this.logger.warn(`Применены резервные курсы на ${today}`);
      }
    }
  }

  /** Курс пересчёта from → to по последним сохранённым котировкам. */
  async getRate(from: Currency, to: Currency): Promise<number> {
    if (from === to) return 1;
    const rates = await this.getLatestUsdRates();
    const usdFrom = rates[from];
    const usdTo = rates[to];
    if (!usdFrom || !usdTo) {
      throw new Error(`Нет курса для пары ${from}/${to}`);
    }
    return usdTo / usdFrom;
  }

  /** Конвертирует сумму from → to. */
  async convert(amount: number, from: Currency, to: Currency): Promise<number> {
    const rate = await this.getRate(from, to);
    return amount * rate;
  }

  /** Последние сохранённые котировки USD → валюта для всех поддерживаемых валют. */
  private async getLatestUsdRates(): Promise<Record<string, number>> {
    const rows = await this.ratesRepository.find({
      where: { base: PIVOT },
      order: { date: 'DESC' },
    });
    const result: Record<string, number> = {};
    for (const row of rows) {
      // Берём самую свежую дату для каждой валюты (rows уже отсортированы DESC)
      if (result[row.quote] === undefined) {
        result[row.quote] = Number(row.rate);
      }
    }
    if (Object.keys(result).length === 0) {
      return { ...FALLBACK_USD_RATES };
    }
    return result;
  }

  private async persist(date: string, rates: Record<string, number>): Promise<void> {
    const rows = CURRENCIES.filter((c) => rates[c] !== undefined).map((quote) =>
      this.ratesRepository.create({
        base: PIVOT,
        quote,
        rate: rates[quote],
        date,
      }),
    );
    // upsert по (base, quote, date), чтобы повторный запуск за день не дублировал
    await this.ratesRepository.upsert(rows, ['base', 'quote', 'date']);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
