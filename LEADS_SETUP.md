# Лидогенерация: Email + Telegram (прод-конфиг)

## 1) Что уже реализовано
- Единый компонент формы `LeadForm`.
- API endpoint: `POST /api/lead`.
- Отправка: Email (SMTP) + Telegram (бот).
- UTM и технические поля добавляются автоматически (url, referrer, userAgent).

## 2) Настройка без правок кода
Все параметры задаются через переменные окружения (см. `.env.example`).

### Email
- `LEAD_EMAIL_TO` — 1 или несколько получателей через запятую.
- `LEAD_EMAIL_FROM` — опционально, иначе берётся первый адрес из `LEAD_EMAIL_TO`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` — параметры SMTP.

### Telegram
- `LEAD_TELEGRAM_BOT_TOKEN` — токен бота.
- `LEAD_TELEGRAM_CHAT_IDS` — один или несколько chat_id через запятую.
- `LEAD_TELEGRAM_TOPIC_ID` — (вариант 1) message_thread_id, если чат — форум (темы).
  Если не задано — сообщение уйдёт в общий поток чата.

## 3) Быстрая проверка
1. Запусти `npm run dev`.
2. Открой `/contacts` и любой лендинг из `/resheniya/...`.
3. Отправь тестовую заявку.
4. Проверь:
   - пришёл email на все адреса из `LEAD_EMAIL_TO`;
   - пришло сообщение в Telegram (и в тему, если задан `LEAD_TELEGRAM_TOPIC_ID`).

## 4) Полезные заметки
- Для `NEXT_PUBLIC_SITE_URL` всегда указывай протокол (`https://`).
- Для Telegram topic нужно, чтобы чат был супергруппой-форумом и бот имел право писать.
