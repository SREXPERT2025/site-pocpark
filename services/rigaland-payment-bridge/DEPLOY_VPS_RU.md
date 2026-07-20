# Отдельное развёртывание Riga Land bridge на Ubuntu VPS

Мост развёртывается независимо от сайта. Команды ниже не запускают PM2 и не
вызывают обычный deploy сайта. Валидный POST оплаты в инструкции отсутствует.

## 1. Read-only аудит VPS

Сначала выполнить по одной команде, ничего не изменяя:

```bash
uname -a
```

```bash
cat /etc/os-release
```

```bash
systemd --version
```

```bash
id
```

```bash
command -v python3
```

```bash
command -v curl
```

```bash
command -v sqlite3
```

```bash
command -v nginx
```

```bash
sudo systemctl --no-pager --full status rigaland-payment-bridge.service || true
```

```bash
sudo journalctl -u rigaland-payment-bridge.service -n 50 --no-pager
```

```bash
sudo ss -ltnp
```

```bash
sudo nginx -T 2>/dev/null | grep -n "rigaland/payment-bridge" || true
```

```bash
df -h /opt /var/lib /etc/nginx
```

До продолжения нужно подтвердить Ubuntu, systemd и отсутствие конфликтующего
listener на `127.0.0.1:3102`.

## 2. Проверка checkout репозитория

Перейти в уже известный корень checkout репозитория сайта. Не использовать
предполагаемый путь, пока он не подтверждён командой `pwd`.

```bash
pwd
```

```bash
git rev-parse --show-toplevel
```

```bash
git status --short
```

```bash
test -f services/rigaland-payment-bridge/bridge.py
```

```bash
sha256sum services/rigaland-payment-bridge/bridge.py
```

Ожидаемый SHA-256:

`455bd893127d51d3c02789757234d82c6453b8c7616fd1d243a59c1287a3b5f7`

## 3. Локальные тесты перед установкой

Из корня репозитория:

```bash
cd services/rigaland-payment-bridge
```

```bash
PYTHONPATH=. python3 -m unittest discover -s tests -p 'test_bridge.py' -v
```

Если Node.js уже установлен, проверить обе PH-копии:

```bash
node tests/test_pubpay.js
```

```bash
PUBPAY_HTML="$PWD/ph-parking/pubpay.vps.html" EXPECTED_BRIDGE_URL="https://xn--80aukedde.xn--p1ai/rigaland/payment-bridge" node tests/test_pubpay.js
```

```bash
python3 -m py_compile bridge.py
```

```bash
bash -n deploy/*.sh
```

## 4. Первоначальная установка только bridge

Команда создаёт отдельного системного пользователя, `/opt` и `/var/lib`,
устанавливает unit и запускает только `rigaland-payment-bridge.service`:

```bash
sudo bash deploy/install-vps.sh
```

Проверить:

```bash
sudo bash deploy/check-vps.sh
```

Безопасный ручной smoke GET:

```bash
curl -sS -D - -o /dev/null http://127.0.0.1:3102/rigaland/payment-bridge
```

Ожидается `405 Method Not Allowed`. Не выполнять POST.

## 5. Отдельное подключение Nginx

Если принято отдельное решение публиковать маршрут, snippet можно установить
явным флагом. Эта команда не редактирует server block и не reload-ит Nginx:

```bash
sudo bash deploy/install-vps.sh --install-nginx-snippet
```

В существующий HTTPS server block домена вручную добавить единственную строку:

```nginx
include /etc/nginx/snippets/rigaland-payment-bridge.conf;
```

После отдельной проверки diff Nginx:

```bash
sudo nginx -t
```

```bash
sudo systemctl reload nginx
```

Публичный безопасный GET:

```bash
curl -sS -D - -o /dev/null https://xn--80aukedde.xn--p1ai/rigaland/payment-bridge
```

Ожидается `405`. Порт 3102 наружу не публикуется.

## 6. Порядок обновления bridge и PH Parking

Порядок обязателен: новая клиентская форма не должна появиться раньше серверной
поддержки `payment_id`.

### Шаг 1. Сначала обновить bridge.py на VPS

Из `services/rigaland-payment-bridge` нового checkout:

```bash
sudo bash deploy/update-vps.sh
```

Скрипт проверит SHA, выполнит Python-тесты и `py_compile`, сохранит датированную
копию, установит файл атомарно, перезапустит только bridge и проверит GET=405.
При ошибке после создания backup выполняется автоматический rollback.

После обновления:

```bash
sudo bash deploy/check-vps.sh
```

Безопасный GET должен вернуть 405. POST на этом шаге не выполнять.

### Шаг 2. Затем установить pubpay.vps.html на PH Parking

Готовый файл:

`services/rigaland-payment-bridge/ph-parking/pubpay.vps.html`

Он указывает только на VPS-маршрут
`https://xn--80aukedde.xn--p1ai/rigaland/payment-bridge`. Текущий
`ph-parking/pubpay.html` продолжает указывать на резервный мост Mac Studio.
Обе копии — Windows-1251, CRLF, без BOM. Установка файла на PH Parking —
отдельный ручной согласованный шаг.

### Шаг 3. Проверить QR-сценарий

После установки клиентского файла выполнить один контролируемый тест оплаты по
QR-билету. Ожидается передача `code` в bridge и прямой HTTP 303 на разрешённый
checkout URL.

### Шаг 4. Проверить поиск по государственному номеру

На отдельном действующем клиенте выполнить один контролируемый тест после
поиска автомобиля. Для страницы `/pub/pay?id=<id>` значение должно совпасть с
`client_id` формы; bridge получает `payment_id` и обращается к фиксированному
upstream-пути `/pub/pay?id=<id>`, после чего также возвращает прямой HTTP 303.

Автоматически или в рамках install/update-скриптов реальные платёжные POST не
выполняются.

## 7. Ручной rollback

```bash
sudo bash deploy/rollback-vps.sh
```

Скрипт выбирает последнюю резервную копию, атомарно восстанавливает
`bridge.py`, перезапускает только bridge и проверяет GET=405.

## 8. Что не должно происходить

- запуск PM2;
- restart/reload сайта;
- автоматическое изменение server block Nginx;
- публикация `0.0.0.0:3102` или `[::]:3102`;
- передача `target_url`/`return_url`;
- копирование state DB, логов, cookie или `.env` в Git;
- валидный POST оплаты во время установки, обновления или проверки.
