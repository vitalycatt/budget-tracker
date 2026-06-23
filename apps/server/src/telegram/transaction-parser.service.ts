import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

/** Результат разбора фразы пользователя ботом. */
export const parsedTransactionSchema = z.object({
  isTransaction: z
    .boolean()
    .describe('true, если сообщение описывает доход или расход; иначе false'),
  type: z.enum(['income', 'expense']).describe('Тип операции: доход или расход'),
  amount: z.number().describe('Сумма операции, положительное число'),
  categoryName: z
    .string()
    .describe('Краткое название категории на русском, регистр как в исходном тексте (например: кофе, транспорт, зарплата)'),
  description: z.string().describe('Короткое описание операции на русском'),
  date: z
    .string()
    .optional()
    .describe('Дата операции в формате YYYY-MM-DD, если в тексте указана («вчера», «15 мая» и т.п.); иначе опусти'),
});

export type ParsedTransaction = z.infer<typeof parsedTransactionSchema>;

/** Провайдер LLM для парсинга. Anthropic — основной; groq — бесплатная альтернатива. */
type Provider = 'anthropic' | 'groq';

const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5';
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** JSON Schema для structured output Anthropic (значения проверяет Zod на нашей стороне). */
const OUTPUT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    isTransaction: { type: 'boolean' },
    type: { type: 'string', enum: ['income', 'expense'] },
    amount: { type: 'number' },
    categoryName: { type: 'string' },
    description: { type: 'string' },
    date: { type: 'string' },
  },
  required: ['isTransaction', 'type', 'amount', 'categoryName', 'description'],
  additionalProperties: false,
} as const;

@Injectable()
export class TransactionParserService {
  private readonly logger = new Logger(TransactionParserService.name);
  private readonly provider: Provider;
  // Anthropic
  private readonly anthropic: Anthropic | null;
  private readonly anthropicModel: string;
  // Groq (OpenAI-совместимый REST)
  private readonly groqKey: string | null;
  private readonly groqModel: string;

  constructor() {
    this.provider = (process.env.LLM_PROVIDER as Provider) || 'anthropic';

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    this.anthropicModel = process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
    this.anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

    this.groqKey = process.env.GROQ_API_KEY || null;
    this.groqModel = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

    if (!this.isEnabled) {
      this.logger.warn(
        `Парсер отключён: для провайдера «${this.provider}» не задан ключ ` +
          `(${this.provider === 'groq' ? 'GROQ_API_KEY' : 'ANTHROPIC_API_KEY'}).`,
      );
    } else {
      this.logger.log(`Парсер: провайдер «${this.provider}»`);
    }
  }

  /** Готов ли выбранный провайдер (есть ключ). Бот стартует только при true. */
  get isEnabled(): boolean {
    return this.provider === 'groq' ? this.groqKey !== null : this.anthropic !== null;
  }

  /**
   * Извлекает из свободной фразы сумму, тип, категорию, описание и дату.
   * `existingCategories` — имена категорий пользователя, чтобы модель переиспользовала их.
   * Возвращает null, если сообщение не похоже на транзакцию или парсинг не удался.
   */
  async parse(text: string, existingCategories: string[]): Promise<ParsedTransaction | null> {
    if (!this.isEnabled) {
      throw new Error('Парсер недоступен: не задан ключ LLM-провайдера');
    }

    const system = this.buildSystemPrompt(existingCategories);
    const raw =
      this.provider === 'groq'
        ? await this.callGroq(system, text)
        : await this.callAnthropic(system, text);
    if (!raw) return null;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(this.extractJson(raw));
    } catch (error) {
      this.logger.warn(`Не удалось распарсить JSON ответа модели: ${(error as Error).message}`);
      return null;
    }

    const result = parsedTransactionSchema.safeParse(parsedJson);
    if (!result.success) {
      this.logger.warn(`Ответ модели не прошёл валидацию: ${result.error.message}`);
      return null;
    }

    const parsed = result.data;
    if (!parsed.isTransaction || parsed.amount <= 0) {
      return null;
    }
    return parsed;
  }

  /** Общий системный промпт. Для Groq дополняем явным требованием вернуть JSON. */
  private buildSystemPrompt(existingCategories: string[]): string {
    const categoriesHint = existingCategories.length
      ? `Существующие категории пользователя (переиспользуй подходящую, не выдумывай новую без необходимости): ${existingCategories.join(', ')}.`
      : 'У пользователя пока нет категорий — предложи подходящее короткое название.';

    const today = new Date().toISOString().slice(0, 10);
    const lines = [
      'Ты — помощник учёта личных финансов. Пользователь пишет короткие фразы о тратах и доходах на русском.',
      'Извлеки из фразы: тип (доход income / расход expense), сумму (число), категорию и краткое описание.',
      'Сохраняй регистр названия категории таким, как в исходном тексте: не делай первую букву заглавной принудительно («кофе» → «кофе», «Кофе» → «Кофе»). Исключение — если подходит уже существующая категория пользователя, верни её название как есть.',
      'Примеры: «потратил 500 на кофе» → expense, 500, кофе, кофе. «зарплата 120000» → income, 120000, зарплата, зарплата.',
      `Сегодня ${today}. Если в тексте есть дата или относительное указание («вчера», «позавчера», «15 мая») — верни поле date в формате YYYY-MM-DD; иначе опусти его (будет сегодня).`,
      'Если фраза не описывает финансовую операцию — верни isTransaction=false и нули/пустые строки.',
      categoriesHint,
    ];

    if (this.provider === 'groq') {
      lines.push(
        'Верни СТРОГО один JSON-объект с полями: isTransaction (boolean), type ("income"|"expense"), ' +
          'amount (number), categoryName (string), description (string), date (string "YYYY-MM-DD", опционально). ' +
          'Без markdown, без пояснений — только JSON.',
      );
    }
    return lines.join(' ');
  }

  /** Anthropic Messages API со structured output; возвращает текст ответа (JSON) или null. */
  private async callAnthropic(system: string, text: string): Promise<string | null> {
    try {
      const response = await this.anthropic!.messages.create({
        model: this.anthropicModel,
        max_tokens: 512,
        system,
        messages: [{ role: 'user', content: text }],
        output_config: {
          format: { type: 'json_schema', schema: OUTPUT_JSON_SCHEMA },
        },
      });
      return response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');
    } catch (error) {
      this.logger.error(`Ошибка парсинга через Anthropic: ${(error as Error).message}`);
      return null;
    }
  }

  /** Groq (OpenAI-совместимый) chat/completions в JSON-режиме; возвращает текст ответа или null. */
  private async callGroq(system: string, text: string): Promise<string | null> {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.groqModel,
          max_tokens: 512,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: text },
          ],
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Groq ${res.status}: ${body.slice(0, 300)}`);
        return null;
      }
      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content ?? null;
    } catch (error) {
      this.logger.error(`Ошибка парсинга через Groq: ${(error as Error).message}`);
      return null;
    }
  }

  /** Достаёт JSON-объект из ответа (на случай markdown-обёрток или текста вокруг). */
  private extractJson(s: string): string {
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    return start >= 0 && end > start ? s.slice(start, end + 1) : s;
  }
}
