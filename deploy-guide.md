# ROSPARK Frontend — Deploy Guide (DevOps)

Документ: `deploy-guide.md`  
Проект: **ROSPARK Frontend (Next.js App Router)**  
Цель: развернуть проект на «чистом» сервере **Ubuntu/Debian**.

---

## 1) Предпосылки и допущения

- Домен/поддомен уже настроен на ваш сервер (A/AAAA записи).
- Доступ по SSH (ключи) к пользователю с правами `sudo`.
- Вариант деплоя: **Node.js + systemd + Nginx (reverse proxy)**.
- Проект запускается в режиме `next start` после сборки.

---

## 2) Установка системных пакетов

```bash
sudo apt-get update
sudo apt-get install -y git curl nginx
```

### Установка Node.js (рекомендуется Node 20 LTS)

Вариант через NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

---

## 3) Размещение кода на сервере

Рекомендуемая структура:

- Код: `/var/www/rospark-frontend`
- Пользователь: `www-data` или отдельный `deploy` пользователь

```bash
sudo mkdir -p /var/www/rospark-frontend
sudo chown -R $USER:$USER /var/www/rospark-frontend
cd /var/www/rospark-frontend

# Вариант 1: клонировать репозиторий
# git clone <REPO_URL> .

# Вариант 2: залить архивом и распаковать
# unzip rospark-frontend.zip -d .
```

---

## 4) Переменные окружения

Создайте файл `.env.local` (не коммитится в репозиторий):

```bash
cd /var/www/rospark-frontend
nano .env.local
```

Рекомендуемый минимум:

```env
# Публичный URL сайта. Используется для robots/sitemap.
NEXT_PUBLIC_SITE_URL=https://rospark.rf

# (опционально) если появится внешний API
# NEXT_PUBLIC_API_URL=https://api.rospark.rf
```

> Примечание: **Next.js** читает `.env.local` автоматически.

---

## 5) Установка зависимостей и сборка

```bash
cd /var/www/rospark-frontend
npm install
npm run build
```

---

## 6) Локальная проверка на сервере

```bash
npm run start -- -p 3000
# Проверка: http://127.0.0.1:3000
```

Остановить: `Ctrl+C`

---

## 7) Запуск через systemd

Создайте unit-файл:

```bash
sudo nano /etc/systemd/system/rospark-frontend.service
```

Содержимое:

```ini
[Unit]
Description=ROSPARK Frontend (Next.js)
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/rospark-frontend
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- -p 3000
Restart=always
RestartSec=5
User=www-data
Group=www-data

# Чтобы Next видел .env.local, он должен быть доступен в WorkingDirectory.
# При необходимости можно задать EnvironmentFile=/var/www/rospark-frontend/.env.local

[Install]
WantedBy=multi-user.target
```

Далее:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rospark-frontend
sudo systemctl start rospark-frontend
sudo systemctl status rospark-frontend --no-pager
```

Логи:

```bash
sudo journalctl -u rospark-frontend -f
```

---

## 8) Nginx reverse proxy

Создайте конфиг сайта:

```bash
sudo nano /etc/nginx/sites-available/rospark-frontend
```

Содержимое:

```nginx
server {
  listen 80;
  server_name rospark.rf www.rospark.rf;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket (на будущее)
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Активируйте:

```bash
sudo ln -sf /etc/nginx/sites-available/rospark-frontend /etc/nginx/sites-enabled/rospark-frontend
sudo nginx -t
sudo systemctl reload nginx
```

---

## 9) HTTPS (рекомендуется) — Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d rospark.rf -d www.rospark.rf
```

Автопродление:

```bash
sudo systemctl status certbot.timer --no-pager
```

---

## 10) Обновление проекта (release flow)

Рекомендуемый сценарий:

```bash
cd /var/www/rospark-frontend
git pull
npm install
npm run build
sudo systemctl restart rospark-frontend
```

---

## 11) Контент (Markdown)

Контент управляется файлами Markdown в директории:

- `/content/resheniya`
- `/content/oborudovanie`
- `/content/keysy`

После добавления/правок контента требуется:

```bash
npm run build
sudo systemctl restart rospark-frontend
```

---

## 12) Troubleshooting

- Проверить сервис:
  ```bash
  sudo systemctl status rospark-frontend --no-pager
  sudo journalctl -u rospark-frontend -n 200 --no-pager
  ```
- Проверить Nginx:
  ```bash
  sudo nginx -t
  sudo tail -n 200 /var/log/nginx/error.log
  ```
- Проверить порт:
  ```bash
  ss -lntp | grep 3000
  ```
