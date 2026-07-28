# AI-WIDGET-4 — production acceptance

Дата: 28.07.2026

Статус: публичный production-контур опубликован и принят по техническому smoke

Production SHA:
`c65b1b3cee0eb946b2f28b7c59aeaf003681477c`

Production branch:
`release/demo-production-ready-20260723`

## Что опубликовано

- плавающий AI-консультант работает на публичных страницах РОСПАРК;
- тестовая маркировка и предупреждения закрытого preview удалены;
- `/admin` не получает публичный виджет;
- браузер обращается только к VPS API, адрес и secret Mac Studio ему не
  передаются;
- VPS вызывает отдельный production gateway Mac Studio через Tailscale HTTPS;
- диалоги журналируются в отдельной SQLite на VPS;
- имя и телефон сохраняются только в lead registry и не передаются модели;
- рабочая заявка назначается Сергею и ставится в существующий MAX outbox;
- cleanup AI-журнала выполняется отдельным systemd timer;
- fallback сохраняет возможность оставить заявку при недоступности gateway.

## Release и восстановление

- production переключён с
  `89c045d79535169527347c40c438971fb560995d` на
  `c65b1b3cee0eb946b2f28b7c59aeaf003681477c`;
- production build ID: `2P8tMH9DRii8ReaY5y4vH`;
- полный backup перед выпуском:
  `/root/rospark-backups/ai-widget-production-20260728T072301Z`;
- предыдущая сборка:
  `/var/www/rospark-release-builds/next-89c045d-20260728T072301Z`;
- hot rollback:
  `/var/www/rospark-release-builds/next-hot-89c045d`;
- backup Nginx перед изменением timeout:
  `/root/rospark-backups/nginx-rospark-before-ai-timeout-20260728T074804Z`.

## Подтверждённая инфраструктура

- PM2 `rospark-site` — `online`;
- lead outbox timer — `active`;
- lead cleanup timer — `active`;
- AI widget cleanup timer — `active`;
- authenticated gateway health:
  `{"status":"ok","runtime_mode":"production"}`;
- AI widget SQLite: mode `600`, `quick_check=ok`, migrations `1,2`;
- lead registry SQLite: mode `600`, `quick_check=ok`, migrations `1,2,3`;
- production readiness — `ready`;
- readiness check не создавал лид и не отправлял сообщения.

## HTTP и browser acceptance

- публичный `/api/ai-widget/status` сообщает `enabled=true`,
  `runtimeMode=production`, `handoffMode=live`, `loggingEnabled=true`;
- сохранённый ответ повторно выдан с `HTTP 200`, route `qwen36`, без fallback;
- desktop UI визуально проверен;
- mobile viewport `390 × 844` визуально проверен: кнопка, панель, быстрые
  вопросы, поле ввода и ссылка на политику доступны без горизонтального
  переполнения;
- `/admin/leads/login` содержит служебную форму входа и не содержит кнопку или
  панель публичного AI-консультанта.

## Первая production-заявка

Контрольная заявка, созданная владельцем через виджет:

- lead ID: `RSP-42254644`;
- источник: `ai_widget`;
- исходная страница:
  `/stati/gostevoy-dostup-na-parkovku`;
- назначена Сергею;
- запись MAX outbox: `sent`, `attempts=1`, `error=none`;
- worker: `claimed=1`, `sent=1`, `failed=0`, `dead=0`;
- отправка: `2026-07-28T07:47:09.094Z`;
- read-only проверка MAX API нашла сообщение в чате
  `РОСПАРК ОТДЕЛ ПРОДАЖ`;
- MAX message ID:
  `mid.ffffbf66ac16559e019fa7b1191173fc`;
- timestamp сообщения:
  `2026-07-28T07:47:09.201Z`;
- повторная отправка не выполнялась.

## Производительность

Первый uncached запрос route `qwen36` был обработан за `72610 ms`. Ответ
корректно сохранился в SQLite, но прежний Nginx timeout вернул браузеру `504`.

Для production proxy установлены:

```text
proxy_connect_timeout 10s;
proxy_send_timeout 120s;
proxy_read_timeout 120s;
```

После reload Nginx сохранённый ответ вернулся с `HTTP 200` за `0.057835 s`.
Это закрывает транспортный сбой, но не отменяет следующую продуктовую задачу:
сократить задержку первого содержательного ответа и чаще направлять типовые
вопросы в быстрые детерминированные маршруты.

## Следующие задачи

1. Провести ручную приёмку локального latency/quality hardening по
   `AI_WIDGET_LATENCY_QUALITY_V1_20260728.md`, затем собрать отдельный
   backup/staging/cutover release-пакет.
2. Сохранять в outbox внешний MAX message ID и целевой chat ID/title, чтобы
   факт доставки был виден в служебном интерфейсе без отдельного API-поиска.
3. Провести короткий review реальных диалогов и дополнить FAQ/маршрутизацию на
   Mac Studio.
4. Выполнить discovery интеграции с amoCRM; до неё локальный lead registry
   остаётся источником истины для сайта.
5. `SECURITY-RELEASE-2` сохранить последним этапом согласно решению владельца.
