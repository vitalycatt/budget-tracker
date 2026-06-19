import { Controller, Get, Post } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { CURRENCIES } from '@swt/shared';

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  /** Текущие курсы всех поддерживаемых валют к USD (пивот). */
  @Get()
  async getRates() {
    const rates: Record<string, number> = {};
    for (const currency of CURRENCIES) {
      rates[currency] = await this.exchangeRatesService.getRate('USD', currency);
    }
    return { base: 'USD', rates };
  }

  /** Ручное обновление курсов (для отладки/администрирования). */
  @Post('refresh')
  async refresh() {
    await this.exchangeRatesService.refresh();
    return { status: 'ok' };
  }
}
