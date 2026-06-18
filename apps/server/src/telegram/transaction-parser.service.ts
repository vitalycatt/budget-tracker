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
    .describe('Краткое название категории на русском (например: Еда, Транспорт, Зарплата)'),
  description: z.string().describe('Короткое описание операции на русском'),
});

export type ParsedTransaction = z.infer<typeof parsedTransactionSchema>;

const DEFAULT_MODEL = 'claude-haiku-4-5';

/** JSON Schema для structured output (без ограничений значений — их проверяет Zod на нашей стороне). */
const OUTPUT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    isTransaction: { type: 'boolean' },
    type: { type: 'string', enum: ['income', 'expense'] },
    amount: { type: 'number' },
    categoryName: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['isTransaction', 'type', 'amount', 'categoryName', 'description'],
  additionalProperties: false,
} as const;

@Injectable()
export class TransactionParserService {
  private readonly logger = new Logger(TransactionParserService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    if (!this.client) {
      this.logger.warn('ANTHROPIC_API_KEY не задан — парсинг сообщений бота отключён');
    }
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  /**
   * Извлекает из свободной фразы сумму, тип, категорию и описание.
   * `existingCategories` — имена категорий пользователя, чтобы модель переиспользовала их.
   * Возвращает null, если сообщение не похоже на транзакцию или парсинг не удался.
   */
  async parse(text: string, existingCategories: string[]): Promise<ParsedTransaction | null> {
    if (!this.client) {
      throw new Error('Парсер недоступен: не задан ANTHROPIC_API_KEY');
    }

    const categoriesHint = existingCategories.length
      ? `Существующие категории пользователя (переиспользуй подходящую, не выдумывай новую без необходимости): ${existingCategories.join(', ')}.`
      : 'У пользователя пока нет категорий — предложи подходящее короткое название.';

    const system = [
      'Ты — помощник учёта личных финансов. Пользователь пишет короткие фразы о тратах и доходах на русском.',
      'Извлеки из фразы: тип (доход income / расход expense), сумму (число), категорию и краткое описание.',
      'Примеры: «потратил 500 на кофе» → expense, 500, Еда, кофе. «зарплата 120000» → income, 120000, Зарплата, зарплата.',
      'Если фраза не описывает финансовую операцию — верни isTransaction=false и нули/пустые строки.',
      categoriesHint,
    ].join(' ');

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 512,
        system,
        messages: [{ role: 'user', content: text }],
        output_config: {
          format: { type: 'json_schema', schema: OUTPUT_JSON_SCHEMA },
        },
      });

      const jsonText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const result = parsedTransactionSchema.safeParse(JSON.parse(jsonText));
      if (!result.success) {
        this.logger.warn(`Ответ модели не прошёл валидацию: ${result.error.message}`);
        return null;
      }

      const parsed = result.data;
      if (!parsed.isTransaction || parsed.amount <= 0) {
        return null;
      }
      return parsed;
    } catch (error) {
      this.logger.error(`Ошибка парсинга через Claude: ${(error as Error).message}`);
      return null;
    }
  }
}
