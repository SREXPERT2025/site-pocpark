# РОСПАРК: состояние Production Release v1

Дата последней сверки: 24 июля 2026 года.

## Статус документа

Это фактологическая фиксация уже работающего production-контура, а не инструкция
по развёртыванию. При расхождении с предположениями первого выпуска в
`docs/deployment/AFTER_DEPLOY_GUEST_DEMO_MAX.md` приоритет имеет сначала
read-only проверка фактического VPS, затем этот документ.

Документация не является разрешением автоматически менять env, MAX, Nginx,
PM2, SQLite или зависимости.

## Release

- Статус: Production Release v1 и согласованный analytics/demo-growth update
  успешно выпущены.
- Release SHA: `c2a0e955b8747e3005da28e3fe9981f01fa45488`.
- Production branch: `release/demo-production-ready-20260723`.

## Production-окружение

- Node.js: `22`.
- Next.js: `14.2.35`.
- PM2: production-процесс запущен и работает.
- Nginx: используется в production-контуре.
- Яндекс Метрика: прямой consent-gated loader, счётчик `110980303`.
- Внешний loader Метрики разрешён только на production-host
  `www.xn--80aukedde.xn--p1ai`; localhost и тестовые host не отправляют
  данные во внешний счётчик.
- Production environment содержит
  `NEXT_PUBLIC_YANDEX_METRIKA_ID=110980303`; значение включено в production
  build.

## Подтверждённая работа

- Demo-система работает.
- `/`, `/demo`, три внутренних demo-сценария и `/privacy` отвечают `200`.
- Неавторизованный запрос к `/api/demo/requests` отвечает `401`.
- На странице бизнес-центров опубликован контекстный вход в три
  demo-сценария.
- У юридических страниц опубликованы собственные metadata и canonical.
- До согласия пользователя браузер не загружает ресурсы `mc.yandex.ru`.
- После `Принять` загружается `tag.js?id=110980303` и отправляется pageview.
- После изменения выбора на `Отклонить необязательные` страница
  перезагружается без ресурсов Метрики.
- В production-счётчике создано семь целей `ANALYTICS-001-C`.
- Прямое открытие `/demo/gostevaya-zayavka` отправляет одну цель
  `rospark_demo_scenario_view`.
- SPA-переход `/demo → /demo/gostevaya-zayavka` отправляет одну цель без
  дубля; параметры содержат `demo_name`, PII отсутствует.
- Локальный QA больше не загружает ресурсы `mc.yandex.ru` даже при сохранённом
  analytics consent.
- WhatsApp работает.
- MAX работает, реальная demo-заявка успешно доставлена.

Это подтверждает техническую доставку demo-заявки, но не означает, что:

- создан публичный MAX-канал для продвижения;
- замкнут CRM-процесс обработки `demo_feedback_leads`;
- назначены владелец, SLA и статусы обработки demo-лида;
- разрешены новые реальные отправки без отдельного подтверждения.

Analytics release также не означает, что уже:

- накоплены и подтверждены данные всех семи целей в отчёте Метрики;
- собрана сквозная demo-воронка и ежемесячный dashboard;
- назначен резервный администратор счётчика;
- замкнута связь `lead → assigned → contacted → closed`;
- накоплен достаточный объём данных для SEO/GEO-выводов.

## Проверка выпуска от 2026-07-24

- backup:
  `/root/rospark-backups/analytics-release-20260724T043201Z`;
- online backup SQLite: checksum и `PRAGMA quick_check` — успешно;
- migrations: `1–3`;
- `npm ci`, typecheck, lint и production build — успешно;
- production build: 100 маршрутов;
- PM2 `rospark-site`: `online`, Node.js `22.23.1`;
- локальный и публичный HTTP smoke — успешно;
- внешний browser consent smoke — успешно;
- browser console — без ошибок и предупреждений;
- SQLite после restart: `quick_check=ok`.

## Проверка analytics reliability release от 2026-07-24

- backup env и release state:
  `/root/rospark-backups/analytics-goals-20260724T051826Z`;
- fast-forward:
  `9ae9579c63dc8c3c7af96a1e46d87ee0081b56da` →
  `80d64da4b2cdd3b6af7f837709722db66702930d`;
- Node.js: `22.23.1`;
- `npm ci`, typecheck, lint, privacy smoke и production build — успешно;
- production build: 100 маршрутов;
- PM2 `rospark-site`: `online`;
- `/`, `/demo`, `/demo/gostevaya-zayavka` — `200`;
- `/api/demo/requests` без сессии — `401`;
- внешний browser smoke hard load / SPA — по одной цели без дублей;
- browser console — без ошибок и предупреждений;
- `npm ci` показал 13 известных audit findings (`1 moderate`, `12 high`);
  автоматическое обновление зависимостей не выполнялось.

## Проверка analytics host guard release от 2026-07-24

- backup env и release state:
  `/root/rospark-backups/analytics-host-guard-20260724T070217Z`;
- fast-forward:
  `80d64da4b2cdd3b6af7f837709722db66702930d` →
  `c2a0e955b8747e3005da28e3fe9981f01fa45488`;
- Node.js: `22.23.1`;
- `npm ci`, typecheck, lint, privacy smoke и production build — успешно;
- production build: 100 маршрутов;
- PM2 `rospark-site`: `online`;
- `/`, `/demo`, `/demo/gostevaya-zayavka` — `200`;
- `/api/demo/requests` без сессии — `401`;
- внешний browser smoke подтвердил загрузку публичной demo-страницы и
  `tag.js?id=110980303` на production-host;
- browser console — без ошибок;
- SQLite, Nginx, DNS, MAX, WhatsApp и зависимости не изменялись;
- `npm ci` показал 13 известных audit findings (`1 moderate`, `12 high`);
  автоматическое обновление зависимостей не выполнялось.

Накопительный PM2 error log содержит записи `Failed to find Server Action "x"`
без временных меток. Они не воспроизвелись в текущем HTTP/browser smoke, поэтому
не считаются подтверждённой ошибкой нового релиза, но должны проверяться по
новым timestamp при следующем production-наблюдении.

## SQLite

Текущая production-база SQLite находится внутри Git checkout:

```text
/var/www/rospark-site/.data/guest-requests.sqlite
```

Связанные WAL-файлы могут находиться рядом с основной базой:

```text
/var/www/rospark-site/.data/guest-requests.sqlite-wal
/var/www/rospark-site/.data/guest-requests.sqlite-shm
```

До отдельного согласованного переноса эти файлы нельзя удалять, перемещать или
копировать как обычные независимые файлы при работающем приложении.

## TODO production

Перенос SQLite подготовлен, но отложен по решению владельца от 2026-07-23:
текущая база исправна, свежий проверенный backup создан, production продолжает
работать со старым путём. Обновление зависимостей и связанный security audit
также перенесены на последний этап актуального roadmap. Условия возврата задач
описаны в
`docs/site/SITE_DEVELOPMENT_ROADMAP_20260723.md`.

1. Перед следующим крупным production-изменением вернуться к переносу SQLite в
   постоянный каталог вне Git checkout:

   ```text
   /var/lib/rospark-demo
   ```

2. Реализовать человекочитаемый Unicode-домен вместо Punycode в публичных
   сообщениях и отображаемых ссылках.

3. На последнем этапе обновить Next.js и другие зафиксированные production-
   зависимости.

4. После обновления зависимостей провести повторный security audit.

5. После каждого изменения production обновлять этот файл точным SHA, датой,
   фактическими путями и результатами smoke.

6. Для аналитики продолжить `ANALYTICS-001-C`: подтвердить накопление семи
   целей в интерфейсе Метрики и собрать dashboard без PII.

7. Для `LEAD-OPS-002` локально подготовлен L4 runbook, а read-only VPS
   preflight выполнен 2026-07-24. Production feature gates остаются выключены.
   Следующий изменяющий шаг требует отдельного maintenance window, backup и
   подтверждения staged L4.

## Связанные актуальные документы

- `docs/site/SITE_DEVELOPMENT_ROADMAP_20260723.md`;
- `docs/production/PROD_DATA_OPS_PLAN_20260723.md`;
- `docs/production/LEAD_OPS_L4_RUNBOOK_20260724.md`;
- `docs/site/AI_WIDGET_ROADMAP_20260723.md`;
- `docs/deployment/AFTER_DEPLOY_GUEST_DEMO_MAX.md`;
- `docs/site/ARCHITECTURE.md`;
- `docs/site/SITE_STRUCTURE.md`.
