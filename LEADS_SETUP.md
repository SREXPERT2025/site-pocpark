# Лиды с сайта: Email + Telegram (прод-режим, управляется через env)

Этот проект уже умеет отправлять заявки:
- на **Email** (через SMTP),
- в **Telegram** (через бота),
без необходимости менять код при смене получателей — только через переменные окружения.

Также кнопка **«Написать в Telegram»** на лендингах берёт ссылку из env.

---

## 1) Что реализовано в коде
- Компонент формы: `app/components/forms/LeadForm.tsx`
- API endpoint: `POST /api/lead` (Next.js route)
- Доставка лидов:
  - Email через SMTP
  - Telegram через Bot API
- Автосбор контекста: страница, referrer, userAgent, UTM.

---

## 2) Где и как задавать переменные окружения

### Локально (Mac / dev)
Next.js читает `.env.local` в корне проекта.

Создать/открыть файл через терминал:
```bash
cd /path/to/rospark-frontend
touch .env.local
nano .env.local
```

Проверить, что файл существует:
```bash
ls -la | grep .env
```

Важно: Finder обычно **скрывает файлы, начинающиеся с точки**, из‑за этого создаётся ощущение, что «системный файл нельзя создать». Создавайте через Terminal — это нормальный сценарий.

### Прод (сервер/хостинг)
На Vercel/Render/Docker/сервере переменные задаются в панели окружения или в `.env.production` (в зависимости от способа деплоя).
Логика сайта не требует правок кода — достаточно обновить env и перезапустить деплой.

---

## 3) Переменные окружения (актуальные имена)

Шаблон смотрите в `.env.example`. Ниже — расшифровка.

### 3.1 Кнопка «Написать в Telegram» (публичная)
- `NEXT_PUBLIC_TELEGRAM_CONTACT_URL` — ссылка, куда ведёт кнопка на лендингах.
  Примеры:
  - личный менеджер: `https://t.me/USERNAME`
  - общий корпоративный чат: `https://t.me/joinchat/...` (если есть публичная ссылка)
  - бот/аккаунт с deep-link: `https://t.me/YourBot?start=lead`

Если переменная **не задана**, кнопка на лендингах **не отображается** (чтобы не вести «в никуда»).

### 3.2 Email (SMTP)
- `LEAD_EMAIL_TO` — один или несколько адресов получателей (через запятую).
- `LEAD_EMAIL_FROM` — адрес отправителя (обычно тот же домен, что и SMTP-аккаунт).
- `LEAD_EMAIL_SUBJECT_PREFIX` — префикс темы письма.
- `LEAD_SMTP_HOST`
- `LEAD_SMTP_PORT` — обычно `587` (STARTTLS) или `465` (TLS).
- `LEAD_SMTP_USER`
- `LEAD_SMTP_PASS`
- `LEAD_SMTP_SECURE` — `true` для 465, `false` для 587.

### 3.3 Telegram (уведомления о лидах)
- `LEAD_TELEGRAM_BOT_TOKEN` — токен бота.
- `LEAD_TELEGRAM_CHAT_IDS` — куда слать уведомления (можно несколько chat_id через запятую).
- `LEAD_TELEGRAM_TOPIC_ID` — message_thread_id (если группа‑форум и нужно писать в конкретную тему). Опционально.

### 3.4 Антиспам (минимум)
- `LEAD_RATE_LIMIT_MAX` — максимум заявок с одного IP за окно.
- `LEAD_RATE_LIMIT_WINDOW_SEC` — окно в секундах.

---

## 4) Как получить Telegram bot token, chat_id и topic_id (вариант 1 — «Topic»)

### 4.1 Создать бота и получить токен
1. В Telegram открыть **@BotFather**
2. Команда: `/newbot`
3. Задать имя и username
4. BotFather выдаст токен вида:
   `123456789:AA...`

### 4.2 Подготовить группу и тему (если нужно)
1. Создать группу для лидов (рекомендовано отдельную).
2. Превратить в супергруппу и включить **Темы/Форум** (в настройках группы).
3. Добавить бота в группу и выдать право **писать сообщения**.

### 4.3 Получить `chat_id` и `topic_id` (самый простой способ)
**Способ A (рекомендую): через @RawDataBot**
1. Добавь **@RawDataBot** в нужную группу.
2. Напиши любое сообщение в группе.
3. RawDataBot пришлёт JSON — в нём будет:
   - `chat.id` — это `chat_id` (обычно отрицательный, типа `-100...`)
4. Если пишешь в **конкретной теме** (topic), RawDataBot покажет `message_thread_id` — это `topic_id`.

**Способ B: через Telegram Bot API (getUpdates)**
1. Напиши **любое** сообщение в группе, где есть бот (или лично боту).
2. Открой в браузере:
   `https://api.telegram.org/bot<ТОКЕН>/getUpdates`
   Пример:
   `https://api.telegram.org/bot123456789:AA.../getUpdates`

Важно:
- метод называется **getUpdates** (с буквой **s** на конце)
- без угловых скобок `< >`
- если `result` пустой — значит боту ещё не приходили новые сообщения
- если раньше был webhook, getUpdates вернёт конфликт — тогда:
  `https://api.telegram.org/bot<ТОКЕН>/deleteWebhook`

3. В ответе ищи:
   - `message.chat.id` → `chat_id`
   - `message.message_thread_id` → `topic_id` (если сообщение пришло из темы форума)

---

## 5) Шаблон тестового прогона (как убедиться, что всё работает)

### 5.1 Локальная проверка (dev)
1. Заполни `.env.local` по `.env.example`
2. Запусти:
```bash
npm i
npm run dev
```
3. Открой:
- `http://localhost:3000/contacts`
- любой лендинг из `/resheniya/...` (например `/resheniya/dlya-rukovoditeley`)
4. Отправь тестовую заявку.

Ожидаемый результат:
- email пришёл на все адреса из `LEAD_EMAIL_TO`
- Telegram сообщение пришло в группу/тему (если заданы `LEAD_TELEGRAM_CHAT_IDS` и `LEAD_TELEGRAM_TOPIC_ID`)
- Кнопка «Написать в Telegram» ведёт по `NEXT_PUBLIC_TELEGRAM_CONTACT_URL` (если задана)

### 5.2 API‑проверка без UI (curl)
```bash
curl -X POST http://localhost:3000/api/lead \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Тест",
    "phone":"+79990000000",
    "company":"ООО Тест",
    "objectType":"БЦ",
    "comment":"Проверка интеграции"
  }'
```

---

## 6) Частые ошибки и быстрые решения

- **404 Not Found** на Bot API:
  - проверь URL: `.../bot<token>/getUpdates` (не `getUpdate`)
  - токен должен быть ровно как дал BotFather, без пробелов и скобок

- **401 Unauthorized**:
  - токен неверный/подменённый

- **409 Conflict** (webhook set):
  - вызови `.../deleteWebhook`, затем снова `getUpdates`

- **result: []**:
  - отправь новое сообщение боту/в группу, чтобы появилась новая запись в updates

