# Owner Canary blocked-turn forensic V1

## Статус и граница

`OWNER_CANARY_BLOCKED_FORENSIC_V1` — отдельное versioned расширение к
Site↔Runtime Contract 1.1. Оно не меняет Contract SHA
`6cd71a5596346925ecdd2ffeb9d45262d881ee93` и не добавляет поля в основной
Runtime response schema. Расширение переносится в доверенной server-to-server
оболочке `restricted_forensic` только для authenticated owner-canary turn,
который заблокирован final publication gate.

Site продолжает fail-closed проверять exact Runtime/Contract/canonicalization
pins, корреляцию `ai_core_request_id`, структуру доказательства и его
`evidence_sha256`. Отсутствующее, неподдерживаемое или повреждённое
доказательство не публикуется владельцу и не маскируется legacy-маршрутом.

## Содержимое restricted evidence

Расширение сохраняет:

- resolved intent/action и структурную сводку фактов текущего turn;
- Controller action;
- сводку Lab Decision Package и Decision Package SHA;
- Projection SHA и semantic coverage до/после repair;
- сырой Qwen answer и число executor requests;
- признак repair, repaired answer и reason codes;
- raw/final evaluator status и reason codes;
- сводку предложенных mutations без значений state patch;
- publication candidate status и точный blocking predicate.

Исходный user message не является полем этого контракта. Cookies,
credentials, bearer/API tokens, пароли, private keys и иные secrets запрещены
валидаторами Runtime и Site.

## Хранение и retention

Site сохраняет evidence отдельно от основной dialog/Site B базы:

`/var/lib/rospark-ai-widget/owner-forensics.sqlite`

- каталог: mode `0700`;
- SQLite, WAL и SHM: mode `0600`;
- публичного API/маршрута чтения нет;
- ключ корреляции: `ai_core_request_id`;
- fixed TTL: 7 суток;
- expired rows удаляются при открытии, записи и внутреннем чтении;
- повторная запись идентичного evidence idempotent;
- другая запись под тем же request ID fail-closed.

Обычные Site B события `turn_accepted`, `answer_completed`, `answer_error`
семантически не меняются. Они содержат только безопасные correlation IDs и
`runtime_telemetry_ref`; полный user text, raw Qwen answer и repaired answer в
Site B не записываются.

## Release sequencing

Offline Runtime reference candidate для handoff был зафиксирован как
`ffebf19244617f6ae67625a99ef177212f61dfe5`. Финальный independently accepted
merge semantic fix + forensic extension зафиксирован exact commit
`deec5a4ce86af17c952d7d21761050ba717b8994` (Runtime `1.2.3`). Site принимает
только этот exact Runtime SHA вместе с pinned Contract и canonicalization.
Production activation этим документом не разрешается и требует отдельного gate.

UI-артефакт `Â·` вместо `·` относится к presentation/encoding и не блокирует
telemetry contract; исправление UI не входит в этот scope.
