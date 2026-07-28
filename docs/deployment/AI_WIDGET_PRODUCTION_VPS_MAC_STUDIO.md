# AI-виджет РОСПАРК — production-runbook VPS + Mac Studio

Дата: 28.07.2026

Статус: релизный пакет подготовлен локально, production cutover не выполнен

Публичный сайт: `https://www.роспарк.рф`
AI-контур: Mac Studio

## 1. Что выпускается

- публичный плавающий AI-консультант без упоминаний тестового режима;
- production API `/api/ai-widget/status`, `/chat` и `/lead`;
- полный журнал диалогов на VPS со сроком хранения до семи дней;
- рабочая заявка с именем, телефоном, объектом, задачей и отдельным согласием;
- автоматическое назначение Сергею, РОП;
- общая видимость диалогов и лидов для Андрея и Сергея;
- безвозвратное удаление только для Андрея;
- уведомление через существующий lead outbox в MAX;
- постоянный SQLite rate limit;
- аварийное предложение оставить заявку при недоступности Mac Studio;
- отдельный production-профиль ответов на Mac Studio.

Виджет не получает доступ к терминалу, файлам, браузеру, оборудованию,
OpenClaw `main`, данным других посетителей и произвольным сетевым запросам.
Имя и телефон не передаются AI-модели.

## 2. Два независимых процесса на Mac Studio

| Контур | Loopback | Режим | Env |
|---|---:|---|---|
| Preview `srtestrealme.ru` | `127.0.0.1:8787` | `preview` | `.env.production.local` |
| Публичный VPS | `127.0.0.1:8788` | `production` | `.env.ai-widget-production.local` |

Для production используются:

- `ops/launchd/run_rospark_ai_widget_gateway_production.sh.template`;
- `ops/launchd/com.pocpark.rospark-ai-widget-gateway-production.plist.template`;
- `AI_WIDGET_GATEWAY_MODE=production`;
- отдельный секрет длиной не менее 32 байт.

Оба процесса могут использовать локальный `qwen3.6:27b`. Production gateway
при старте обязан вернуть authenticated health:

```json
{"status":"ok","runtime_mode":"production"}
```

## 3. Обязательный закрытый HTTPS-канал

VPS не может обращаться к loopback Mac Studio напрямую. До cutover нужен один
точный HTTPS URL, который:

1. доступен с VPS;
2. проксирует только `/health` и `/v1/chat` на `127.0.0.1:8788`;
3. ограничен private network или IP-allowlist VPS;
4. требует тот же bearer secret;
5. не публикуется в браузерном JavaScript и пользовательских ответах;
6. имеет корректный доверенный TLS-сертификат.

Принятый вариант — закрытая сеть Tailscale между VPS и Mac Studio и
`Tailscale Serve` на Mac Studio:

- production gateway остаётся на `127.0.0.1:8788`;
- `Tailscale Serve` принимает HTTPS только внутри tailnet и проксирует его на
  loopback gateway;
- Tailscale grant разрешает `tcp:443` только от production VPS к production
  gateway;
- bearer secret остаётся вторым независимым уровнем проверки;
- Tailscale Funnel не используется.

Пошаговая настройка и проверки описаны в
`docs/deployment/AI_WIDGET_TAILSCALE_VPS_MAC_STUDIO.md`.

Нельзя открывать `8788` напрямую в интернет, включать Tailscale Funnel для
этого сервиса или использовать внешний HTTP-адрес между VPS и Mac Studio.

Точный URL вида `https://<machine>.<tailnet>.ts.net` появляется после
подключения Mac Studio и включения Tailscale HTTPS. Его нельзя зашивать в
репозиторий: он передаётся только через
`AI_WIDGET_PRODUCTION_GATEWAY_URL` при настройке VPS.

## 4. Gate до любых изменений production

1. Зафиксировать target SHA и убедиться, что staging worktree чистый.
2. На Node.js 22 пройти:
   - typecheck;
   - lint без предупреждений;
   - production build;
   - AI widget, lead registry и lead admin tests;
   - `git diff --check`.
3. Проверить production-профиль gateway:
   - нет фраз «закрытый тест», «тестовая заявка» и запрета вводить данные;
   - composite-сценарий «бюджетный вариант для сотрудников» не уходит в
     ценовой шаблон;
   - универсальная оговорка не добавляется к каждому ответу;
   - CRM intent предлагает кнопку реальной заявки.
4. Подтвердить актуальность текста политики и согласия ответственным за
   персональные данные.
5. Проверить доступность закрытого HTTPS gateway с VPS.

При невыполнении любого пункта переключение останавливается.

## 5. Backup до cutover

Сохранить в каталоге с режимом `700`, а файлы — `600`:

- текущую `.env.production`;
- `git rev-parse HEAD` и ветку;
- online backup `.data/guest-requests.sqlite`;
- online backup `/var/lib/rospark-leads/lead-registry.sqlite`;
- online backup `/var/lib/rospark-ai-widget/dialogs.sqlite`, если база уже
  существует;
- действующую `.next` как rollback build;
- установленные systemd unit-файлы lead outbox и cleanup.

Для каждого backup создать SHA-256 и проверить SQLite `quick_check` и
`foreign_key_check`. Файл контрольных сумм не должен включать сам себя.

## 6. Подготовка Mac Studio

1. Собрать production gateway из того же target SHA.
2. Создать `.env.ai-widget-production.local` с режимом `600`:

```text
AI_WIDGET_GATEWAY_SECRET=<отдельный production secret>
AI_WIDGET_GATEWAY_MODE=production
```

3. Материализовать production launchd templates с абсолютными путями.
4. Проверить plist и wrapper, затем запустить отдельный job.
5. Проверить локальный authenticated `/health` на `127.0.0.1:8788`.
6. Проверить через закрытый HTTPS URL с VPS.
7. Убедиться, что preview-процесс `8787` продолжает работать независимо.

Secret нельзя выводить в терминальный журнал, историю команд, git или MAX.

## 7. Подготовка VPS

1. Создать `/var/lib/rospark-ai-widget` с владельцем процесса сайта и режимом
   `700`.
2. Выполнить staging build target SHA отдельно от действующей production.
3. Передать в процесс настройки без вывода в журнал:
   - `AI_WIDGET_PRODUCTION_GATEWAY_URL`;
   - `AI_WIDGET_GATEWAY_SECRET`;
   - при необходимости `AI_WIDGET_RATE_LIMIT_SECRET`.
4. Запустить `scripts/configure_ai_widget_production_env.mjs` против
   `/var/www/rospark-site/.env.production`.
5. Проверить, что установлены:

```text
AI_WIDGET_ENABLED=true
AI_WIDGET_RUNTIME_MODE=production
AI_WIDGET_ALLOWED_ORIGINS=https://www.роспарк.рф
AI_WIDGET_HANDOFF_MODE=live
AI_WIDGET_LOGGING_ENABLED=true
AI_WIDGET_LOG_DB_PATH=/var/lib/rospark-ai-widget/dialogs.sqlite
LEAD_REGISTRY_ENABLED=true
```

6. Установить cleanup service/timer из `ops/systemd` и проверить их через
   `systemd-analyze verify`.
7. Не запускать lead outbox вручную и не создавать контрольную заявку до
   отдельного разрешения на первую отправку в MAX.

## 8. Cutover

1. Атомарно переключить production-код на target SHA и готовую `.next`.
2. Перезапустить только приложение сайта.
3. Дождаться `online` в PM2.
4. Первым безопасным GET открыть `/api/ai-widget/status`.
5. Инициализировать журнал одним справочным вопросом без персональных данных.
6. Запустить `npm run ai-widget-production:check`.
7. Проверить публичные страницы desktop/mobile и отсутствие виджета в
   `/admin`.

Readiness check ничего не отправляет в MAX и сообщает
`externalMessagesSentByCheck: 0`.

## 9. Acceptance без внешней отправки

- заголовок: `AI-консультант РОСПАРК`;
- подпись: `Онлайн-консультация`;
- нет видимых слов «тест», «закрытый тест» и предупреждения о вымышленных
  данных;
- во время ответа показывается `Готовлю ответ` и анимация трёх точек;
- ссылки из allowlist кликабельны;
- при недоступности Mac Studio остаётся кнопка заявки;
- имя, номер телефона, объект, задача и согласие обязательны;
- политика и отдельное согласие открываются по ссылкам;
- Андрей и Сергей видят все диалоги и связанные рабочие заявки;
- Сергей не видит действие безвозвратного удаления;
- CSV доступен обеим ролям;
- SQLite `quick_check` и `foreign_key_check` чистые;
- cleanup timers активны.

## 10. Первая реальная заявка и MAX

Это отдельный gate после технической acceptance:

1. получить явное разрешение владельца на одну контрольную production-заявку;
2. в имени и задаче указать `TEST`, чтобы отдел продаж сразу видел назначение;
3. до запуска outbox убедиться, что pending ровно один и старого backlog нет;
4. разрешить одну обработку outbox;
5. подтвердить одну доставку в MAX и `status=sent`, `attempts=1`;
6. назначить Сергею и закрыть с результатом «Тест».

Нельзя массово отправлять накопленный outbox.

## 11. Rollback

Быстрый безопасный rollback без потери уже созданных заявок:

1. установить `AI_WIDGET_ENABLED=false`;
2. перезапустить приложение;
3. убедиться, что UI и публичные AI routes недоступны;
4. оставить lead registry и lead outbox работающими;
5. сохранить AI widget SQLite для диагностики;
6. при необходимости вернуть rollback `.next` и прежний target SHA;
7. production gateway на Mac Studio остановить только после исчезновения
   публичного UI.

Созданные клиентами лиды не удаляются при rollback виджета.
