import { z } from 'zod';
import { CategoryType } from '../entities/category.entity';

export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Название обязательно')
    .max(100, 'Название слишком длинное')
    .optional(),
  icon: z.string().min(1, 'Иконка обязательна').optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Цвет должен быть в формате HEX (#RRGGBB)')
    .optional(),
  type: z
    .nativeEnum(CategoryType, {
      errorMap: () => ({
        message: 'Тип категории должен быть income или expense',
      }),
    })
    .optional(),
});

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
