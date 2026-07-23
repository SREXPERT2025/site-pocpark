# РОСПАРК — план переноса production SQLite

Дата подготовки: 2026-07-23
Код задачи: `PROD-DATA-OPS`
Статус: перенос отложен по решению владельца от 2026-07-23. Локальный аудит,
read-only VPS preflight и свежий online backup завершены; остановка PM2,
изменение env и перенос не выполнялись.

## 1. Цель

Перенести рабочую demo-базу из Git checkout:

```text
/var/www/rospark-site/.data/guest-requests.sqlite
```

в постоянный каталог:

```text
/var/lib/rospark-demo/guest-requests.sqlite
```

без потери заявок, согласий, публичных token, оплат парковки гостей и текущих
операций.

Перенос является отдельной production-операцией. Этот документ не разрешает
автоматически останавливать PM2, менять `.env.production`, права, владельца,
SQLite или запускать реальные отправки.

Текущая база исправна и остаётся рабочей по старому пути. Возвращаться к
переносу нужно перед заменой production checkout, изменением схемы deploy,
крупным production-релизом или другой операцией, которая может затронуть
`/var/www/rospark-site`.

## 2. Что подтверждено локальным аудитом

### Подключение

`app/lib/demo-database.ts`:

- использует `DEMO_REQUESTS_DB_PATH`, если переменная задана;
- иначе создаёт `.data/guest-requests.sqlite` относительно `process.cwd()`;
- самостоятельно создаёт родительский каталог;
- открывает одно глобальное соединение на процесс;
- включает `journal_mode = WAL`;
- включает `foreign_keys = ON`;
- запускает миграции при первом открытии.

Следствие: изменение env без остановки процесса недостаточно. Уже открытое
соединение продолжит работать со старым файлом, а попытка поменять путь внутри
того же процесса завершится ошибкой.

### Схема

Ожидаются миграции:

```text
1|baseline_guest_requests
2|tenant_parking_discount_foundation
3|demo_feedback_leads
```

Проверяемые таблицы:

```text
demo_schema_migrations
demo_guest_requests
demo_tenants
demo_parking_sessions
demo_guest_passages
demo_web_discounts
demo_feedback_leads
```

### Runtime

- проект требует Node.js `>=22 <23`;
- используется `better-sqlite3` `^12.11.1`;
- `better-sqlite3` является нативной зависимостью и должен быть собран под
  фактический Node.js 22 runtime;
- `.data/` и `.env.*` исключены из Git;
- `.env.example` уже содержит целевой путь вне checkout.

## 3. Результат read-only VPS preflight

Фактически подтверждено 2026-07-23:

- production checkout:
  `release/demo-production-ready-20260723`,
  SHA `881ff3cf846ae270042ccf5f55e281d98b124145`;
- Node.js `22.23.1`, npm `10.9.8`, PM2 `7.0.3`;
- один процесс `rospark-site`, один instance, `fork_mode`;
- writer — `next-server (v14.2.35)` под пользователем и группой `root:root`;
- writer держит открытыми основной SQLite, WAL и SHM;
- `DEMO_REQUESTS_DB_PATH` отсутствует и в PM2 environment, и в
  `.env.production`;
- приложение использует fallback
  `/var/www/rospark-site/.data/guest-requests.sqlite`;
- основной файл — `4096` байт, WAL — `1615072` байта, SHM — `32768` байт;
- SQLite `3.45.1`, `journal_mode=wal`, `quick_check=ok`;
- `foreign_key_check` не вернул нарушений;
- миграции `1`, `2`, `3` присутствуют;
- row counts:
  `guest_requests=23`, `tenants=32`, `parking_sessions=56`,
  `guest_passages=0`, `web_discounts=13`, `feedback_leads=7`;
- свободно около `32 GB`;
- `/var/lib/rospark-demo` уже существует с владельцем `root:root` и mode `700`;
- внутри существует каталог `backups` с mode `755`;
- `/root/rospark-backups` существует;
- `.env.production` принадлежит `root:root`, но имеет mode `644`.

Вывод:

- online backup без остановки процесса выполнен;
- backup, checksum, миграции и row counts проверены;
- техническая подготовка к maintenance window завершена, но по решению
  владельца cutover отложен;
- перед запуском с новым путём `.env.production` должен быть сохранён в backup,
  а его права приведены к `600`;
- основной `.sqlite` нельзя копировать отдельно: активные данные находятся в
  WAL.

### Свежая точка восстановления

Создана 2026-07-23 в 21:00 MSK:

```text
/root/rospark-backups/prod-data-ops-20260723T180058Z/
```

Состав:

- `guest-requests.online.sqlite` — `212992` байт, mode `600`;
- `guest-requests.online.sqlite.sha256`;
- `env.production` — текущая копия, `1065` байт, mode `600`;
- release SHA и branch.

Проверка:

- checksum — `OK`;
- `quick_check=ok`;
- `foreign_key_check` — пуст;
- миграции `1`, `2`, `3`;
- row counts:
  `guest_requests=23`, `tenants=32`, `parking_sessions=56`,
  `guest_passages=0`, `web_discounts=13`, `feedback_leads=7`.

Более ранний online backup от 12:10 MSK исправен, но отстаёт:
`parking_sessions=42`, `web_discounts=12`. Он сохраняется как дополнительная
историческая точка, но не используется как источник cutover.

## 4. Ключевые риски

### R1. Потеря WAL-данных

При работающем приложении часть актуальных транзакций может находиться в
`guest-requests.sqlite-wal`. Обычное копирование только основного `.sqlite`
может создать неполную или старую копию.

Мера: использовать SQLite online backup, затем остановить writer и выполнить
финальный backup в целевой файл.

### R2. Два источника правды

После переключения старый и новый файлы существуют одновременно. Ошибка env
может вернуть приложение к старой базе или создать новую пустую `.data` базу.

Мера: проверить фактический env, PID, открытые файлы, изменения размера/mtime
нового файла и неизменность старого после smoke.

### R3. Неизвестный PM2-контур

Нельзя предполагать имя процесса, пользователя, режим или способ загрузки env.
Cluster mode или несколько writer-процессов меняют процедуру остановки.

Мера: подтвердить `pm2 list`, process user, `cwd`, interpreter, instances,
exec mode и точную restart-команду до окна.

### R4. Неправильные права

Приложению нужны права не только на файл, но и на каталог для WAL/SHM и
атомарных операций SQLite.

Мера: каталог `700`, база `600`, владелец каталога и файла совпадает с
фактическим пользователем PM2-процесса.

### R5. Ложный успешный запуск

Страницы могут отвечать `200`, пока demo API уже пишет в новый пустой fallback.

Мера: до и после переноса сравнить миграции и агрегированные row counts, затем
провести функциональный demo-smoke.

### R6. Неправильный rollback

После появления новых записей в целевой базе возврат к старому файлу теряет эти
записи.

Мера: разделять rollback до первой записи и восстановление после начала записи
в новую базу.

## 5. Read-only VPS preflight

Этот этап не останавливает процесс и ничего не изменяет.

Нужно подтвердить:

```text
VERIFIED_APP_DIR
VERIFIED_RELEASE_SHA
VERIFIED_BRANCH
VERIFIED_PROCESS_NAME
VERIFIED_PROCESS_USER
VERIFIED_PROCESS_GROUP
VERIFIED_PROCESS_MODE
VERIFIED_PROCESS_INSTANCES
VERIFIED_ENV_FILE
VERIFIED_OLD_DB
VERIFIED_PUBLIC_ORIGIN
VERIFIED_RESTART_COMMAND
VERIFIED_BACKUP_ROOT
```

Минимальная проверка:

```bash
cd /var/www/rospark-site
git status --short --branch
git rev-parse HEAD
node --version
npm --version
pm2 list
pm2 describe rospark-site
command -v sqlite3
df -h /var/www /var/lib
stat /var/www/rospark-site/.data/guest-requests.sqlite
ls -la /var/www/rospark-site/.data/guest-requests.sqlite*
```

Правила:

- не выводить весь env;
- не выводить GREEN-API, SMTP и другие секреты;
- проверить только наличие и значение `DEMO_REQUESTS_DB_PATH`;
- не считать `rospark-site` правильным именем процесса без проверки;
- не использовать `pm2 jlist` или полный environment dump в отчёте;
- не выполнять `stop`, `restart`, `mkdir`, `chown`, `chmod` или изменение env.

Если `sqlite3` отсутствует, окно не начинать: заранее выбрать и проверить
согласованный инструмент backup. Установка пакетов на VPS не должна становиться
скрытой частью переноса.

## 6. Инвентаризация базы до переноса

До окна создать online backup штатным SQLite-механизмом и проверять уже backup,
а не делать тяжёлые проверки на рабочем writer-файле.

Шаблон после подстановки проверенных значений:

```bash
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OLD_DB="/var/www/rospark-site/.data/guest-requests.sqlite"
BACKUP_DIR="/root/rospark-backups/prod-data-ops-${TIMESTAMP}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

sqlite3 "$OLD_DB" ".backup '$BACKUP_DIR/pre-cutover.sqlite'"
chmod 600 "$BACKUP_DIR/pre-cutover.sqlite"

sqlite3 "$BACKUP_DIR/pre-cutover.sqlite" "PRAGMA integrity_check;"
sqlite3 "$BACKUP_DIR/pre-cutover.sqlite" "PRAGMA foreign_key_check;"
sqlite3 "$BACKUP_DIR/pre-cutover.sqlite" \
  "SELECT version,name FROM demo_schema_migrations ORDER BY version;"
sha256sum "$BACKUP_DIR/pre-cutover.sqlite" \
  > "$BACKUP_DIR/pre-cutover.sqlite.sha256"
```

Ожидается:

- `integrity_check` — `ok`;
- `foreign_key_check` — пустой результат;
- миграции `1`, `2`, `3`;
- checksum сохранён;
- backup открывается независимо от исходных WAL/SHM.

Зафиксировать только агрегированные row counts:

```sql
SELECT 'demo_guest_requests', COUNT(*) FROM demo_guest_requests
UNION ALL
SELECT 'demo_tenants', COUNT(*) FROM demo_tenants
UNION ALL
SELECT 'demo_parking_sessions', COUNT(*) FROM demo_parking_sessions
UNION ALL
SELECT 'demo_guest_passages', COUNT(*) FROM demo_guest_passages
UNION ALL
SELECT 'demo_web_discounts', COUNT(*) FROM demo_web_discounts
UNION ALL
SELECT 'demo_feedback_leads', COUNT(*) FROM demo_feedback_leads;
```

Не выгружать телефоны, session ID, public token и полные строки заявок в
терминал или отчёт.

## 7. GO / NO-GO перед окном

### GO

- release SHA и branch подтверждены;
- production checkout не содержит неизвестных изменений;
- Node.js `22.x`;
- подтверждён один PM2 writer-процесс в fork mode;
- известны process user, group, cwd и env-файл;
- старый путь совпадает с production-state;
- online backup создан и проверен;
- миграции `1–3` присутствуют;
- `integrity_check=ok`;
- `foreign_key_check` пуст;
- row counts сохранены;
- на `/var/lib` и backup-разделе достаточно места;
- `sqlite3` или другой утверждённый backup-инструмент проверен;
- согласованы окно, restart-команда и rollback;
- реальные MAX/WhatsApp-отправки не требуются для smoke.

### NO-GO

- cluster mode или несколько неизвестных writer-процессов;
- фактический DB path отличается от документации;
- неизвестный способ загрузки env;
- нет проверенного backup;
- integrity или foreign key check не проходят;
- миграции отличаются от `1–3`;
- WAL/SHM используются неизвестным процессом;
- нет прав создать и проверить целевой каталог;
- нет места;
- процесс нельзя безопасно остановить и вернуть;
- одновременно планируется deploy кода, обновление зависимостей, MAX, Nginx или
  другая инфраструктурная операция.

## 8. Согласованное окно переноса

В этом окне нельзя обновлять код или зависимости.

### Шаг 1. Зафиксировать исходное состояние

- сохранить SHA, PM2 status и время начала;
- сохранить backup `.env.production` без вывода содержимого;
- повторно убедиться, что online backup доступен;
- записать агрегированные row counts.

### Шаг 2. Подготовить каталог

После подтверждения process user:

```bash
install -d -m 700 -o "<PROCESS_USER>" -g "<PROCESS_GROUP>" \
  /var/lib/rospark-demo
```

Не разрешать приложению создавать production-каталог с правами, зависящими от
случайного `umask`.

### Шаг 3. Остановить writer

- остановить только подтверждённый PM2-процесс сайта;
- убедиться, что PID завершён;
- убедиться, что старый `.sqlite`, `-wal` и `-shm` больше не открыты процессом;
- не останавливать независимый платёжный bridge и другие сервисы.

### Шаг 4. Создать финальный целевой файл

Финальный backup выполнять после остановки writer:

```bash
TARGET_TMP="/var/lib/rospark-demo/.guest-requests.sqlite.incoming-${TIMESTAMP}"
NEW_DB="/var/lib/rospark-demo/guest-requests.sqlite"

sqlite3 "$OLD_DB" ".backup '$TARGET_TMP'"
chown "<PROCESS_USER>:<PROCESS_GROUP>" "$TARGET_TMP"
chmod 600 "$TARGET_TMP"

sqlite3 "$TARGET_TMP" "PRAGMA integrity_check;"
sqlite3 "$TARGET_TMP" "PRAGMA foreign_key_check;"
sqlite3 "$TARGET_TMP" \
  "SELECT version,name FROM demo_schema_migrations ORDER BY version;"
```

Зафиксировать row counts финального backup. Они могут быть выше значений
предварительного online backup из-за нормальной активности до остановки writer.
Целевой файл должен точно совпасть уже с финальным backup. Только после успешной
проверки атомарно переименовать временный файл в `NEW_DB` внутри одного
файлового раздела.

Не копировать старые `-wal` и `-shm` в целевой каталог. Проверенный SQLite
backup является самостоятельной базой; новые sidecar-файлы создаст приложение.

### Шаг 5. Изменить только DB path

В подтверждённом env-файле изменить только:

```env
DEMO_REQUESTS_DB_PATH=/var/lib/rospark-demo/guest-requests.sqlite
```

Не менять одновременно MAX, GREEN-API, site origin, порт, Node.js, Nginx или
другие переменные.

Перед запуском проверить:

- env-файл по-прежнему `600`;
- остальные строки не изменены;
- целевой каталог доступен process user на чтение и запись;
- старые файлы сохранены без удаления.

### Шаг 6. Запустить процесс

Использовать только restart/start-команду, подтверждённую preflight. Если PM2
хранит `DEMO_REQUESTS_DB_PATH` в собственном process environment, отдельно
подтвердить необходимость `--update-env`. Не добавлять этот флаг по
предположению.

## 9. Проверка после cutover

### Файловая проверка

- PM2 online и не находится в restart loop;
- приложение открыло новый файл;
- в новом каталоге появились ожидаемые WAL/SHM при записи;
- process user владеет каталогом и файлами;
- старый файл и sidecar-файлы не изменяются;
- новый файл проходит integrity и foreign key check;
- миграции и row counts совпадают.

### Функциональный smoke

Сначала проверить локальный listener VPS, затем публичный origin:

1. `/demo` — `200`;
2. `/demo/gostevaya-zayavka` — `200`;
3. `/demo/web-skidki` — `200`;
4. `/demo/vladelec-parkovki` — `200`;
5. API без cookie — `401`;
6. логин `TEST / TEST`;
7. seed-распределение гостевых заявок;
8. создание и отмена собственной тестовой заявки;
9. публичный token — `200`, неизвестный token — `404`;
10. телефон отсутствует в публичном HTML;
11. поиск `D-1042`;
12. owner summary и изоляция двух demo-сессий;
13. feedback lead — только при отдельном consent;
14. повторный feedback lead не создаёт дубль.

MAX и WhatsApp не тестировать реальной отправкой без отдельного подтверждения.
Их env-значения при переносе не меняются.

### Логи

- проверить новые PM2 error lines после времени запуска;
- не публиковать секреты и персональные данные;
- подтвердить отсутствие `SQLITE_CANTOPEN`, `SQLITE_BUSY`, migration conflict,
  permission denied и Node ABI errors.

## 10. Rollback

### До первой записи в новую базу

Если приложение не стартует или не может открыть целевой файл:

1. остановить process;
2. сохранить логи;
3. восстановить backup env;
4. вернуть подтверждённые права старого каталога;
5. запустить process со старым DB path;
6. повторить минимальный smoke.

### После первой записи в новую базу

Нельзя автоматически переключаться на старый файл: он уже отстаёт.

Порядок:

1. остановить writer;
2. сохранить новый файл и его sidecar-файлы;
3. создать backup нового состояния, если SQLite открывается;
4. определить причину;
5. исправить доступ/конфигурацию и продолжить с новой базой либо принять
   отдельное решение о восстановлении с известной потерей новых операций.

Старую `.data` базу не удалять после успешного cutover. Срок хранения и удаление
утверждаются отдельно после стабильного периода.

## 11. Evidence после выполнения

В production-state записать:

```text
дата и окно
release SHA
ветка
process name / user / mode / instances
старый путь
новый путь
backup path и checksum
миграции
row counts до и после
integrity_check
foreign_key_check
результат smoke
PM2/log status
rollback status
кто подтвердил GO
```

Не записывать:

- секреты;
- телефоны;
- session ID;
- public token;
- содержимое заявок;
- полный PM2 environment.

## 12. Следующее решение

Online backup выполнен и проверен. Активных действий не требуется. При
возвращении задачи сначала повторить read-only preflight и создать новый свежий
online backup, затем получить явный GO на maintenance window.
