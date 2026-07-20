# Riga Land payment bridge

Изолированный серверный мост для формы PH Parking Riga Land. Мост принимает
штатный POST формы, обращается только к фиксированному upstream PH Parking и
при успехе возвращает браузеру прямой HTTP 303 на проверенный checkout URL.
Интеграции с API ЮKassa, ключей ЮKassa и произвольного целевого URL в проекте нет.

## Режимы оплаты

Мост поддерживает два независимых источника, причём браузер передаёт ровно
один служебный идентификатор:

- QR-билет: нормализованный `code` формирует фиксированный upstream-путь
  `/pub/pay?code=<code>`;
- поиск автомобиля: единственный query-параметр `id`, строго совпадающий с
  `client_id` штатной формы, передаётся мосту как `payment_id`; сервер формирует
  фиксированный upstream-путь `/pub/pay?id=<payment_id>`.

`code` и `payment_id` удаляются из upstream-тела, а остальные байты штатной
формы PH Parking передаются без изменения. Оба режима используют тот же curl
transport, parser, polling и строгий checkout allowlist и при успехе возвращают
прямой HTTP 303.

## Изоляция от сайта

Этот каталог хранится в репозитории сайта, но не является частью Next.js,
PM2 или обычного site-deploy. Установка выполняется только явным ручным
запуском скриптов из `deploy/`. Скрипты моста не изменяют и не перезапускают
сайт, PM2 или Nginx. Nginx snippet подключается отдельно и вручную.

Целевая публичная точка после отдельного VPS-релиза:

`https://xn--80aukedde.xn--p1ai/rigaland/payment-bridge`

Внутренний Python listener остаётся только на `127.0.0.1:3102`.

## Состав

- `bridge.py` — VPS-версия проверенного моста с прямым успешным HTTP 303;
- `tests/test_bridge.py` — Python-тесты транспорта, parser, allowlist и flow;
- `tests/test_pubpay.js` — тесты Apple routing, fallback и submit guard;
- `ph-parking/pubpay.html` — текущая релизная PH-копия с действующим адресом Mac Studio;
- `ph-parking/pubpay.vps.html` — будущая VPS-копия, отличающаяся только bridge action;
- `.gitattributes` — сохраняет оба Windows-1251/CRLF HTML-файла побайтово, без преобразования Git;
- `deploy/rigaland-payment-bridge.service` — изолированная systemd-служба;
- `deploy/nginx-rigaland-payment-bridge.conf` — exact-match Nginx location;
- `deploy/install-vps.sh` — первоначальная установка;
- `deploy/update-vps.sh` — тестируемое атомарное обновление с rollback;
- `deploy/check-vps.sh` — read-only/safe GET проверка;
- `deploy/rollback-vps.sh` — восстановление последней резервной версии.

## Контрольные суммы этой версии

- `bridge.py`: `455bd893127d51d3c02789757234d82c6453b8c7616fd1d243a59c1287a3b5f7`;
- `ph-parking/pubpay.html`: `b0aba4a1c6ac8a057f62a1075963cd5e549e3b86e2d5e88abf35685c1d1e727e`;
- `ph-parking/pubpay.vps.html`: `0c7feb99b2a79ca0b49e0ca9d792ae1b831f300ffd31c088f08d3b9cc2feba6f`.

Хеш `bridge.py` также закреплён в install/update-скриптах. При следующем
осознанном релизе `bridge.py` его нужно обновить там одновременно с кодом.

Резервный мост Mac Studio не обновляется и не удаляется этими файлами.

## Runtime

- Ubuntu с systemd;
- Python 3, только стандартная библиотека;
- системные `curl` и `sqlite3`;
- Nginx только для отдельного reverse-proxy include.

PyPI-зависимостей нет, что отражено в `requirements.txt`.

## Локальные проверки

Из этого каталога:

```bash
PYTHONPATH=. python3 -m unittest discover -s tests -p 'test_bridge.py' -v
node tests/test_pubpay.js
PUBPAY_HTML="$PWD/ph-parking/pubpay.vps.html" \
  EXPECTED_BRIDGE_URL="https://xn--80aukedde.xn--p1ai/rigaland/payment-bridge" \
  node tests/test_pubpay.js
python3 -m py_compile bridge.py
bash -n deploy/*.sh
```

Эти проверки используют fixtures, fake upstream и GET/405. Они отдельно
проверяют QR `code` и поиск автомобиля через `payment_id`; валидный POST оплаты
ими не выполняется.

## Безопасность данных

- внешний upstream и checkout allowlist зафиксированы в коде;
- `target_url`, `return_url` и неизвестные поля отклоняются приложением;
- Nginx удаляет входящие `Cookie` и `Authorization`;
- SQLite, WAL/SHM, логи, cookie jars, `.env`, секреты и временные curl-файлы
  исключены через локальный `.gitignore`;
- в репозиторий не включены журналы реальных запросов, state DB или активные
  cookie;
- checkout URL в тестах синтетические и не являются действующими платежами.

Пошаговая инструкция: [DEPLOY_VPS_RU.md](DEPLOY_VPS_RU.md).
