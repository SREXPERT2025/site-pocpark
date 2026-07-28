# AI-виджет РОСПАРК — закрытый канал Tailscale

Дата: 28.07.2026

Статус: схема принята, команды подготовлены; установка и production cutover
не выполнялись

## 1. Результат

Только production VPS получает доступ к HTTPS gateway на Mac Studio:

```text
www.роспарк.рф
       |
       v
production VPS (tag:rospark-vps)
       |
       | Tailscale, только tcp:443
       v
Mac Studio (tag:rospark-ai-gateway)
       |
       | Tailscale Serve HTTPS
       v
127.0.0.1:8788 production gateway
```

Порт `8788` остаётся loopback. Tailscale Funnel не включается. Gateway
дополнительно требует production bearer secret, поэтому одного сетевого
доступа недостаточно.

Используются нейтральные имена машин:

- VPS: `rsp-vps-prod`;
- Mac Studio: `rsp-ai-gw-prod`.

## 2. Что нужно сделать владельцу

1. Создать или выбрать один Tailscale tailnet.
2. Подключить VPS и Mac Studio к одному аккаунту.
3. Включить MagicDNS и HTTPS certificates.
4. Сохранить access policy с grant из раздела 5.

При включении Tailscale HTTPS имена машин и tailnet DNS name попадают в
публичный журнал сертификатов. Поэтому в именах не используются ФИО,
внутренние адреса, пароли и другие закрытые сведения.

## 3. Mac Studio

Установить рекомендуемую standalone-версию Tailscale для macOS:

<https://tailscale.com/docs/install/mac>

Запустить приложение, войти в выбранный tailnet и убедиться, что Mac Studio
виден на странице Machines. В административной панели:

1. переименовать устройство в `rsp-ai-gw-prod`;
2. назначить ему tag `tag:rospark-ai-gateway`;
3. не включать Exit Node и Funnel.

До публикации HTTPS production gateway должен уже отвечать локально:

Production env создаётся без вывода секрета:

```bash
AI_WIDGET_GATEWAY_ENV_FILE="$PWD/.env.ai-widget-production.local" \
  npm run ai-widget-gateway-production:configure
```

```bash
curl --fail --silent --show-error \
  http://127.0.0.1:8788/health \
  -H "Authorization: Bearer ${AI_WIDGET_GATEWAY_SECRET}"
```

Сам secret не вставляется прямо в командную строку и не сохраняется в shell
history. Его следует загрузить из production env процесса.

После проверки gateway включить приватный HTTPS reverse proxy:

```bash
tailscale serve --bg --https=443 http://127.0.0.1:8788
tailscale serve status
tailscale funnel status
```

Ожидается:

- Serve сообщает адрес
  `https://rsp-ai-gw-prod.<tailnet>.ts.net`;
- Funnel не публикует ни одного адреса;
- backend остаётся `http://127.0.0.1:8788`.

Если CLI не находится в `PATH`, используется CLI из установленной
standalone-версии Tailscale либо включается её штатная установка CLI.

## 4. Production VPS Ubuntu

Установить Tailscale по официальной инструкции:

<https://tailscale.com/docs/install/linux>

Команды выполняются на VPS:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --hostname=rsp-vps-prod
tailscale status
tailscale ip
```

`tailscale up` покажет одноразовую ссылку входа. Её открывает владелец и
подключает VPS к тому же tailnet. После появления VPS на странице Machines
ему назначается tag `tag:rospark-vps`.

Не включать Exit Node, subnet routes или Tailscale SSH в рамках этой задачи:
они не нужны AI-виджету и расширяют область доступа.

## 5. Минимальный grant

В Tailscale Admin Console открыть Access controls и добавить к существующей
политике следующие владельцы tags и grant. Существующие правила других
сервисов нельзя удалять или заменять вслепую.

```json
{
  "tagOwners": {
    "tag:rospark-vps": ["autogroup:admin"],
    "tag:rospark-ai-gateway": ["autogroup:admin"]
  },
  "grants": [
    {
      "src": ["tag:rospark-vps"],
      "dst": ["tag:rospark-ai-gateway"],
      "ip": ["tcp:443"]
    }
  ]
}
```

Tailscale рекомендует grants для новых политик. Сохранение policy должно
пройти встроенную проверку синтаксиса:

<https://tailscale.com/docs/features/access-control/grants>

Если в действующей policy уже есть `tagOwners` или `grants`, новые элементы
добавляются внутрь существующих секций, а не создаются повторно.

Grants являются разрешающими и не отменяют более широкое действующее правило.
Перед приёмкой нужно проверить, что никакой другой grant или legacy ACL не
разрешает всем участникам tailnet доступ к
`tag:rospark-ai-gateway:443`. Если tailnet создан с правилом allow-all, это
правило необходимо сузить до запуска production. Иначе условие «только VPS»
не выполнено.

## 6. Проверка с VPS

На Mac Studio получить адрес из `tailscale serve status`. На VPS сохранить
его только на время проверки:

```bash
read -r -p 'Tailscale HTTPS URL Mac Studio: ' AI_WIDGET_GATEWAY_URL
read -r -s -p 'Production gateway secret: ' AI_WIDGET_GATEWAY_SECRET
echo

curl --fail --silent --show-error \
  "${AI_WIDGET_GATEWAY_URL}/health" \
  -H "Authorization: Bearer ${AI_WIDGET_GATEWAY_SECRET}"

unset AI_WIDGET_GATEWAY_URL
unset AI_WIDGET_GATEWAY_SECRET
```

Ожидаемый ответ:

```json
{"status":"ok","runtime_mode":"production"}
```

Обязательные отрицательные проверки:

1. запрос без bearer secret возвращает отказ;
2. другой узел tailnet без разрешающего grant не подключается к `tcp:443`;
3. устройство вне tailnet не открывает URL;
4. публичный IP Mac Studio не слушает `8788`;
5. `tailscale funnel status` не показывает опубликованный сервис.

## 7. Передача URL сайту

После успешной проверки точный HTTPS URL передаётся конфигуратору VPS через
`AI_WIDGET_PRODUCTION_GATEWAY_URL`. В Git, MAX, браузерный JavaScript и
публичную документацию конкретный tailnet URL не добавляется.

Bearer secret для Mac Studio и VPS должен быть одинаковым, иметь не менее
32 случайных байт и храниться только в production env с режимом `600`.

Только после этого запускается:

```bash
npm run ai-widget-production:check
```

Readiness check не создаёт лид и не отправляет сообщение в MAX.

## 8. Отключение

Чтобы закрыть HTTPS gateway на Mac Studio без удаления tailnet:

```bash
tailscale serve --https=443 off
tailscale serve status
```

После отключения публичный сайт переводится в fail-closed через
`AI_WIDGET_ENABLED=false`. Уже созданные лиды и журналы не удаляются.

## 9. Источники

- установка macOS:
  <https://tailscale.com/docs/install/mac>;
- установка Linux:
  <https://tailscale.com/docs/install/linux>;
- приватный HTTPS Serve:
  <https://tailscale.com/docs/features/tailscale-serve>;
- HTTPS certificates:
  <https://tailscale.com/docs/how-to/set-up-https-certificates>;
- grants:
  <https://tailscale.com/docs/features/access-control/grants>.
