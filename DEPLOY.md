# Деплой и Telegram Mini App

Гайд по выкладке проекта в прод и подключению Telegram Mini App.

## Архитектура прода

| Компонент | Где | Что отдаёт |
|---|---|---|
| **Бэкенд** (NestJS) | Render (web service) | API `https://<api>.onrender.com` + Telegram-бот (long-polling) |
| **БД** (PostgreSQL) | Render | данные |
| **Клиент** (React/Vite) | Vercel | Mini App `https://<client>.vercel.app` |

> ⚠️ **На проде `NODE_ENV=production` → dev-обход авторизации выключен.** Любой запрос к API
> требует валидный Telegram `initData`. Значит, клиент должен открываться **внутри Telegram**
> (через бота), а у бэкенда должен быть тот же `TELEGRAM_BOT_TOKEN`, что и у бота, открывающего Mini App.

---

## Шаг 1. Бэкенд + БД на Render

**Вариант А — Blueprint (рекомендуется).** В репозитории есть `render.yaml`.
1. Render Dashboard → **New → Blueprint** → выбрать этот репозиторий → Apply.
   Создадутся сервис `budget-tracker-api` и база `budget-tracker-db` (подключение к БД проставится автоматически).
2. После первого деплоя задать секреты в **Environment** сервиса (они помечены `sync: false`):
   - `TELEGRAM_BOT_TOKEN` — токен вашего бота (от @BotFather).
   - `ANTHROPIC_API_KEY` — ключ Claude API (для парсинга сообщений бота).
   - `CORS_ORIGIN` — URL клиента на Vercel, напр. `https://budget-tracker.vercel.app`.
3. Manual Deploy → Deploy latest commit (чтобы применились секреты).

**Вариант Б — вручную (если сервис уже создан).** В настройках сервиса:
- **Build Command:** `npm install --include=dev && npm run build:server`
  *(флаг `--include=dev` обязателен — иначе при `NODE_ENV=production` не поставится `nest`/`typescript` и сборка упадёт `nest: not found`)*
- **Start Command:** `npm run start:server`
- **Environment:** `NODE_ENV=production`, `DB_*` (от вашей БД), `TELEGRAM_BOT_TOKEN`,
  `ANTHROPIC_API_KEY`, `CORS_ORIGIN`, опц. `ANTHROPIC_MODEL` (default `claude-haiku-4-5`).
  `PORT` Render задаёт сам — сервер его читает.

> Схема БД создаётся автоматически (`synchronize: true`). Для прод-зрелости позже стоит
> перейти на миграции, но для старта достаточно.

---

## Шаг 2. Клиент на Vercel

В репозитории есть `vercel.json` (сборка из корня монорепо, SPA-rewrites).
1. Vercel → **Add New → Project** → импорт репозитория.
2. **Root Directory: оставить корень репозитория** (не `apps/client`!) — клиент берёт `@swt/shared`
   из `packages/shared` по vite-алиасу, поэтому нужен весь монорепо. `vercel.json` уже задаёт
   `buildCommand`/`outputDirectory`.
3. **Environment Variables:** `VITE_API_URL` = URL бэкенда на Render, напр.
   `https://budget-tracker-api.onrender.com`.
4. Deploy. Получите URL вида `https://<client>.vercel.app`.

После деплоя клиента **впишите его URL в `CORS_ORIGIN`** бэкенда (Render) и передеплойте бэкенд.

---

## Шаг 3. Telegram Mini App (бот уже создан)

1. **@BotFather** → `/mybots` → выбрать бота → **Bot Settings → Menu Button → Edit menu button URL**
   → указать URL клиента (`https://<client>.vercel.app`). (Альтернатива: `/setmenubutton`.)
2. Убедиться, что **тот же токен** этого бота задан в `TELEGRAM_BOT_TOKEN` на Render
   (валидация `initData` завязана на него).
3. (Опц.) Настроить имя/описание/иконку Mini App через `/setdescription`, `/setuserpic`.

> Кнопка-меню откроет клиент внутри Telegram; `@twa-dev/sdk` пришлёт `initData`, сервер его проверит
> по токену и авторизует пользователя. Онбординг (выбор базовой валюты) появится при первом входе.

---

## Шаг 4. Проверка

1. Открыть бота в Telegram → нажать кнопку-меню → должен загрузиться Mini App, пройти онбординг,
   создать счёт, внести операцию.
2. Написать боту текстом: «потратил 500 на кофе» → бот распарсит и спросит счёт (если их несколько)
   или сразу запишет (требуются `ANTHROPIC_API_KEY` и хотя бы один счёт).

---

## Переменные окружения (сводка)

**Бэкенд (Render)** — шаблон `apps/server/env.example`:
```
NODE_ENV=production
DATABASE_URL=               # подключение к БД; на Render даётся «Add from Database»
# (либо вместо DATABASE_URL — раздельные DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_DATABASE)
TELEGRAM_BOT_TOKEN=         # секрет (от @BotFather)
ANTHROPIC_API_KEY=         # секрет (sk-ant-api03-... из console.anthropic.com)
ANTHROPIC_MODEL=claude-haiku-4-5   # опционально
CORS_ORIGIN=https://<client>.vercel.app
# PORT — задаёт Render автоматически
```
> Код поддерживает оба способа: если задан `DATABASE_URL` — берётся он (приоритет), иначе раздельные `DB_*`.

**Клиент (Vercel):**
```
VITE_API_URL=https://<api>.onrender.com
```

---

## Замечания

- **Секреты не коммитим** — только в дашбордах. В репозитории под gitignore все `.env*` (кроме `*.example`).
- **Free-tier Render «засыпает»** при простое — бот на long-polling в это время неактивен и
  «проснётся» при первом HTTP-запросе. Для всегда-активного бота нужен платный инстанс
  или перевод бота на webhook (отдельный шаг).
- **Локальный запуск** — см. `apps/client/.env.local` (→ `http://localhost:3000`) и Docker-Postgres;
  на проде эти файлы не используются.
