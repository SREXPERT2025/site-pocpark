# РОСПАРК: ручной выпуск demo-системы на VPS

## 1. Назначение документа

Этот runbook описывает подготовку и проверку всей demo-системы РОСПАРК:

- каталог demo-сценариев `/demo`;
- гостевые заявки арендатора;
- публичные ссылки и QR-коды;
- добровольное согласие на обратную связь;
- оплату парковки гостей;
- кабинет владельца парковки;
- SQLite-хранилище и миграции;
- исторические и текущие demo-отчёты.

Все действия на VPS выполняет человек вручную. Этот документ не является
автоматическим deploy-скриптом и не подтверждает фактические значения путей,
портов, пользователей, process manager или reverse proxy.

До ручного выпуска должны быть отдельно утверждены:

```text
APPROVED_RELEASE_SHA
APPROVED_PRODUCTION_BRANCH
VERIFIED_APP_DIR
VERIFIED_PROCESS_MANAGER
VERIFIED_PROCESS_NAME
VERIFIED_PROCESS_USER
VERIFIED_PORT
VERIFIED_DB_PATH
VERIFIED_ENV_FILE
VERIFIED_PUBLIC_ORIGIN
VERIFIED_RESTART_COMMAND
```

Не заменять эти значения предположениями. Их определяет человек на VPS во время
preflight.

MAX, Caddy, Nginx, другие reverse proxy и Метрика не меняются этим выпуском.
Для каждого такого действия требуется отдельное разрешение.

## 2. Утверждённый release

Перед выпуском человек фиксирует точный SHA:

```bash
APPROVED_RELEASE_SHA="<APPROVED_RELEASE_SHA>"
APPROVED_PRODUCTION_BRANCH="<APPROVED_PRODUCTION_BRANCH>"
```

Требования:

- SHA должен существовать в согласованном Git remote;
- production-ветка должна указывать на этот SHA либо допускать только
  согласованный fast-forward;
- рабочее дерево на VPS должно быть чистым;
- deploy по имени feature-ветки без фиксации SHA запрещён;
- `Caddyfile.external-demo` не является production-конфигурацией.

## 3. Ручной preflight VPS

Человек на VPS должен проверить и записать:

1. фактический каталог приложения;
2. текущую ветку и SHA;
3. чистоту рабочего дерева;
4. Git remote;
5. версию Node.js и npm;
6. наличие свободного места;
7. process manager и пользователя процесса;
8. имя, команду запуска, `cwd`, interpreter, число процессов и режим запуска;
9. фактический порт и слушающий его процесс;
10. фактический env-файл и способ передачи env процессу;
11. фактический путь SQLite;
12. фактический публичный origin;
13. действующий reverse proxy — только для чтения, без изменения.

Минимальные read-only команды выбираются человеком с учётом системы:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
node --version
npm --version
df -h
```

Если используется PM2, дополнительно вручную проверить `pm2 list` и
`pm2 describe <VERIFIED_PROCESS_NAME>`. Не считать имя процесса, порт,
`instances` или `exec_mode` заранее известными.

Если обнаружены:

- неизвестные изменения в checkout;
- несколько процессов приложения;
- cluster mode;
- неизвестный владелец файлов;
- конфликт порта;
- нехватка места;
- неподтверждённый reverse proxy;

выпуск останавливается. Не выполнять `reset --hard`, `clean`, force-push или
автоматическое исправление инфраструктуры.

## 4. Production environment

Для первого выпуска требуются server-side значения:

```env
NODE_ENV=production
PORT=<VERIFIED_PORT>
NEXT_PUBLIC_SITE_URL=<VERIFIED_PUBLIC_ORIGIN>
DEMO_REQUESTS_DB_PATH=<VERIFIED_ABSOLUTE_DB_PATH_OUTSIDE_GIT_CHECKOUT>
DEMO_MAX_ENABLED=false
```

Правила:

- `NEXT_PUBLIC_SITE_URL` должен быть утверждён до `npm run build`;
- значение должно совпадать с каноническим публичным origin;
- `DEMO_REQUESTS_DB_PATH` должен указывать на постоянный каталог вне Git
  checkout;
- `DEMO_MAX_ENABLED=false` обязательно для первого выпуска;
- GREEN-API credentials при первом выпуске не добавляются;
- реальные секреты нельзя выводить в терминал, чат, скриншоты или логи;
- env-файл не должен отслеживаться Git.

Проверять только наличие имён обязательных переменных, не печатая значения
секретов.

## 5. Права

После определения фактических путей и пользователя процесса человек вручную
устанавливает:

```text
env-файл                 600
каталог SQLite           700
основной файл SQLite     600
```

Владелец каталога и базы должен совпадать с фактическим пользователем процесса.
Не использовать вымышленного пользователя и не создавать пустой SQLite-файл
вручную.

## 6. Backup перед выпуском

До получения нового кода человек создаёт timestamped backup:

1. текущего env-файла;
2. текущего SHA;
3. SQLite через согласованную команду `.backup`;
4. контрольной суммы backup.

Шаблон после подстановки проверенных значений:

```bash
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="<VERIFIED_BACKUP_ROOT>/${TIMESTAMP}"
DB="<VERIFIED_DB_PATH>"
ENV_FILE="<VERIFIED_ENV_FILE>"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

install -m 600 "$ENV_FILE" "$BACKUP_DIR/env.backup"
git rev-parse HEAD > "$BACKUP_DIR/previous-sha.txt"
chmod 600 "$BACKUP_DIR/previous-sha.txt"

if test -f "$DB"; then
  sqlite3 "$DB" ".backup '$BACKUP_DIR/demo.sqlite'"
  chmod 600 "$BACKUP_DIR/demo.sqlite"
  sqlite3 "$BACKUP_DIR/demo.sqlite" "PRAGMA integrity_check;"
  sqlite3 "$BACKUP_DIR/demo.sqlite" "PRAGMA foreign_key_check;"
  shasum -a 256 "$BACKUP_DIR/demo.sqlite" > "$BACKUP_DIR/demo.sqlite.sha256"
fi
```

Ожидается:

- `integrity_check` возвращает `ok`;
- `foreign_key_check` не возвращает строк;
- контрольная сумма сохранена и проверяется штатной утилитой конкретного VPS.

Не использовать обычный `cp` работающего SQLite/WAL как единственный backup.

## 7. Получение утверждённого SHA

Действия выполняет человек после backup:

1. проверяет чистое дерево;
2. выполняет `git fetch` из утверждённого remote;
3. убеждается, что `APPROVED_RELEASE_SHA` существует;
4. проверяет его автора, сообщение и состав;
5. выполняет только согласованный fast-forward production-ветки;
6. повторно проверяет точный HEAD и чистое дерево.

Не выполнять:

- `git reset --hard`;
- `git clean`;
- force checkout поверх локальных изменений;
- merge неутверждённой ветки;
- deploy произвольного branch HEAD вместо утверждённого SHA.

## 8. Установка и сборка

В подтверждённом каталоге приложения и под Node.js 22:

```bash
npm ci
npm run typecheck
npm run lint
npm run build
git diff --check
```

Проверка `better-sqlite3`:

```bash
node -e "
const Database = require('better-sqlite3');
const db = new Database(':memory:');
console.log({
  node: process.version,
  betterSqlite3: require('better-sqlite3/package.json').version,
  sqlite: db.prepare('select sqlite_version() as version').get().version,
  integrity: db.pragma('integrity_check', { simple: true })
});
db.close();
"
```

Не продолжать при ошибке `npm ci`, TypeScript, ESLint, build или загрузки
нативного модуля.

## 9. Ручной restart

Человек использует только фактически проверенные process manager, имя процесса
и restart-команду.

Перед restart подтвердить:

- реальную команду запуска;
- реальный порт;
- способ передачи env;
- пользователя процесса;
- число процессов и режим запуска;
- наличие backup;
- точный release SHA.

Если используется PM2, необходимость `--update-env` и команда `pm2 save`
определяются по фактической конфигурации. `pm2 save` допустим только после
успешного smoke.

Runbook не меняет PM2, systemd, Docker, Caddy, Nginx или другой reverse proxy.

## 10. Миграции SQLite

После запуска человек создаёт demo-сессию и обращается к API, чтобы приложение
открыло базу и выполнило управляемые миграции.

Проверка:

```bash
sqlite3 "<VERIFIED_DB_PATH>" \
  "SELECT version,name FROM demo_schema_migrations ORDER BY version;"
```

Ожидается:

```text
1|baseline_guest_requests
2|tenant_parking_discount_foundation
3|demo_feedback_leads
```

Затем:

```bash
sqlite3 "<VERIFIED_DB_PATH>" "PRAGMA integrity_check;"
sqlite3 "<VERIFIED_DB_PATH>" "PRAGMA foreign_key_check;"
```

Ожидается `ok` и пустой результат foreign key check.

На чистой базе должны создаться все три миграции. На существующей базе миграция
3 должна добавиться без потери заявок, публичных token и текущих операций.

## 11. Обязательные маршруты

Страницы:

```text
/demo
/demo/gostevaya-zayavka
/demo/arendar/{token}
/demo/web-skidki
/demo/vladelec-parkovki
```

API:

```text
/api/demo/session
/api/demo/requests
/api/demo/requests/{id}
/api/demo/feedback-leads
/api/demo/share/max
/api/demo/parking-sessions
/api/demo/web-discounts
/api/demo/owner/summary
/api/demo/owner/tenants
/api/demo/owner/tenants/{tenantId}
/api/demo/owner/guest-requests
/api/demo/owner/web-discounts
/api/demo/owner/operations
```

`{token}`, `{id}` и `{tenantId}` — реальные синтетические значения, а не
буквальные URL.

## 12. Полный smoke после restart

Все проверки человек выполняет сначала через локальный listener VPS, затем через
утверждённый публичный origin.

### 12.1. Базовые страницы

- `/demo` — `200`;
- `/demo/gostevaya-zayavka` — `200`;
- `/demo/web-skidki` — `200`;
- `/demo/vladelec-parkovki` — `200`;
- API без cookie — `401`.

### 12.2. Гостевые заявки

1. Войти `TEST` / `TEST`.
2. Подтвердить seed-распределение `2 / 7 / 6`.
3. Создать собственную заявку — `201`.
4. Отменить собственную ожидающую заявку — `200`.
5. Открыть `/demo/arendar/{token}` без авторизации — `200`.
6. Проверить QR.
7. Убедиться, что телефон отсутствует в публичном HTML.
8. Неизвестный token должен вернуть `404`.
9. При `DEMO_MAX_ENABLED=false` MAX API должен вернуть `503`.

### 12.3. Согласие на обратную связь

Проверять только на собственной пользовательской заявке:

1. Не отмечать consent и отправить запрос к `/api/demo/feedback-leads`:
   ожидается `400` и `CONSENT_REQUIRED`.
2. Отметить consent и повторить действие:
   ожидается `201`, `created=true`.
3. Повторить для той же заявки:
   ожидается `200`, `created=false`, без второй строки в базе.
4. Проверить, что seed-заявка не создаёт feedback lead.
5. Проверить, что действие другой demo-сессии недоступно.
6. Убедиться, что API не возвращает телефон, `session_id` или SQLite-детали.
7. Убедиться, что текст говорит о добровольности согласия и ссылается на
   политику обработки персональных данных.

### 12.4. Оплата парковки гостей

- поиск `D-1042` — одна сессия;
- поиск `A 104 B-C 77` — автомобиль `А104ВС77`;
- оплата — `201`;
- повторная оплата — `409`;
- конкурентные запросы — строго `201 / 409`;
- исходная стоимость не заменяется нулём;
- `guestDue=0`;
- `tenantCharge=originalCost`.

### 12.5. Кабинет владельца

Для предыдущего завершённого месяца:

```text
Арендаторы                     32
Гостевые заявки                760
Гостевые проезды               840
Оплата парковки гостей         1450
Все операции                   2290
Гостевые проезды               286000 ₽
Оплата парковки гостей         1236550 ₽
Всего начислено                1522550 ₽
```

Также проверить:

- многоразовую заявку с пятью проездами;
- равенство суммы заявки сумме её проездов;
- previous-month одинаков для браузеров A и B;
- current-операции A не видны B;
- current-операции B не видны A;
- мобильную ширину 390 px;
- отсутствие телефона, `session_id` и `publicToken` в owner DTO.

## 13. Индексация и клиентская безопасность

Проверить:

- `/demo` присутствует в sitemap;
- внутренние demo-кабинеты не добавлены в sitemap;
- `/demo/gostevaya-zayavka` — `noindex`;
- `/demo/arendar/{token}` — `noindex`;
- `/demo/web-skidki` — `noindex`;
- `/demo/vladelec-parkovki` — `noindex`;
- API не индексируются;
- публичные token не попадают в sitemap;
- production build не содержит GREEN-API secrets, SMTP credentials, телефоны
  demo-пользователей или реальные персональные данные.

## 14. Безопасный rollback

Rollback выполняет человек. Сначала определить тип проблемы.

### 14.1. Ошибка кода или UI

1. Зафиксировать логи без секретов.
2. Не восстанавливать SQLite автоматически.
3. Сохранить дополнительный backup текущей базы.
4. Вернуть предыдущий утверждённый SHA через согласованный Git-процесс.
5. Выполнить `npm ci` и `npm run build`.
6. Перезапустить фактический процесс проверенной командой.
7. Повторить миграции, integrity check и smoke.

Миграция 3 добавляет новую таблицу и не удаляет старые данные. При кодовом
rollback базу по умолчанию оставляют на месте, чтобы не потерять действия после
выпуска.

### 14.2. Ошибка env

1. Восстановить backup env-файла.
2. Вернуть правильные права и владельца.
3. Перезапустить процесс проверенной командой обновления env.
4. Повторить smoke.

### 14.3. Подтверждённое повреждение SQLite

Restore SQLite допустим только после отдельного решения, потому что он удалит
операции, появившиеся после backup.

Перед restore:

1. остановить процесс;
2. сохранить повреждённую базу, WAL и SHM под отдельными именами;
3. проверить checksum backup;
4. проверить `integrity_check=ok`;
5. проверить пустой `foreign_key_check`;
6. восстановить backup в новый временный файл;
7. назначить проверенные права и владельца;
8. атомарно заменить основной файл;
9. запустить процесс;
10. повторить миграции и полный smoke.

Не выполнять автоматический downgrade схемы и не удалять таблицу
`demo_feedback_leads` вручную.

## 15. Действия после успешного smoke

Только после полного smoke человек:

1. подтверждает точный работающий SHA;
2. сохраняет конфигурацию process manager, если это действительно требуется;
3. повторно проверяет логи;
4. фиксирует результат выпуска и путь к backup;
5. сохраняет `DEMO_MAX_ENABLED=false`.

Отдельного разрешения требуют:

- включение MAX и добавление GREEN-API credentials;
- изменение Caddy;
- изменение Nginx или другого reverse proxy;
- изменение DNS;
- изменение PM2/systemd/Docker-конфигурации;
- подключение Метрики и событий;
- удаление старых backup.

## 16. Финальный ручной чек-лист

- [ ] Утверждены production-ветка и точный release SHA.
- [ ] Реальные значения VPS определены человеком.
- [ ] Рабочее дерево VPS чистое.
- [ ] Node.js `22.x`.
- [ ] Фактический process manager и пользователь проверены.
- [ ] Фактический порт и listener проверены.
- [ ] Env и SQLite находятся по подтверждённым путям.
- [ ] `NEXT_PUBLIC_SITE_URL` совпадает с утверждённым origin.
- [ ] `DEMO_MAX_ENABLED=false`.
- [ ] Созданы и проверены backup env и SQLite.
- [ ] `npm ci`, TypeScript, ESLint и production build прошли.
- [ ] `better-sqlite3` загружается.
- [ ] Миграции 1, 2 и 3 подтверждены.
- [ ] `integrity_check=ok`.
- [ ] `foreign_key_check` пуст.
- [ ] Проверены все пять demo-страниц.
- [ ] Проверен `/api/demo/feedback-leads`.
- [ ] Проверены обязательность consent и идемпотентность feedback lead.
- [ ] Проверены гостевые заявки, QR и публичный token.
- [ ] Проверены оплата парковки и конкурентные `201 / 409`.
- [ ] Проверены owner previous/current и A/B-изоляция.
- [ ] Проверены sitemap, noindex и отсутствие секретов.
- [ ] Rollback-план и backup доступны.
- [ ] MAX не включался.
- [ ] Reverse proxy и DNS не изменялись.
