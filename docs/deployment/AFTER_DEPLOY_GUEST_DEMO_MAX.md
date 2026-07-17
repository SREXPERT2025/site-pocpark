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

## 4. Настроить MAX через GREEN-API

Открыть существующий файл, не затирая другие настройки сайта:

```bash
nano /var/www/rospark-site/.env.local
```

Добавить или обновить четыре строки:

```env
DEMO_MAX_ENABLED=true
GREEN_API_API_URL=https://АДРЕС-API-ИЗ-КАБИНЕТА-GREEN-API
GREEN_API_ID_INSTANCE=ID_ИНСТАНСА
GREEN_API_TOKEN_INSTANCE=НОВЫЙ_СЕКРЕТНЫЙ_ТОКЕН
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
awk -F= '/^(DEMO_MAX_ENABLED|GREEN_API_API_URL|GREEN_API_ID_INSTANCE|GREEN_API_TOKEN_INSTANCE)=/{print $1 ": задано"}' .env.local
git check-ignore .env.local
```

Команда `git check-ignore` должна показать `.env.local`, то есть Git игнорирует этот файл.

## 5. Установить зависимости и собрать сайт

```bash
cd /var/www/rospark-site
npm ci
npm run build
```

Сборка должна завершиться без ошибок. В списке маршрутов должны присутствовать:

```text
/demo/gostevaya-zayavka
/api/demo/share/max
```

## 6. Перезапустить production-процесс

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

## 7. Проверить страницу после деплоя

Проверка непосредственно на VPS:

```bash
curl -sS -o /dev/null -w 'local demo: %{http_code}\n' http://127.0.0.1:3000/demo/gostevaya-zayavka
```

Проверка через публичный домен:

```bash
curl -sS -o /dev/null -w 'public demo: %{http_code}\n' https://www.роспарк.рф/demo/gostevaya-zayavka
```

Ожидаемый ответ в обоих случаях: `200`.

## 8. Безопасно проверить, что MAX-конфигурация загрузилась

Следующая команда не содержит телефона и не отправляет сообщение. Она проверяет только состояние server route:

```bash
curl -sS -o /tmp/rospark-max-config-check.json -w 'MAX API check: %{http_code}\n' \
  -X POST http://127.0.0.1:3000/api/demo/share/max \
  -H 'Content-Type: application/json' \
  --data '{}'

cat /tmp/rospark-max-config-check.json
```

Ожидаемые варианты:

- `400` — интеграция включена, переменные найдены, тестовый запрос отклонён из-за отсутствия телефона и текста; это правильный результат;
- `503` — `DEMO_MAX_ENABLED` выключен либо одна из переменных не загружена;
- `429` — выполнено слишком много проверок за минуту;
- `502` на этом тесте не ожидается, потому что запрос должен завершиться на локальной валидации до обращения к GREEN-API.

После изменения `.env.local` всегда повторять:

```bash
pm2 restart rospark-site --update-env
```

## 9. Выполнить один реальный тест MAX

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

## 10. Важное ограничение текущей demo-версии

Сейчас заявки хранятся в `localStorage` браузера. Домен в скопированной ссылке после деплоя будет правильным, например:

```text
https://www.роспарк.рф/demo/gostevaya-zayavka?request=D3M0202600000004
```

Но такая заявка откроется только в том браузере, где она была создана. На телефоне гостя данных заявки пока не будет.

До реализации серверного хранилища и публичного токена:

- считать отправку в MAX демонстрацией транспорта сообщения;
- не обещать клиенту рабочую межустройственную публичную заявку;
- не использовать demo для реальных персональных данных и настоящего пропускного режима.

## 11. Как быстро отключить отправку в MAX

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

## 12. Короткий чек-лист

- [ ] Код после merge обновлён через `git pull --ff-only`.
- [ ] Старый открытый токен GREEN-API перевыпущен.
- [ ] `.env.local` сохранён на VPS и имеет права `600`.
- [ ] `DEMO_MAX_ENABLED=true`.
- [ ] `GREEN_API_API_URL`, ID и токен взяты из нужного MAX-инстанса.
- [ ] `npm ci` и `npm run build` завершились успешно.
- [ ] `pm2 restart rospark-site --update-env` выполнен.
- [ ] PM2 показывает `rospark-site` в состоянии `online`.
- [ ] Demo-страница отвечает `200` локально и через домен.
- [ ] Безопасная проверка MAX возвращает `400`, а не `503`.
- [ ] Один тест на собственный MAX-номер успешно получен.
- [ ] Проверены PM2-логи.
- [ ] Учтено ограничение `localStorage`: публичная ссылка пока не работает между устройствами.
