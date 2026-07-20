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

`9876592bf3dc8d8a02e697a42e61089f150200655bf93962f7cc7893fec2df2a`

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

## 6. PH Parking файл для будущего VPS

Для будущего переключения PH Parking использовать:

`ph-parking/pubpay.vps.html`

Текущий `ph-parking/pubpay.html` продолжает указывать на действующий мост Mac
Studio. Обе копии — Windows-1251, CRLF, без BOM. Перед фактической заменой PH
файла необходим отдельный согласованный шаг и контролируемая проверка.

## 7. Обновление bridge.py

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

## 8. Ручной rollback

```bash
sudo bash deploy/rollback-vps.sh
```

Скрипт выбирает последнюю резервную копию, атомарно восстанавливает
`bridge.py`, перезапускает только bridge и проверяет GET=405.

## 9. Что не должно происходить

- запуск PM2;
- restart/reload сайта;
- автоматическое изменение server block Nginx;
- публикация `0.0.0.0:3102` или `[::]:3102`;
- передача `target_url`/`return_url`;
- копирование state DB, логов, cookie или `.env` в Git;
- валидный POST оплаты во время установки, обновления или проверки.
