# AI-WIDGET-4 — production candidate acceptance

Дата: 28.07.2026

Статус: локальный release candidate прошёл QA; VPS cutover не выполнен

Target SHA: commit, содержащий этот акт; после checkout проверяется через
`git rev-parse HEAD`

## Реализованный контур

- production UI без тестовой маркировки;
- отдельные production routes `/api/ai-widget/*`;
- legacy `/api/demo/ai-widget/*` возвращают `404` в production;
- production gateway profile на Mac Studio;
- реальный lead registry и связь лида с диалогом;
- default assignee Сергей, РОП;
- MAX outbox без прямой отправки из web request;
- семидневный transcript, четырнадцатидневные operational logs и
  шестидесятидневный lead retention;
- SQLite rate limit;
- fallback с сохранением формы заявки;
- общий просмотр Андреем и Сергеем, удаление только Андреем;
- production env configurator, readiness check, systemd cleanup и rollback
  runbook.

## Автоматические проверки

Node.js: `22.23.1`.

- typecheck — passed;
- lint — passed, 0 warnings;
- production build — passed, 107/107 routes;
- AI widget pilot tests — passed;
- transcript/log/migration/rate-limit tests — passed;
- gateway tests — 14/14 passed on Mac Studio; on a non-Mac staging host
  13 portable checks run and the one real legacy-cascade compatibility check
  is explicitly skipped because that read-only engine exists only on Mac
  Studio;
- preview env tests — passed;
- production env tests — passed;
- lead registry tests — passed;
- lead admin auth/roles/audit/export/deletion tests — passed;
- Caddy preview config validation — passed;
- `git diff --check` — passed.

## Gateway smoke

Production gateway на `127.0.0.1:8788` запущен локально с
`external_sends=false`.

- authenticated health:
  `{"status":"ok","runtime_mode":"production"}`;
- вопрос «Как вас зовут?» — route `conversation`, без test-copy;
- «Передайте заявку менеджеру» — route `crm`, предложение кнопки
  «Оставить заявку»;
- составной бюджетный сценарий для сотрудников — route `faq/FAQ-008`, а не
  ценовая граница;
- ответ содержит разрешённую ссылку
  `/vozmozhnosti/postoyannie-klienti`;
- тексты вопросов и ответов не попали в gateway operational log.

## Production-like site smoke

Локальная сборка была запущена в production mode с отдельными временными
SQLite и выключенной обработкой outbox.

- `/api/ai-widget/status` — `200`, `enabled=true`,
  `runtimeMode=production`;
- `/api/demo/ai-widget/status` — `404`;
- при недоступном gateway chat вернул безопасный fallback `200`;
- заголовки fallback: `route=fallback`, `lead-intent=live`;
- production UI визуально проверен в браузере;
- видимые заголовки: «Онлайн-консультация» и
  «AI-консультант РОСПАРК»;
- видимых test/closed-test предупреждений нет;
- форма последовательно спрашивает имя, телефон, объект и задачу;
- отдельное согласие и ссылка на политику присутствуют.

Отдельный изолированный smoke рабочей заявки ранее создал временный
`RSP-C17F1504`, назначил Сергею и поставил одну запись в локальный pending
outbox. Outbox processing был выключен; внешних отправок в MAX — `0`.

## Retention и readiness

- cleanup удалил одну просроченную сессию и turn;
- после cleanup: sessions `0`, turns `0`, `quick_check=ok`;
- production readiness на локальном HTTPS mock подтвердил:
  - widget migrations `1,2`;
  - lead migrations `1,2,3`;
  - обе SQLite `mode=600`;
  - обе SQLite `quick_check=ok`;
  - gateway `runtimeMode=production`;
  - `externalMessagesSentByCheck=0`.

Самоподписанный TLS и отключение проверки сертификата использовались только
в изолированном локальном smoke readiness-скрипта. Production-gate требует
нормальный доверенный сертификат и не разрешает отключать TLS verification.

## Оставшиеся gates

1. На Mac Studio и VPS подтвердить один target SHA этого release candidate.
2. Подключить утверждённый Tailscale-контур и получить точный закрытый HTTPS
   URL VPS → Mac Studio production gateway по
   `docs/deployment/AI_WIDGET_TAILSCALE_VPS_MAC_STUDIO.md`.
3. Проверить юридический текст ответственным за персональные данные.
4. Выполнить backup production.
5. Выполнить staged VPS cutover по runbook.
6. После технической acceptance отдельно разрешить одну контрольную заявку и
   одну отправку в MAX.

До закрытия этих пунктов release candidate нельзя называть опубликованным
production.
