# PUBLIC AI CORE — Site publication path forensic

Дата: 2026-08-12

Production Site evidence SHA: `c96df0a27c88048a7c84d7c254a5b1cea3919a9e`

Runtime SHA: `b29fa052e278e04adefcc1e18788427ee83d5b8c`

Contract SHA: `6cd71a5596346925ecdd2ffeb9d45262d881ee93`

## Решение по исходной гипотезе

Исходная формулировка «Runtime не был достигнут, а Site опубликовал старый
кандидат» опровергнута первичными данными. Оба запроса дошли до gateway и
получили HTTP 200:

- `aicore_49de9787-c3a3-4b3f-a010-b6e18f6492a3`: HTTP 200, 23479 мс;
- `aicore_1ec3fcdc-bc8d-4d3f-8904-c0294602b6fc`: HTTP 200, 12713 мс.

Источник: локальный production gateway log, строки 237–238. Exact Site traces
сохранены неизменными в `scripts/fixtures/public_ai_core_incident_a_20260812.json`
и `scripts/fixtures/public_ai_core_incident_b_20260812.json`.

## Incident A

### Транспорт

Класс исходного отказа `runtime_transport` был ложным. Фактический класс:
`runtime_observability_loss_after_http_200`. Site получил действительный HTTP
ответ, но `validateObservabilityTrace` вернул `null`; старый trace composer
интерпретировал любое отсутствие детального Runtime trace как «Runtime не
достигнут». Историческое тело Runtime envelope не сохранялось, поэтому
доказательно разделить «поле отсутствовало» и «поле не прошло SHA/schema
validation» задним числом нельзя.

Endpoint был текущим `/v1/owner-ai-core` через настроенный публичный gateway.
Запрос содержал `X-AI-Core-Runtime-SHA`, `X-AI-Core-Contract-SHA`,
`X-Request-Id` и Bearer-аутентификацию. HTTP 200 подтверждает, что TCP,
маршрутизация и аутентификация не дали наблюдаемого транспортного отказа.

### Происхождение опубликованного текста

Текст не был старым или чужим кэшем. Это `response.answer` текущего Runtime
envelope для `aicore_49de9787-c3a3-4b3f-a010-b6e18f6492a3`.

Путь выбора:

1. `callPublicAiCoreRuntime(coreRequest)` получил текущий HTTP 200;
2. response correlation прошла по `request_id`, `idempotency_key` и
   `request_payload_hash`;
3. Site взял `response.answer`;
4. после state mutation transaction ответ был записан в history/cache и
   опубликован как `raw_qwen`.

У fresh thread кэш был пуст. Cache lookup использует составной ключ
`conversation_thread_id + message_id + idempotency_key`; совпадения по одному
thread, route или Runtime SHA нет. Originating historical turn отсутствует:
origin — текущий Incident A.

Следствие: семантически плохой greeting был разрешён Runtime evaluator. Это
отдельный Runtime semantic defect; данное Site-only исправление его не скрывает
и не меняет Runtime.

## Incident B

Запрос также дошёл до Runtime и получил HTTP 200. Ошибка возникла после ответа,
в Site adapter при `validateRestrictedForensic`: сравнивались
`repair.applied/method/reason_codes` restricted evidence и одноимённые поля
pre-gate telemetry. Экспортированный Site trace не содержит историческое тело
Runtime envelope, поэтому точное различающееся значение доказательно
восстановить нельзя. Код ошибки доказывает один из двух repair equality
predicates, но не позволяет выбрать конкретный без выдумывания.

Главный scope defect: owner-only strict restricted-forensic equality применялся
к public route. Теперь public non-pass остаётся fail-closed по
`AI_CORE_FINAL_GATE_BLOCKED` и сохраняет безопасную forensic-проекцию; строгая
проверка полного restricted forensic остаётся в owner route.

Плохой assistant turn был передан Runtime в history, но нет evidence, что он
единолично вызвал repair mismatch. Поэтому causal status: `not_proven`.

## Изменение Site

- Добавлен явный publication predicate с привязкой к текущим request, thread,
  message, idempotency payload hash, Runtime/Contract pins, evaluation pass и
  publication allowed.
- Cache повторно валидируется против текущего request перед выдачей.
- Public blocked response больше не проходит owner-only forensic equality.
- Транспорт сохраняет безопасное evidence: endpoint, request body SHA,
  ожидаемые pins, outcome, HTTP status и error class; секреты не сохраняются.
- HTTP 200 без валидного detailed Runtime trace больше не обозначается как
  «not reached». Runtime stages маркируются как unobserved, а Site response
  rejection — как `site_response_validation`.
- Site publication trace содержит `candidate_provenance` с request/thread/
  message identity и release pins.

## Проверка

- Exact incident evidence: 2/2 immutable SHA verified.
- Новый publication-path regression: 23/23, включая exact two-turn shape.
- Trace Viewer: 16/16.
- Public AI Core cutover: pass.
- Owner AI Canary: pass.
- TypeScript: pass.
- lint: pass.
- build `--webpack`: pass после создания immutable commit.
- model requests: 0.
- production changes: 0.

## Ограничение допуска

Site candidate безопасен для последовательного Site-only review/deployment по
точному SHA, но это не означает, что greeting Incident A станет хорошим:
Runtime уже пропустил этот текущий ответ как допустимый. Перед повторным
включением Public требуется отдельное решение владельца по Runtime greeting
semantics либо подтверждение, что активный Runtime уже содержит этот fix.
