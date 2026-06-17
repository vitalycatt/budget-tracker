import { z } from 'zod';
import { CategoryType } from '../entities/category.entity';

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Название обязательно')
    .max(100, 'Название слишком длинное'),
  icon: z.string().min(1, 'Иконка обязательна'),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Цвет должен быть в формате HEX (#RRGGBB)'),
  type: z.nativeEnum(CategoryType, {
    errorMap: () => ({
      message: 'Тип категории должен быть income или expense',
    }),
  }),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
