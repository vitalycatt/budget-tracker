# Smart Wallet Tracker - Backend

Backend API для приложения Smart Wallet Tracker, построенный на NestJS, TypeScript, PostgreSQL и Zod.

## 🛠 Технологии

- **Node.js** - среда выполнения
- **TypeScript** - язык программирования
- **NestJS** - фреймворк для Node.js
- **PostgreSQL** - база данных
- **TypeORM** - ORM для работы с базой данных
- **Zod** - валидация данных

## 📋 Требования

- Node.js (v18 или выше)
- PostgreSQL (v12 или выше)
- npm или yarn

## 🚀 Установка

1. Установите зависимости:

```bash
cd server
npm install
```

2. Создайте файл `.env` на основе `env.example`:

```bash
cp env.example .env
```

3. Настройте переменные окружения в файле `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=smart_wallet_tracker

PORT=3000
NODE_ENV=development

CORS_ORIGIN=http://localhost:8080,http://localhost:5173
```

`CORS_ORIGIN` принимает список адресов через запятую. Это удобно, когда UI
может запускаться на разных портах (например, `8080` для nginx/vite preview
и `5173` для Vite dev server).

4. Создайте базу данных PostgreSQL:

```sql
CREATE DATABASE smart_wallet_tracker;
```

5. Запустите приложение:

```bash
# Режим разработки
npm run start:dev

# Продакшн режим
npm run build
npm run start:prod
```

## 📡 API Endpoints

### Категории (Categories)

- `GET /categories` - Получить все категории
- `GET /categories/:id` - Получить категорию по ID
- `POST /categories` - Создать категорию
- `PATCH /categories/:id` - Обновить категорию
- `DELETE /categories/:id` - Удалить категорию

### Счета (Accounts)

- `GET /accounts` - Получить все счета
- `GET /accounts/:id` - Получить счет по ID
- `POST /accounts` - Создать счет
- `PATCH /accounts/:id` - Обновить счет
- `DELETE /accounts/:id` - Удалить счет

### Транзакции (Transactions)

- `GET /transactions` - Получить все транзакции
- `GET /transactions?type=income` - Получить транзакции по типу (income/expense)
- `GET /transactions/:id` - Получить транзакцию по ID
- `POST /transactions` - Создать транзакцию (автоматически обновляет баланс счета)
- `DELETE /transactions/:id` - Удалить транзакцию (автоматически откатывает баланс счета)

## 📝 Примеры запросов

### Создать категорию

```bash
POST /categories
Content-Type: application/json

{
  "name": "Продукты",
  "icon": "🛒",
  "color": "#FFE66D"
}
```

### Создать счет

```bash
POST /accounts
Content-Type: application/json

{
  "name": "Основная карта",
  "type": "card",
  "balance": 50000,
  "color": "#BFFF00"
}
```

### Создать транзакцию

```bash
POST /transactions
Content-Type: application/json

{
  "type": "expense",
  "amount": 1500,
  "categoryId": "uuid-категории",
  "accountId": "uuid-счета",
  "description": "Электричество",
  "date": "2024-01-15T10:00:00Z"
}
```

## 🔒 Валидация

Все входящие данные валидируются с помощью Zod схем. При ошибке валидации возвращается статус 400 с описанием ошибок.

## 🗄 База данных

В режиме разработки (`NODE_ENV=development`) TypeORM автоматически синхронизирует схему базы данных. В продакшене рекомендуется использовать миграции.

## 📦 Структура проекта

```
server/
├── src/
│   ├── accounts/          # Модуль счетов
│   ├── categories/        # Модуль категорий
│   ├── transactions/      # Модуль транзакций
│   ├── config/            # Конфигурация
│   ├── app.module.ts      # Главный модуль
│   └── main.ts            # Точка входа
├── package.json
├── tsconfig.json
└── README.md
```

## 🧪 Тестирование

```bash
# unit тесты
npm run test

# e2e тесты
npm run test:e2e

# покрытие кода
npm run test:cov
```

## 📄 Лицензия

MIT
