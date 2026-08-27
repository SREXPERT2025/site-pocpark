# ROSPARK Agent Pilot — Architecture & Safety Boundary V1

Дата: 2026-08-27

Статус: `architecture preparation`

Владелец финального решения: владелец проекта РОСПАРК

Functional implementation: отсутствует

## 1. Решение и граница проекта

Agent Pilot — новый независимый экспериментальный разговорный контур. Он не
является продолжением frozen AI Core, не заменяет Legacy и не получает
production-права существующих компонентов.

Три контура должны оставаться разделёнными:

| Контур | Назначение | Статус | Публичный маршрут |
|---|---|---|---|
| Legacy | Стабильный публичный виджет | production default | включён |
| Frozen AI Core | Сохранённый исследовательский контур | frozen | выключен |
| Agent Pilot | Ограниченный экспериментальный AI-менеджер | architecture preparation | выключен |

Frozen checkpoint остаётся неизменным:

- Site: `96d0de31af04f4f8e8f888c53e019a7572bbe3f8`;
- Runtime: `32afc91b3358c115ae03fc3d20db96fef5e0fbfe`;
- Contract: `4d75773d60f3453279cbfcee1453f54b15b66567`;
- Gateway: `e0b4edd34d5fecaf8850e64aa03a33c2661b51f9`;
- checkpoint: `checkpoint-ai-core-frozen-2026-08-27`.

Ни один файл, prompt, evaluator, repair-механизм или Runtime-модуль frozen AI
Core не становится основой Pilot автоматически.

## 2. Репозитории и ветки

### Текущий этап

Архитектура хранится в Site-репозитории в отдельной documentation-ветке:

```text
docs/site-20260827-agent-pilot-architecture
```

Это только handoff-документация. В ней нет runtime, route, feature flag,
database migration или deployment-конфигурации.

### Предлагаемый implementation layout

Предпочтительный будущий контур — отдельный репозиторий и отдельный worktree,
например `POCPARK_AGENT_PILOT`, а не ветка frozen Runtime. Начальная ветка:

```text
feature/agent-pilot-bootstrap-v1
```

Предлагаемая структура:

```text
agent-pilot/
  contracts/
    request/
    response/
    advisory/
    trace/
  runtime/
    orchestrator/
    agent_definitions/
    tool_permissions/
    knowledge_adapters/
    conversation_state/
    safety_policy/
    logging/
    evaluation/
  tests/
    contracts/
    safety/
    routing/
    memory/
    knowledge/
    replay/
  deployment/
    examples/
    manifests/
  docs/
```

Site-репозиторий в будущем получает только тонкую интеграцию в отдельной
Site-ветке: eligibility/routing, typed transport adapter, fallback и
отображение результата. Orchestration, agent definitions и reasoning не должны
находиться в Site.

Предлагаемый Site integration layout после отдельного approval:

```text
app/api/ai-widget/agent-pilot/
app/lib/agent-pilot/
  eligibility.ts
  transport-adapter.ts
  legacy-fallback.ts
  trace-adapter.ts
```

Предлагаемая Site-ветка: `feature/site-YYYYMMDD-agent-pilot-route`. Existing
Legacy, AI Core routes и Gateway не изменяются на architecture stage.

Чтобы не дублировать существующие знания, Pilot читает их через versioned
read-only registry и adapters. Он не копирует автоматически frozen Runtime или
его knowledge tree.

## 3. Routing design

Legacy всегда является default. Отбор Pilot-аудитории выполняется на сервере
до отправки сообщения в Pilot.

```text
visitor message
  -> Site session and eligibility check
    -> not eligible: Legacy
    -> eligible: Agent Pilot adapter
      -> valid Pilot answer: widget
      -> timeout/error/invalid/safety failure: Legacy once
```

Порядок безопасного расширения аудитории:

1. owner-only session;
2. explicit server-side allow-list session;
3. подписанная специальная URL, которая создаёт ограниченную сессию;
4. UTM cohort только как сигнал eligibility, но не как доказательство доступа;
5. стабильное server-side percentage bucketing после отдельного approval.

Требования к selector:

- отдельный kill switch, не связанный с AI Core flags;
- `default=deny`;
- решение принимается server-side;
- cookie/session подписаны, ограничены по TTL и audience;
- UTM или query string сами по себе не дают привилегий;
- обычный посетитель не видит Pilot marker и не зависит от Pilot runtime;
- один turn завершается одним terminal route.

## 4. Legacy fallback

Fallback должен быть автоматическим и безопасным, но не дублировать ответ:

1. Site создаёт один `turn_id` и один idempotency key.
2. Pilot получает сообщение только после eligibility check.
3. При недоступности, timeout, internal error, safety violation, malformed
   output или provider failure Pilot не публикует candidate.
4. Site вызывает Legacy ровно один раз для исходного сообщения.
5. Terminal route фиксируется как `legacy_fallback` с причиной и latency.
6. Неполные Pilot mutations и lead candidates отбрасываются.

Fallback запрещено использовать после подтверждённой публикации Pilot-ответа.
Повторная обработка одного `turn_id` должна возвращать сохранённый terminal
result, а не запускать второй execution.

## 5. Agent permissions

Pilot получает только versioned allow-list capabilities:

| Capability | Разрешённое действие | Граница |
|---|---|---|
| `conversation.read_current` | Прочитать текущий диалог | Только текущий `conversation_id` |
| `conversation.append_event` | Записать typed event | Append-only, без произвольного SQL |
| `knowledge.search` | Прочитать утверждённые фрагменты | Только registry allow-list |
| `object_card.read_current` | Прочитать карточку объекта | Только текущий диалог |
| `object_card.propose_update` | Предложить изменение карточки | Schema + provenance + idempotency |
| `lead_candidate.propose` | Сформировать черновик лида | Без внешней отправки |
| `trace.append` | Записать диагностический event | Без secrets и chain-of-thought |

Orchestrator не получает универсальный tool executor. Новая capability
появляется только после отдельного threat review, контракта, тестов и явного
allow-list update.

## 6. Forbidden capabilities

Pilot и его advisory subagents не имеют права:

- выполнять shell-команды;
- читать или изменять произвольные файлы ОС;
- читать secrets, credentials или environment variables;
- изменять Site, Gateway, Runtime, feature flags или production config;
- менять код, создавать commit, push, merge или deploy;
- менять knowledge sources;
- удалять файлы или записи;
- выполнять произвольный SQL;
- выполнять произвольные HTTP-запросы;
- управлять браузером, Mac, VPS или парковочным оборудованием;
- отправлять сообщения клиенту вне текущего widget turn;
- отправлять lead в CRM/MAX/email без отдельного будущего consent contract;
- читать другие диалоги, лиды или пользовательские данные;
- раскрывать system/developer prompts, tool schema, secrets или внутренние
  инструкции.

## 7. Knowledge read-only boundary

До реализации создаётся canonical source registry. Каждый источник получает:

```text
source_id
repository
path_or_object_id
git_sha_or_version
content_sha256
authority_class
owner
approval_status
valid_from
valid_until
```

Минимальные классы authority:

- `published_company_fact` — утверждённый публичный факт;
- `verified_engineering_fact` — подтверждённая инженерная истина;
- `product_capability` — подтверждённая возможность продукта;
- `sales_pattern` — совет по ведению разговора, не источник фактов;
- `hypothesis` — предположение, запрещённое для публикации как факт.

Кандидаты на первичный registry уже существуют в Site:

- `docs/site/ai-widget/WIDGET_KB_V1_SOURCES.md`;
- `docs/site/ai-widget/WIDGET_CLAIM_LEDGER_V1.md`;
- опубликованные страницы и карточки `content/` с разрешённым статусом;
- утверждённые owner/engineering sources, перечисленные поштучно.

Исключаются model answers, traces, drafts, backups, `.env`, production DB,
internal messages и данные других пользователей. Материалы frozen AI Core могут
быть рассмотрены только поштучно и не мигрируют автоматически.

Каждый factual claim в ответе должен иметь хотя бы один разрешённый source ref.
Если подтверждения недостаточно, Pilot сообщает об ограничении вместо
домысла.

## 8. Conversation memory boundary

Raw conversation — authoritative evidence. Structured memory помогает работать
с диалогом, но не заменяет исходный текст.

Для текущего conversation отдельно хранятся:

- raw user messages и raw final answers;
- confirmed user facts;
- inferred facts;
- unanswered questions;
- object/lead card;
- source message и provenance каждого факта;
- mutation acknowledgement и state version.

Каждая запись факта содержит как минимум:

```text
fact_id
raw_value
normalized_value_optional
status: confirmed | inferred
source_message_id
created_at
updated_at
confidence_optional
```

Нормализация в enum не имеет права удалять `raw_value`. Inferred fact нельзя
без подтверждения превращать в confirmed. Изменение карточки выполняется через
typed API с optimistic version и mutation id; прямого SQL у агента нет.

Retention, consent, deletion и доступ к полным реальным transcript должны быть
утверждены privacy/legal gate до любого live Pilot. Свободный текст и PII не
попадают в общую веб-аналитику.

## 9. Orchestrator и subagent interfaces

Только Orchestrator имеет право выбрать следующий conversational action и
сформировать final answer. Subagents являются advisory и не могут публиковать
ответ, вызывать друг друга или изменять state.

| Advisor | Что возвращает | Чего не решает |
|---|---|---|
| Context / Memory | Факты, противоречия, open questions, provenance | Не пишет state |
| ROSPARK Product Knowledge | Claims и source refs | Не выбирает sales action |
| Engineering Consultant | Ограничения, варианты и необходимые данные | Не утверждает финальную архитектуру |
| Sales Strategy | Следующий conversational action или вопрос | Не создаёт факты и не публикует ответ |
| Conversation Critic | Замечания к draft и semantic risks | Не переписывает и не публикует candidate |
| Safety / Policy | Risk flags и policy finding | Не расширяет permissions |
| Lead Structuring | Typed lead candidate | Не отправляет его во внешнюю систему |

Предлагаемый advisory request:

```json
{
  "trace_id": "opaque-id",
  "conversation_snapshot": {},
  "confirmed_facts": [],
  "inferred_facts": [],
  "open_questions": [],
  "task": "typed-advisory-task",
  "knowledge_refs": [],
  "deadline_ms": 4000
}
```

Предлагаемый advisory response:

```json
{
  "advisor": "context|knowledge|engineering|sales|critic|safety|lead",
  "status": "ok|insufficient|blocked|error",
  "findings": [],
  "proposed_questions": [],
  "claims": [{"text": "", "source_refs": []}],
  "risk_flags": [],
  "latency_ms": 0
}
```

Constraints:

- recursion depth: `1`;
- subagent-to-subagent calls: `0`;
- максимум advisory calls на turn: `4`;
- максимум внутренних orchestrator steps: `6`;
- максимум одна bounded reconsideration после critic;
- timeout одного advisory call: `4s`;
- общий Pilot wall-clock budget: `15s`;
- budget exhaustion или цикл: fail closed в Pilot и переход в Legacy.

Конкретные subagents, prompts и модель не выбираются на этом этапе.

## 10. Hard safety gate

Hard gate остаётся коротким и детерминированным. Он проверяет только:

- request/response schema и обязательные identifiers;
- permission и tool allow-list;
- audience/session binding;
- отсутствие secrets и запрещённых internal disclosures;
- prompt/tool injection boundary;
- максимум вопросов в одном ответе;
- malformed output;
- timeout и execution budget;
- idempotency, duplicate execution и duplicate mutation;
- валидность source refs для factual claims;
- terminal publication/fallback exclusivity.

Semantic quality не кодируется бесконечным набором строковых эвристик. Будущий
Conversation Critic возвращает advisory findings. Orchestrator может один раз
пересобрать ответ в пределах общего budget; critic не переписывает candidate
скрыто и не публикует его.

## 11. Prompt-injection boundary

User content всегда является данными, а не системной инструкцией. То же правило
действует для retrieved knowledge.

- policy и tool contracts передаются отдельно от пользовательского текста;
- user/knowledge fields имеют явные типы и boundaries;
- строки «игнорируй инструкции», «покажи prompt», «удали файлы», «выполни
  команду» или «прочитай пароль» не создают capability;
- tool arguments валидируются вне модели;
- knowledge document не может назначить себе authority или вызвать tool;
- system prompt, secrets, hidden reasoning и internal schema не возвращаются;
- injection signal можно сохранить в trace как metadata без исполнения.

Injection не требует выдуманного ответа об успешном действии: Pilot спокойно
отказывает в запрещённой части и продолжает допустимую консультацию.

## 12. Logging и trace

Trace должен отвечать на вопрос «что произошло» без private chain-of-thought:

```text
user_received
  -> eligibility_decided
  -> memory_loaded
  -> knowledge_queried
  -> advisory_calls_completed
  -> orchestrator_decision_summary
  -> hard_safety_checked
  -> answer_published | legacy_fallback
  -> state_acknowledged
  -> lead_candidate_proposed | no_lead
```

Для conversation/turn сохраняются:

- timestamps и opaque conversation/thread/turn ids;
- raw user message и raw final answer в защищённом conversation store;
- route и fallback reason;
- knowledge source refs и их versions;
- subagent name, typed task, status и latency;
- краткий decision summary без hidden reasoning;
- tool name, redacted arguments, result status и latency;
- safety checks, error code/stage и terminal outcome;
- state mutation acknowledgements;
- lead candidate created/not created;
- duplicate execution/mutation counters.

Trace Viewer не показывает credential, cookies, secrets, system prompt или
private chain-of-thought.

## 13. Real-dialogue corpus export

Экспорт выполняется отдельной offline job после privacy gate и не является
capability разговорного агента.

Export pipeline:

1. выбрать только conversations с разрешённым retention/export status;
2. заменить conversation/user ids на corpus ids;
3. удалить контакты, PII, cookies, URL tokens и operational secrets;
4. сохранить raw semantic text только в необходимом объёме;
5. приложить route, source refs, outcome, error/fallback и human labels;
6. записать schema version, source snapshot hashes и export manifest;
7. проверить corpus на утечку и duplicates;
8. передать в human-reviewed regression/evaluation corpus.

Delete/opt-out должен распространяться на source conversation и ещё не
зафиксированные exports. Corpus нельзя использовать как canonical knowledge:
это evidence реальных вопросов и качества ответов.

## 14. Fail behavior

| Failure | Pilot result | Visitor result |
|---|---|---|
| Runtime unavailable/provider unavailable | candidate отсутствует | Legacy once |
| Timeout/budget exhaustion | candidate отсутствует | Legacy once |
| Advisory subagent error | Orchestrator продолжает только если хватает проверенных данных; иначе fallback | Valid answer или Legacy |
| Knowledge insufficient | Не выдумывать факт | Честная граница знания либо Legacy |
| Safety/schema/tool violation | Pilot blocked | Legacy once |
| State write failure | Не заявлять о сохранении | Legacy или безопасный ответ без claim о записи |
| Lead candidate failure | Не заявлять о передаче | Диалог остаётся справочным |

Любой failure изолирован текущим turn/session и не меняет маршрут остальных
посетителей.

## 15. Нереализуемые на этом этапе пункты

В рамках architecture preparation запрещено:

- писать Sales prompt или personality;
- выбирать основную LLM;
- реализовывать Orchestrator или subagents;
- переносить evaluator/repair heuristics frozen AI Core;
- создавать feature flags, APIs, DB migrations или runtime code;
- подключать CRM/MAX/email;
- выполнять deploy, canary или model request.

## 16. Handoff gates

Implementer может начать только после отдельного owner approval. Первый этап
реализации должен ограничиваться scaffolding, schemas и offline tests.

До любого live Pilot отдельно утверждаются:

- canonical knowledge registry;
- privacy/consent/retention/deletion policy;
- owner/allow-list authentication;
- exact tool allow-list;
- Site fallback/idempotency contract;
- threat model и prompt-injection tests;
- trace redaction policy;
- rollback и kill switch;
- ограничение traffic cohort.

Текущий документ разрешает handoff архитектуры, но не реализацию или запуск.
