import { CategoryType } from '../categories/entities/category.entity';

export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
}

/** Базовый набор категорий, создаётся при первом входе пользователя. */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Расходы
  { name: 'Еда', icon: '🍔', color: '#F97316', type: CategoryType.EXPENSE },
  { name: 'Транспорт', icon: '🚌', color: '#3B82F6', type: CategoryType.EXPENSE },
  { name: 'Жильё', icon: '🏠', color: '#8B5CF6', type: CategoryType.EXPENSE },
  { name: 'Развлечения', icon: '🎮', color: '#EC4899', type: CategoryType.EXPENSE },
  { name: 'Здоровье', icon: '💊', color: '#10B981', type: CategoryType.EXPENSE },
  { name: 'Покупки', icon: '🛍️', color: '#F59E0B', type: CategoryType.EXPENSE },
  // Доходы
  { name: 'Зарплата', icon: '💰', color: '#22C55E', type: CategoryType.INCOME },
  { name: 'Подарок', icon: '🎁', color: '#EF4444', type: CategoryType.INCOME },
  { name: 'Прочее', icon: '✨', color: '#6366F1', type: CategoryType.INCOME },
];
