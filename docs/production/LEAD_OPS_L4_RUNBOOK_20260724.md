# РОСПАРК — production runbook `LEAD-OPS-002 / L4`

Дата подготовки: 2026-07-24

Статус: L4 выполнен и принят в production 2026-07-24; рабочий release
`61a4694bee55426e72bdfbb42008730c3cb2b444`

Этот документ не разрешает автоматически менять VPS, release-ветку, PM2,
`.env.production`, SQLite, systemd или отправлять сообщение в MAX. Каждый
изменяющий этап начинается только после отдельного подтверждения директора.

## 0. Фактический результат L4

- maintenance и одна TEST-отправка отдельно подтверждены директором;
- backup:
  `/root/rospark-backups/lead-ops-l4-20260724T122213Z`;
- production fast-forward:
  `c2a0e955b8747e3005da28e3fe9981f01fa45488` →
  `61a4694bee55426e72bdfbb42008730c3cb2b444`;
- staging `npm ci`, три lead-теста, typecheck, lint и production build —
  успешно; build содержит 103 статические страницы и динамические admin routes;
- registry:
  `/var/lib/rospark-leads/lead-registry.sqlite`, каталог mode `700`, файл
  mode `600`;
- `.env.production` приведён к mode `600`;
- `LEAD_REGISTRY_ENABLED`, `LEAD_ADMIN_ENABLED` и
  `LEAD_OUTBOX_PROCESSING_ENABLED` включены;
- персональный вход Андрея и Сергея подтверждён; Сергей не имеет удаления;
- внешний desktop/mobile smoke: noindex, без Метрики, публичных
  header/footer, overflow и console errors;
- создан один `TEST LEAD-OPS-002`, MAX получил ровно одно сообщение;
- outbox: `sent`, `attempts=1`, `error=none`;
- workflow: `new → assigned(sergey) → contacted → closed(test)`;
- `PRAGMA quick_check` — `ok`, foreign key errors отсутствуют;
- systemd outbox timer активен примерно раз в минуту, cleanup timer —
  ежедневно около `03:30 Europe/Moscow`;
- автоматические пустые worker runs завершились с `claimed=0`, `dead=0`;
- PM2 `rospark-site` — `online`.

TEST-лид `RSP-A89A0364` сохранён как acceptance evidence и не является
обращением клиента. Rollback build и исходный backup не удалены.

## 1. Цель L4

В согласованное окно включить единый lead registry и закрытый кабинет:

```text
форма/demo feedback
→ SQLite registry
→ pending outbox
→ MAX-группа отдела продаж
→ assigned
→ contacted
→ closed
```

Production-путь нового отдельного реестра:

```text
/var/lib/rospark-leads/lead-registry.sqlite
```

Рабочая demo-база не переносится и остаётся отдельной:

```text
/var/www/rospark-site/.data/guest-requests.sqlite
```

## 2. Что входит в выпуск

- `LEAD_REGISTRY_ENABLED=true`;
- `LEAD_ADMIN_ENABLED=true`;
- персональный login Андрея и Сергея;
- `LEAD_OUTBOX_CHANNELS=max`;
- сначала `LEAD_OUTBOX_PROCESSING_ENABLED=false`;
- после проверки pending-записи — один ручной запуск worker;
- затем systemd timer worker раз в минуту;
- отдельный cleanup timer ежедневно;
- одна заявка с явной пометкой `TEST`;
- полный status workflow и фиксация результата.

Не входят:

- Email;
- Telegram;
- CRM sync;
- перенос demo SQLite;
- Nginx/DNS/SSL;
- обновление Node.js/Next.js/зависимостей;
- `SECURITY-RELEASE-2`;
- AI-виджет.

## 3. Подготовленные артефакты

- `scripts/process_lead_outbox.mjs` — outbox worker;
- `scripts/cleanup_lead_registry.mjs` — независимая retention cleanup;
- `scripts/lead_registry_cli_runtime.mjs` — загрузка `.env.production`,
  SQLite permissions и migrations;
- `scripts/configure_lead_ops_env.mjs` — атомарное обновление только
  allowlisted lead-переменных с backup без вывода секретов;
- `ops/systemd/rospark-lead-outbox.*.template`;
- `ops/systemd/rospark-lead-cleanup.*.template`.

Оба one-shot процесса используют общий `flock`, чтобы cleanup не удалил
submission/outbox во время сетевой попытки worker.

## 4. Gate перед любыми изменениями

Нужно зафиксировать:

```text
APP_DIR
CURRENT_RELEASE_SHA
CURRENT_BRANCH
PROCESS_NAME
APP_USER
APP_GROUP
NODE_BIN
NPM_BIN
FLOCK_BIN
ENV_FILE
DEMO_DB
BACKUP_ROOT
PUBLIC_ORIGIN
APPROVED_RELEASE_SHA
ROLLBACK_SHA
```

Остановить подготовку, если:

- production working tree не чистый;
- текущий SHA не совпадает с документацией;
- Node.js не `22.x`;
- не найден `sqlite3`, `flock`, Node или npm;
- процесс, пользователь, cwd или restart-команда не подтверждены;
- `.env.production` содержит дубли lead-ключей;
- MAX lead token/chat отсутствуют;
- нет места для backup/build;
- unit templates не проходят `systemd-analyze verify`;
- нет отдельного подтверждения maintenance window и одной TEST-отправки.

## 5. Read-only VPS preflight

Блок ничего не изменяет, не останавливает процесс и не выводит значения
секретов:

```bash
cd /var/www/rospark-site || exit 1

git status --short --branch
git rev-parse HEAD
git branch --show-current

node --version
npm --version
command -v node
command -v npm
command -v sqlite3
command -v flock

pm2 list
pm2 describe rospark-site
ps -eo user,group,pid,ppid,lstart,args --forest \
  | grep -E '[n]pm start|[n]ext-server|[n]ext start'

stat -c '%n | owner=%U:%G | mode=%a | size=%s | modified=%y' \
  /var/www/rospark-site/.env.production

for key in \
  LEAD_REGISTRY_DB_PATH \
  LEAD_REGISTRY_ENABLED \
  LEAD_OUTBOX_CHANNELS \
  LEAD_OUTBOX_PROCESSING_ENABLED \
  LEAD_ADMIN_ENABLED \
  LEAD_ADMIN_SESSION_SECRET \
  LEAD_ADMIN_DIRECTOR_PASSWORD_HASH \
  LEAD_ADMIN_SALES_PASSWORD_HASH \
  LEAD_MAX_BOT_TOKEN \
  LEAD_MAX_CHAT_ID
do
  count="$(grep -c "^${key}=" .env.production 2>/dev/null || true)"
  case "$count" in
    0) echo "${key}=missing" ;;
    1) echo "${key}=present" ;;
    *) echo "${key}=duplicate:${count}" ;;
  esac
done

find /var/lib/rospark-leads -maxdepth 1 \
  -printf '%M | %u:%g | %s bytes | %p\n' 2>&1

systemctl list-unit-files 'rospark-lead-*' --no-pager
systemctl list-timers 'rospark-lead-*' --all --no-pager
df -h /var/www /var/lib /root
```

В отчёт можно прислать этот вывод целиком: значения токенов/паролей команда не
печатает.

### Результат preflight от 2026-07-24

Проверка выполнена на production VPS без изменений:

- working tree чистый;
- branch: `release/demo-production-ready-20260723`;
- SHA: `c2a0e955b8747e3005da28e3fe9981f01fa45488`;
- `node v22.23.1`, `npm 10.9.8`;
- `NODE_BIN=/usr/bin/node`, `NPM_BIN=/usr/bin/npm`;
- `sqlite3=/usr/bin/sqlite3`, `FLOCK_BIN=/usr/bin/flock`;
- PM2 process `rospark-site` — `online`, user/group `root:root`;
- PM2 cwd — `/var/www/rospark-site`, команда — `/usr/bin/npm start`;
- фактический сервер — Next.js `14.2.35`;
- `LEAD_MAX_BOT_TOKEN` и `LEAD_MAX_CHAT_ID` присутствуют по одному, значения
  не выводились;
- остальные новые `LEAD_*` keys отсутствуют, дубли не обнаружены;
- `/var/lib/rospark-leads` ещё не создан;
- `rospark-lead-*` units и timers ещё не установлены;
- на корневом разделе свободно `32G`, использование `17%`.

Наблюдения перед изменяющим этапом:

- `.env.production` принадлежит `root:root`, но имеет mode `644`; при первом
  конфигурировании lead-переменных обязательна атомарная перезапись в mode
  `600`, уже предусмотренная `scripts/configure_lead_ops_env.mjs`;
- PM2 показывает `15` restart и uptime около двух часов. Процесс стабилен в
  момент проверки, но перед maintenance нужно сохранить свежие логи и не
  трактовать один статус `online` как доказательство долгосрочной стабильности.

Preflight gate пройден для подготовки maintenance packet. Он не разрешает
fast-forward release, restart, создание каталога, изменение env, установку
systemd или TEST-отправку.

## 6. Проверки release candidate локально

Под Node.js 22:

```bash
npm run test:lead-registry
npm run test:lead-admin
npm run test:lead-cli
npm run typecheck
npm run lint
npm run build
git diff --check
```

Release branch меняется только отдельным fast-forward после фиксации точного
candidate SHA. Feature-ветка не является автоматическим разрешением на deploy.

## 7. Backup перед maintenance

Этот блок уже изменяет VPS и выполняется только после подтверждения окна.

Обязательно сохранить:

- `.env.production`;
- текущий branch/SHA;
- online backup работающей demo SQLite;
- существующий lead registry, если он уже появился.

Шаблон использует отдельный каталог mode `700`, файлы mode `600`, SQLite
`.backup`, checksum, `quick_check` и `foreign_key_check`. Точные пути
подставляются только из read-only preflight.

Нельзя копировать один работающий `.sqlite` без WAL/SHM обычной командой `cp`.

## 8. Секреты без передачи в чат

После обновления кода, но до restart, пароли вводятся непосредственно в Bash
на VPS. В history пароль не попадает:

```bash
cd /var/www/rospark-site || exit 1
umask 077

read -r -s -p 'Пароль Андрея: ' ANDREY_PASSWORD
echo
read -r -s -p 'Повторите пароль Андрея: ' ANDREY_PASSWORD_CONFIRM
echo
test "$ANDREY_PASSWORD" = "$ANDREY_PASSWORD_CONFIRM" || exit 1

read -r -s -p 'Пароль Сергея: ' SERGEY_PASSWORD
echo
read -r -s -p 'Повторите пароль Сергея: ' SERGEY_PASSWORD_CONFIRM
echo
test "$SERGEY_PASSWORD" = "$SERGEY_PASSWORD_CONFIRM" || exit 1
test "$ANDREY_PASSWORD" != "$SERGEY_PASSWORD" || exit 1

ANDREY_HASH="$(
  LEAD_ADMIN_PASSWORD_TO_HASH="$ANDREY_PASSWORD" \
    npm run --silent lead-admin:hash-password
)"
SERGEY_HASH="$(
  LEAD_ADMIN_PASSWORD_TO_HASH="$SERGEY_PASSWORD" \
    npm run --silent lead-admin:hash-password
)"
SESSION_SECRET="$(openssl rand -base64 48 | tr -d '\n')"

unset ANDREY_PASSWORD ANDREY_PASSWORD_CONFIRM
unset SERGEY_PASSWORD SERGEY_PASSWORD_CONFIRM

export LEAD_OPS_ENV_FILE=/var/www/rospark-site/.env.production
export LEAD_OPS_ENABLE_OUTBOX_PROCESSING=false
export LEAD_ADMIN_SESSION_SECRET="$SESSION_SECRET"
export LEAD_ADMIN_DIRECTOR_PASSWORD_HASH="$ANDREY_HASH"
export LEAD_ADMIN_SALES_PASSWORD_HASH="$SERGEY_HASH"

node scripts/configure_lead_ops_env.mjs
```

Скрипт:

- не печатает секреты;
- создаёт timestamped backup исходного env;
- удаляет дубли только управляемых lead-ключей;
- сохраняет остальные production-переменные;
- пишет новый файл атомарно;
- устанавливает mode `600`;
- на первом этапе оставляет реальную outbox-отправку выключенной.

Shell-переменные с секретами не очищать до успешного окончания L4: они нужны
для возможного повторного запуска конфигуратора. После завершения:

```bash
unset SESSION_SECRET ANDREY_HASH SERGEY_HASH
unset LEAD_OPS_ENV_FILE LEAD_OPS_ENABLE_OUTBOX_PROCESSING
unset LEAD_ADMIN_SESSION_SECRET
unset LEAD_ADMIN_DIRECTOR_PASSWORD_HASH
unset LEAD_ADMIN_SALES_PASSWORD_HASH
```

## 9. Staged release

Порядок:

1. Создать backup и зафиксировать rollback SHA.
2. Остановить PM2-процесс в maintenance window.
3. Выполнить только согласованный fast-forward release.
4. Запустить `npm ci` под Node.js 22.
5. Создать `/var/lib/rospark-leads` с подтверждённым owner и mode `700`.
6. Настроить env с outbox processing `false`.
7. Выполнить три lead-теста, typecheck, lint и production build.
8. Запустить PM2-процесс подтверждённой командой.
9. Проверить публичные маршруты и закрытые ответы API.
10. Войти Андреем и Сергеем; проверить матрицу ролей.
11. Создать одну TEST-заявку: она должна попасть в registry и pending outbox,
    но ещё не отправляться.
12. Проверить SQLite migrations `1–3`, `quick_check` и audit.
13. Включить outbox processing конфигуратором.
14. Установить проверенные systemd units и выполнить один ручной worker run.
15. Получатель подтверждает ровно одно TEST-сообщение в MAX.
16. В кабинете выполнить assigned → contacted → closed с outcome `test`.
17. Включить оба timer и проверить следующий запуск.

В шаге 13 используются уже сохранённые в текущей shell-сессии hashes/secret:

```bash
export LEAD_OPS_ENABLE_OUTBOX_PROCESSING=true
node scripts/configure_lead_ops_env.mjs
```

Если shell-сессия была потеряна, не генерировать новые пароли молча: повторить
секцию 8 осознанно и предупредить пользователей о новых credentials.

## 10. Материализация systemd templates

До установки подтвердить абсолютные пути `NODE_BIN`, `FLOCK_BIN`, пользователя
и группу. Tokens:

```text
@@APP_DIR@@
@@APP_USER@@
@@APP_GROUP@@
@@NODE_BIN@@
@@FLOCK_BIN@@
@@LEAD_DATA_DIR@@
```

После подстановки:

```bash
grep -R '@@' /etc/systemd/system/rospark-lead-* \
  && echo 'STOP: unresolved template token'

systemd-analyze verify \
  /etc/systemd/system/rospark-lead-outbox.service \
  /etc/systemd/system/rospark-lead-outbox.timer \
  /etc/systemd/system/rospark-lead-cleanup.service \
  /etc/systemd/system/rospark-lead-cleanup.timer
```

Только при пустом `grep` и успешном verify:

```bash
systemctl daemon-reload
systemctl start rospark-lead-cleanup.service
systemctl start rospark-lead-outbox.service
systemctl enable --now rospark-lead-cleanup.timer
systemctl enable --now rospark-lead-outbox.timer
```

Worker exit code `2` означает появление `dead` delivery job и намеренно
оставляет unit в failed state для диагностики. Timer продолжает проверять
очередь, но конкретная `dead`-запись автоматически больше не отправляется; PII
в агрегированном stdout отсутствует.

## 11. Acceptance

HTTP:

- `/`, `/demo`, `/contacts` — `200`;
- `/api/demo/requests` без сессии — `401`;
- `/admin/leads` без сессии — redirect на login;
- admin API без сессии — `401`;
- login без Origin — `403`;
- login Андрея/Сергея — `200`;
- удаление Сергеем — `403`.

Data:

- `PRAGMA quick_check` — `ok`;
- `PRAGMA foreign_key_check` — пусто;
- lead migrations `1`, `2`, `3`;
- одна TEST submission;
- один lead;
- один MAX outbox: сначала `pending`, затем `sent`;
- три status transitions;
- audit login/list/status/export без PII;
- TEST-лид закрыт outcome `test`.

Browser:

- desktop и mobile 390 px;
- нет горизонтального overflow;
- admin не загружает Метрику;
- admin не показывает публичный header/footer/cookie banner;
- browser console без ошибок.

Operations:

- оба timer `active (waiting)`;
- последний outbox run без `dead`;
- следующий trigger отображается;
- PM2 `online`;
- production SHA равен approved release SHA.

## 12. Rollback

### До первой новой production-заявки

1. Остановить и disable оба timer.
2. Остановить PM2.
3. Восстановить backup `.env.production`.
4. Вернуть exact rollback SHA только после проверки чистого working tree.
5. Выполнить `npm ci`, build и restart под Node.js 22.
6. Проверить публичный сайт и demo SQLite.

### После появления lead records

Код и env можно откатить, но файл
`/var/lib/rospark-leads/lead-registry.sqlite` нельзя удалять или заменять:
он остаётся источником уже принятых обращений. Сначала остановить timers,
создать online backup lead registry и только затем отключать feature gates.

Отправленное MAX-сообщение отозвать нельзя. TEST-запись закрывается outcome
`test`; ручное удаление выполняется только Андреем при отдельном решении.

Demo SQLite при обычном rollback L4 не восстанавливается: этот выпуск не меняет
её путь и schema. Восстановление demo-базы допустимо только при отдельно
подтверждённом повреждении.
