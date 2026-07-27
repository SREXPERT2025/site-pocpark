# AI-виджет — выпуск на закрытый preview Mac Studio

Дата: 2026-07-27  
Контур: `https://srtestrealme.ru:3001`  
Production/VPS: не затрагивается.

## Граница выпуска

Разрешено:

- плавающий тестовый виджет на preview;
- локальный `qwen3.6:27b` через loopback gateway;
- точные FAQ, security-шаблоны и границы знаний;
- синтетические вопросы без реальных персональных данных.

Отключено:

- CRM и реестр лидов;
- MAX, email и любые внешние отправки;
- управление оборудованием;
- рабочий OpenClaw;
- публикация на VPS.

Дополнительной пользовательской авторизации нет по решению владельца. Это
исключение действует только для проверки продолжительностью один–три дня.

## Проверенный локальный контур

```text
браузер
→ Caddy :3001
→ Next.js 127.0.0.1:3100
→ POST /api/demo/ai-widget/chat
→ gateway 127.0.0.1:8787
→ Ollama 127.0.0.1:11434
→ qwen3.6:27b
```

Caddy разрешает из write-запросов только demo-session и AI chat. Gateway
принимает только loopback-запросы с server-to-server secret из
`.env.production.local`.

## Обязательные проверки до переключения

1. Чистая release-ветка и зафиксированный SHA.
2. `npm ci`, тесты, lint, typecheck и production build в отдельной staging
   директории.
3. Резервная копия текущего preview-приложения, env, Caddyfile и launchd-файлов.
4. `qwen3.6:27b` присутствует в локальном Ollama.
5. Gateway проходит authenticated health и deterministic FAQ smoke.
6. Caddyfile проходит `caddy validate`.
7. В новой env-конфигурации:
   - `AI_WIDGET_PILOT_ENABLED=true`;
   - origin равен `https://srtestrealme.ru:3001`;
   - gateway URL равен `http://127.0.0.1:8787`;
   - secret не выводится в журнал и имеет режим файла `600`.

## Переключение

1. Установить новую app-директорию атомарной заменой, сохранив действующую
   `.env.production.local`.
2. Применить `scripts/configure_ai_widget_pilot_env.mjs`.
3. Установить gateway wrapper и launchd plist из `ops/launchd`.
4. Запустить gateway и дождаться завершения прогрева модели.
5. Перезапустить Next.js preview.
6. Валидировать и reload Caddy с
   `ops/caddy/content-demo-preview.Caddyfile`.

## Acceptance после переключения

- `/demo` отвечает `200`;
- `/api/demo/ai-widget/status` возвращает `enabled: true`;
- кнопка открывает панель на desktop/mobile;
- `/admin` не содержит виджет;
- точный FAQ отвечает без модели;
- один открытый синтетический вопрос проходит через `qwen3.6:27b`;
- цена не содержит денежного ориентира;
- запрос внутренних инструкций получает security-шаблон;
- запрос передачи менеджеру сообщает, что ничего не сохранено;
- в gateway log отсутствуют тексты вопросов и ответов;
- внешних отправок — `0`.

Наблюдаемая локальная задержка:

- deterministic маршруты: `0–1 мс` внутри gateway;
- модельные ответы: примерно `16–82 с`;
- модель прогревается при старте и удерживается до `2 ч`.

## Быстрый rollback

1. Установить `AI_WIDGET_PILOT_ENABLED=false` и перезапустить Next.js — UI
   исчезнет без новой сборки.
2. Если требуется полный rollback, вернуть сохранённые app, env и Caddyfile,
   затем перезапустить прежние launchd jobs.
3. Остановить gateway job.

SQLite preview не переносится и не изменяется этим выпуском.
