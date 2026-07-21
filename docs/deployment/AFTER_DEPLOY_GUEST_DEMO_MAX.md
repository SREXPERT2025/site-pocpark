# РОСПАРК: что сделать на VPS после деплоя demo-заявок и MAX

Дата инструкции: 17 июля 2026 года.

Проект на VPS: `/var/www/rospark-site`.

PM2-процесс: `rospark-site`

## Что настраивается отдельно от Git

Код сайта приезжает на VPS из Git, но секреты GREEN-API в репозиторий не добавляются. После деплоя необходимо отдельно настроить серверный файл `/var/www/rospark-site/.env.local`.

Важно:

- не записывать токен в `NEXT_PUBLIC_*` переменные;
- не публиковать содержимое `.env.local` в чате, логах или скриншотах;
- если токен когда-либо находился в клиентском HTML, сначала перевыпустить его в кабинете GREEN-API;
- значение `GREEN_API_API_URL` скопировать из настроек конкретного MAX-инстанса GREEN-API, не угадывать адрес вручную.

## 1. Зайти на VPS и проверить текущее состояние

```bash
cd /var/www/rospark-site
git status --short
git branch --show-current
pm2 list
```

Ожидаемая production-ветка на момент составления инструкции:

```text
feature/site-20260706-homepage-hygiene
```

Если `git status --short` показывает неизвестные изменения, не выполнять сброс и не удалять файлы. Сначала выяснить их назначение.

## 2. Сохранить резервную копию текущего окружения

Если `.env.local` уже существует:

```bash
cp .env.local ../rospark-site.env.local.backup
```

Резервную копию также нельзя добавлять в Git.

## 3. Обновить код после merge

```bash
cd /var/www/rospark-site
git fetch origin
git switch feature/site-20260706-homepage-hygiene
git pull --ff-only origin feature/site-20260706-homepage-hygiene
git log --oneline --decorate -5
```

Использовать только fast-forward. Не применять `git reset --hard`, если для этого нет отдельного согласованного плана отката.

## 4. Подготовить постоянный каталог SQLite

Код сайта находится в `/var/www/rospark-site`, а база намеренно хранится отдельно, чтобы `git pull`, сборка и новый релиз её не удалили:

```bash
mkdir -p /var/lib/rospark-demo
chmod 700 /var/lib/rospark-demo
```

Если PM2 запускается не от `root`, каталог должен принадлежать пользователю PM2-процесса:

```bash
pm2 show rospark-site
```

После определения пользователя назначить владельца каталога. Пример для пользователя `deploy`:

```bash
chown -R deploy:deploy /var/lib/rospark-demo
```

Не создавать файл SQLite вручную: приложение создаст таблицы при первом обращении к demo-кабинету.

## 5. Настроить MAX и путь базы

Открыть существующий файл, не затирая другие настройки сайта:

```bash
nano /var/www/rospark-site/.env.local
```

Добавить или обновить пять строк:

```env
DEMO_MAX_ENABLED=true
GREEN_API_API_URL=https://АДРЕС-API-ИЗ-КАБИНЕТА-GREEN-API
GREEN_API_ID_INSTANCE=ID_ИНСТАНСА
GREEN_API_TOKEN_INSTANCE=НОВЫЙ_СЕКРЕТНЫЙ_ТОКЕН
DEMO_REQUESTS_DB_PATH=/var/lib/rospark-demo/guest-requests.sqlite
```

Требования:

- `DEMO_MAX_ENABLED` должен быть ровно `true` в нижнем регистре;
- у `GREEN_API_API_URL` не требуется завершающий `/`;
- не добавлять кавычки вокруг значений без необходимости;
- не использовать префикс `NEXT_PUBLIC_`;
- сохранить остальные переменные окружения, которые уже были в файле.

Ограничить доступ к файлу:

```bash
chmod 600 /var/www/rospark-site/.env.local
```

Проверить только наличие строк, не выводя их значения:

```bash
awk -F= '/^(DEMO_MAX_ENABLED|GREEN_API_API_URL|GREEN_API_ID_INSTANCE|GREEN_API_TOKEN_INSTANCE|DEMO_REQUESTS_DB_PATH)=/{print $1 ": задано"}' .env.local
git check-ignore .env.local
```

Команда `git check-ignore` должна показать `.env.local`, то есть Git игнорирует этот файл.

## 6. Проверить Node.js, установить зависимости и собрать сайт

```bash
cd /var/www/rospark-site
node -v
npm ci
npm run build
```

Для `better-sqlite3` этой версии требуется Node.js `20.x` или новее. Для production использовать LTS Node.js 20 или 22. Если `npm ci` сообщает об ошибке сборки нативного модуля, сначала установить системные инструменты:

```bash
apt-get update
apt-get install -y build-essential python3
npm ci
```

Сборка должна завершиться без ошибок. В списке маршрутов должны присутствовать:

```text
/demo/gostevaya-zayavka
/demo/arendar/[token]
/api/demo/session
/api/demo/requests
/api/demo/share/max
```

## 7. Перезапустить production-процесс

```bash
pm2 restart rospark-site --update-env
pm2 save --force
pm2 list
```

Процесс `rospark-site` должен иметь статус `online`.

Посмотреть последние сообщения без непрерывного режима:

```bash
pm2 logs rospark-site --lines 100 --nostream
```

## 8. Проверить страницу после деплоя

Проверка непосредственно на VPS:

```bash
curl -sS -o /dev/null -w 'local demo: %{http_code}\n' http://127.0.0.1:3000/demo/gostevaya-zayavka
```

Проверка через публичный домен:

```bash
curl -sS -o /dev/null -w 'public demo: %{http_code}\n' https://www.роспарк.рф/demo/gostevaya-zayavka
```

Ожидаемый ответ в обоих случаях: `200`.

После первого входа в кабинет проверить создание базы:

```bash
ls -lh /var/lib/rospark-demo/guest-requests.sqlite*
```

Ожидается основной файл SQLite; при работе WAL также могут присутствовать временные файлы `-wal` и `-shm`.

## 9. Безопасно проверить, что MAX-конфигурация загрузилась

Следующая команда не содержит телефона и не отправляет сообщение. Она проверяет только состояние server route:

```bash
curl -sS -o /tmp/rospark-max-config-check.json -w 'MAX API check: %{http_code}\n' \
  -X POST http://127.0.0.1:3000/api/demo/share/max \
  -H 'Content-Type: application/json' \
  --data '{}'

cat /tmp/rospark-max-config-check.json
```

Ожидаемые варианты:

- `401` — интеграция включена, переменные найдены, а запрос отклонён из-за отсутствия demo-сессии; это правильный результат;
- `503` — `DEMO_MAX_ENABLED` выключен либо одна из переменных не загружена;
- `429` — выполнено слишком много проверок за минуту;
- `502` на этом тесте не ожидается, потому что запрос должен завершиться на локальной валидации до обращения к GREEN-API.

После изменения `.env.local` всегда повторять:

```bash
pm2 restart rospark-site --update-env
```

## 10. Выполнить один реальный тест MAX

1. Открыть `https://www.роспарк.рф/demo/gostevaya-zayavka`.
2. Войти с `TEST` / `TEST`.
3. Создать заявку на собственный тестовый номер, зарегистрированный в MAX.
4. Открыть созданную заявку.
5. Нажать `Отправить в MAX` один раз.
6. Убедиться, что сообщение пришло.
7. Проверить логи:

```bash
pm2 logs rospark-site --lines 100 --nostream
```

Токен, ID инстанса и телефон не должны появляться в сообщениях об ошибках сайта.

## 11. Проверить публичную ссылку на другом устройстве

Созданные пользователем заявки хранятся в SQLite до 24 часов. Публичная ссылка имеет вид:

```text
https://www.роспарк.рф/demo/arendar/СЛУЧАЙНЫЙ-ПУБЛИЧНЫЙ-ТОКЕН
```

Проверка:

1. Создать собственную demo-заявку.
2. Скопировать публичную ссылку.
3. Открыть её на телефоне или в приватном окне без входа `TEST/TEST`.
4. Убедиться, что карточка открылась, телефон скрыт, статус и QR-код отображаются.
5. Убедиться, что случайный несуществующий токен возвращает страницу `404`.

Demo всё ещё не управляет реальным шлагбаумом и не должен использоваться как настоящий пропускной режим.

## 12. Как быстро отключить отправку в MAX

Открыть `.env.local`:

```bash
nano /var/www/rospark-site/.env.local
```

Изменить:

```env
DEMO_MAX_ENABLED=false
```

Перезапустить приложение:

```bash
pm2 restart rospark-site --update-env
pm2 save --force
```

После этого кнопка MAX не будет выполнять автоматическую серверную отправку и перейдёт к безопасному резервному сценарию `Поделиться`.

## 13. Резервная копия SQLite

Перед крупным обновлением можно сделать согласованную копию через SQLite:

```bash
sqlite3 /var/lib/rospark-demo/guest-requests.sqlite ".backup '/var/lib/rospark-demo/guest-requests.backup.sqlite'"
```

Не копировать работающий WAL-файл обычной командой `cp` как единственный способ резервирования.

## 14. Короткий чек-лист

- [ ] Код после merge обновлён через `git pull --ff-only`.
- [ ] Старый открытый токен GREEN-API перевыпущен.
- [ ] `.env.local` сохранён на VPS и имеет права `600`.
- [ ] Каталог `/var/lib/rospark-demo` существует и доступен пользователю PM2.
- [ ] `DEMO_REQUESTS_DB_PATH=/var/lib/rospark-demo/guest-requests.sqlite`.
- [ ] `DEMO_MAX_ENABLED=true`.
- [ ] `GREEN_API_API_URL`, ID и токен взяты из нужного MAX-инстанса.
- [ ] `npm ci` и `npm run build` завершились успешно.
- [ ] `pm2 restart rospark-site --update-env` выполнен.
- [ ] PM2 показывает `rospark-site` в состоянии `online`.
- [ ] Demo-страница отвечает `200` локально и через домен.
- [ ] После первого входа создан файл SQLite.
- [ ] Безопасная проверка MAX возвращает `401`, а не `503`.
- [ ] Один тест на собственный MAX-номер успешно получен.
- [ ] Проверены PM2-логи.
- [ ] Публичная ссылка открылась на другом устройстве без входа в кабинет.
