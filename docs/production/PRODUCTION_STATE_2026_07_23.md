# РОСПАРК: состояние Production Release v1

Дата фиксации: 23 июля 2026 года.

## Статус документа

Это фактологическая фиксация уже работающего production-контура, а не инструкция
по развёртыванию. При расхождении с предположениями первого выпуска в
`docs/deployment/AFTER_DEPLOY_GUEST_DEMO_MAX.md` приоритет имеет сначала
read-only проверка фактического VPS, затем этот документ.

Документация не является разрешением автоматически менять env, MAX, Nginx,
PM2, SQLite или зависимости.

## Release

- Статус: Production Release v1 успешно завершён.
- Release SHA: `881ff3cf846ae270042ccf5f55e281d98b124145`.
- Production branch: `release/demo-production-ready-20260723`.

## Production-окружение

- Node.js: `22`.
- Next.js: `14.2.35`.
- PM2: production-процесс запущен и работает.
- Nginx: используется в production-контуре.

## Подтверждённая работа

- Demo-система работает.
- WhatsApp работает.
- MAX работает, реальная demo-заявка успешно доставлена.

Это подтверждает техническую доставку demo-заявки, но не означает, что:

- создан публичный MAX-канал для продвижения;
- замкнут CRM-процесс обработки `demo_feedback_leads`;
- назначены владелец, SLA и статусы обработки demo-лида;
- разрешены новые реальные отправки без отдельного подтверждения.

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

## Связанные актуальные документы

- `docs/site/SITE_DEVELOPMENT_ROADMAP_20260723.md`;
- `docs/production/PROD_DATA_OPS_PLAN_20260723.md`;
- `docs/site/AI_WIDGET_ROADMAP_20260723.md`;
- `docs/deployment/AFTER_DEPLOY_GUEST_DEMO_MAX.md`;
- `docs/site/ARCHITECTURE.md`;
- `docs/site/SITE_STRUCTURE.md`.
