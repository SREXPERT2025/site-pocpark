# ROSPARK Frontend — Backend Integration Guide

Документ: `backend-integration-guide.md`  
Цель: подключить **реальную обработку лидов** (квиз) вместо текущей «симуляции».

---

## 1) Где находится точка интеграции

API endpoint квиза расположен в:

- `app/api/quiz/route.ts`

Фронтенд отправляет данные через:

- `fetch('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(...) })`
- файл: `app/components/forms/QuizForm.tsx`

---

## 2) Формат входящих данных (JSON)

На бэкенд приходит `application/json` со структурой, эквивалентной:

```json
{
  "name": "Иван",
  "phone": "+7 999 123-45-67",
  "objectType": "ТЦ / Бизнес-центр",
  "phoneNormalized": "79991234567",
  "source": "rospark-frontend",
  "timestamp": "2025-12-15T10:00:00.000Z"
}
```

> Примечание: поле `phoneNormalized` — это упрощённая нормализация для удобства CRM/бота.

---

## 3) Контракт ответа (что ждёт фронтенд)

Форма ожидает JSON:

- успех:
  ```json
  { "success": true, "message": "Заявка принята" }
  ```
- ошибка:
  ```json
  { "success": false, "message": "Причина ошибки" }
  ```

HTTP-коды:
- `200` для успеха
- `400/500` для ошибок (желательно)

---

## 4) Рекомендуемая схема: сервисный слой

Чтобы не превращать `route.ts` в «комбайн», рекомендуется вынести интеграции в `lib/lead-engine/*`:

- `lib/lead-engine/crm.ts`
- `lib/lead-engine/telegram.ts`
- `lib/lead-engine/email.ts`

`route.ts` оставляем как «шлюз»: валидация → вызов интеграций → ответ.

---

## 5) Пример: базовая валидация + фан-аут на интеграции

### 5.1. Обновлённый `app/api/quiz/route.ts` (пример)

```ts
import { NextResponse } from 'next/server';
import { sendToCrm } from '@/lib/lead-engine/crm';
import { sendToTelegram } from '@/lib/lead-engine/telegram';
import { sendToEmail } from '@/lib/lead-engine/email';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data?.name || !data?.phone) {
      return NextResponse.json(
        { success: false, message: 'name и phone обязательны' },
        { status: 400 }
      );
    }

    // Параллельная отправка
    await Promise.all([
      sendToCrm(data),
      sendToTelegram(data),
      sendToEmail(data),
    ]);

    return NextResponse.json({ success: true, message: 'Заявка принята' });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
```

---

## 6) Интеграция с CRM (пример через axios)

### 6.1. Установка

```bash
npm install axios
```

### 6.2. `lib/lead-engine/crm.ts`

```ts
import axios from 'axios';

export async function sendToCrm(lead: any) {
  const CRM_URL = process.env.CRM_URL!;
  const CRM_TOKEN = process.env.CRM_TOKEN!;

  // пример payload, адаптируйте под вашу CRM
  const payload = {
    name: lead.name,
    phone: lead.phoneNormalized ?? lead.phone,
    objectType: lead.objectType,
    source: lead.source,
    timestamp: lead.timestamp,
  };

  await axios.post(CRM_URL, payload, {
    headers: {
      Authorization: `Bearer ${CRM_TOKEN}`,
      'Content-Type': 'application/json',
    },
    timeout: 8000,
  });
}
```

### 6.3. Переменные окружения

```env
CRM_URL=https://crm.example.com/api/leads
CRM_TOKEN=***
```

---

## 7) Интеграция с Telegram (пример через node-telegram-bot-api)

### 7.1. Установка

```bash
npm install node-telegram-bot-api
```

### 7.2. `lib/lead-engine/telegram.ts`

```ts
import TelegramBot from 'node-telegram-bot-api';

let bot: TelegramBot | null = null;

function getBot() {
  if (bot) return bot;
  const token = process.env.TG_BOT_TOKEN!;
  bot = new TelegramBot(token, { polling: false });
  return bot;
}

export async function sendToTelegram(lead: any) {
  const chatId = process.env.TG_CHAT_ID!;
  const text =
`🟦 Новый лид с сайта ROSPARK
Имя: ${lead.name}
Телефон: ${lead.phone}
Тип объекта: ${lead.objectType}
Время: ${lead.timestamp}`;

  await getBot().sendMessage(chatId, text);
}
```

### 7.3. Переменные окружения

```env
TG_BOT_TOKEN=***
TG_CHAT_ID=123456789
```

---

## 8) Интеграция с Email (пример через nodemailer)

### 8.1. Установка

```bash
npm install nodemailer
```

### 8.2. `lib/lead-engine/email.ts`

```ts
import nodemailer from 'nodemailer';

export async function sendToEmail(lead: any) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM!,
    to: process.env.LEADS_TO_EMAIL!,
    subject: 'Новый лид с ROSPARK',
    text: `Имя: ${lead.name}
Телефон: ${lead.phone}
Тип объекта: ${lead.objectType}
Время: ${lead.timestamp}`,
  });
}
```

### 8.3. Переменные окружения

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=***
SMTP_PASS=***
SMTP_FROM="ROSPARK <no-reply@rospark.rf>"
LEADS_TO_EMAIL=leads@rospark.rf
```

---

## 9) Производственные рекомендации

1. **Rate limiting / anti-spam**: добавить простую защиту (IP rate limit, honeypot поле, CAPTCHA — по необходимости).
2. **Логи**: писать структурированные логи (JSON) в stdout для сбора в Loki/ELK.
3. **Retry**: для CRM/Email можно включить ретраи (например, через `p-retry`) либо вынести обработку в очередь (BullMQ).
4. **PII**: минимизировать хранение персональных данных; не логировать телефон в открытом виде при строгих требованиях комплаенса.
5. **CORS**: не нужен для `/api/quiz`, так как запрос идёт с того же домена (если не выносить API отдельно).

---

## 10) Быстрая проверка после интеграции

- В браузере: заполнить `/quiz`, отправить.
- Проверить:
  - Ответ API `200` и `success: true`
  - Доставка в CRM / Telegram / Email
  - Логи сервера
