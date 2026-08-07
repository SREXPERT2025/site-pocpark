# Production Fast Route Provenance & Context Gate V1.1

## Итог

- `fast_route_context_gate_ready`: `true`
- `boundary_shadow_ready`: `true`
- `production_switch_allowed`: `false`
- production gateway: `279d919820938e4ea87dcdd7a6138774df55f8c1`, PID `39849`, запуск `2026-08-07T08:06:57+03:00`
- новых запросов Qwen: `0`
- генераций клиентского ответа через Codex: `0`
- commit / push / deploy: не выполнялись

## Доказанная причина инцидента

Production-функция `boundary_for` воспроизвела `BND-003` и точный наблюдавшийся ответ без обращения к модели. Регулярное выражение BND-003 принимает отдельное слово `питания`. В production-порядке boundary возвращается до gateway-функции `_state_for`, поэтому предыдущий вопрос агента, связь `answer_to_previous_question` и факты проекта не учитывались. Исходный текст реплики сохраняется upstream-кодом сайта до gateway-вызова; фактическое выполнение этой записи на удалённом сайте не отражено в локальном gateway trace и поэтому не подменяется предположением.

## Исправленный порядок

Текущая реплика принимается только с подтверждением предварительной записи сайта, затем разрешается активный вопрос, обновляются проектные факты и legacy state. Только после этого быстрый кандидат проходит Context Gate и итоговую проверку темы/команды. Ответ на открытый вопрос имеет приоритет над context-dependent маршрутами.

## Проверка точного диалога

Реплика классифицирована как `answer_to_previous_question`, intent `provide_project_information`, action `remember_fact_and_continue`. Сохранены: отсутствие автоматизации, существующие шлагбаумы, силовое питание; control/network cabling оставлены `null`. Кандидат boundary заблокирован reason codes `open_question_answer_has_priority`, `project_fact_not_boundary_request`, `keyword_only_boundary_match`.

## Офлайн-аудит

- исторических сообщений: `85`
- Turn Ingestion Rate: `100.00%`
- Message Persistence Attestation Rate: `100.00%`
- State Fact Preservation Rate: `100.00%`
- Open Question Hijack Rate: `0.00%`
- Wrong-topic Fast Response Rate: `0.00%`
- Boundary Intent Precision: `100.00%`
- Route Provenance Coverage: `100.00%`
- Version Provenance Coverage: `100.00%`

Выполнено 66 новых тестов Context Gate и повторно 46 существующих gateway-тестов; всего 112, ошибок 0.

Важная граница: режим `shadow_only` подготовлен безопасно, но текущий production gateway не вызывает Sales Conversation Controller. После блокировки boundary-кандидата видимый ответ в этой ветке формирует существующий основной путь `qwen36`. Подключение Controller требует отдельной интеграционной задачи и не маскируется телеметрией.

## Границы изменения

Qwen prompt, Sales Conversation Controller, Decision Package V1.2, Engineering Decision Laboratory, Response Repair и Evaluation Integrity не изменялись. Production 8788 не останавливался и не перезапускался. Подготовлен только режим `shadow_only`; его включение требует отдельного одобрения владельца и отдельного контролируемого релиза.
