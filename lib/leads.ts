import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';
import { Bot } from '@maxhub/max-bot-api';

let maxBot: Bot | null = null;

function getMaxBot(token: string): Bot {
  if (!maxBot) {
    maxBot = new Bot(token);
  }
  return maxBot;
}


export type LeadPayload = {
  name: string;
  phone: string;
  phoneNormalized?: string;
  company?: string;
  objectType?: string;
  message?: string;
  source?: string;
  intent?: string;
  product?: string;
  packageName?: string;
  sourceUrl?: string;
  consent: boolean;
  sourcePage?: string;
  sourceSection?: string;
  utm?: Record<string, string | undefined>;
  userAgent?: string;
  ip?: string;
  timestamp?: string;
};

function envBool(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return defaultValue;
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatLeadText(payload: LeadPayload) {
  const lines: string[] = [];
  lines.push('РОСПАРК — новая заявка');
  lines.push('');
  lines.push(`Имя: ${payload.name}`);
  lines.push(`Телефон: ${payload.phone}`);
  if (payload.company) lines.push(`Компания: ${payload.company}`);
  if (payload.objectType) lines.push(`Тип объекта: ${payload.objectType}`);
  if (payload.message) lines.push(`Сообщение: ${payload.message}`);
  if (payload.intent) lines.push(`Цель обращения: ${payload.intent}`);
  if (payload.source) lines.push(`Источник/CTA: ${payload.source}`);
  if (payload.product) lines.push(`Интерес к продукту: ${payload.product}`);
  if (payload.packageName) lines.push(`Формат/пакет: ${payload.packageName}`);
  lines.push('');
  if (payload.sourcePage) lines.push(`Страница: ${payload.sourcePage}`);
  if (payload.sourceUrl) lines.push(`URL источника: ${payload.sourceUrl}`);
  if (payload.sourceSection) lines.push(`Раздел: ${payload.sourceSection}`);
  if (payload.ip) lines.push(`IP: ${payload.ip}`);
  if (payload.userAgent) lines.push(`User-Agent: ${payload.userAgent}`);
  if (payload.timestamp) lines.push(`Время: ${payload.timestamp}`);
  if (payload.utm && Object.keys(payload.utm).length > 0) {
    lines.push('');
    lines.push('UTM:');
    for (const [k, v] of Object.entries(payload.utm)) {
      if (!v) continue;
      lines.push(`- ${k}: ${v}`);
    }
  }
  return lines.join('\n');
}

let cachedTransport: Transporter | null = null;

function getMailTransport(): Transporter {
  if (cachedTransport) return cachedTransport;

  const host = process.env.LEAD_SMTP_HOST;
  const port = process.env.LEAD_SMTP_PORT ? Number(process.env.LEAD_SMTP_PORT) : 587;
  const secure = envBool(process.env.LEAD_SMTP_SECURE, port === 465);
  const user = process.env.LEAD_SMTP_USER;
  const pass = process.env.LEAD_SMTP_PASS;

  if (!host) {
    throw new Error('LEAD_SMTP_HOST не задан');
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  return cachedTransport;
}

async function sendToMax(text: string): Promise<boolean> {
  const token = process.env.LEAD_MAX_BOT_TOKEN;
  const chatId = process.env.LEAD_MAX_CHAT_ID;

  if (!token || !chatId) return false;

  const bot = getMaxBot(token);

  await bot.api.sendMessageToChat(
    Number(chatId),
    text
  );
  return true;
}

export async function sendLead(payload: LeadPayload) {
  const emailTo = splitList(process.env.LEAD_EMAIL_TO);
  const tgToken = process.env.LEAD_TELEGRAM_BOT_TOKEN;
  const tgChats = splitList(process.env.LEAD_TELEGRAM_CHAT_IDS);
  const hasEmail = emailTo.length > 0;
  const hasTelegram = Boolean(tgToken && tgChats.length > 0);
  const hasMax = Boolean(process.env.LEAD_MAX_BOT_TOKEN && process.env.LEAD_MAX_CHAT_ID);

  if (!hasEmail && !hasTelegram && !hasMax) {
    throw new Error('Не настроены каналы доставки заявок.');
  }

  const subject = `РОСПАРК: новая заявка`;
  const text = formatLeadText(payload);
  const deliveryResults: Array<{ channel: string; ok: boolean; error?: unknown }> = [];

  // EMAIL
  if (hasEmail) {
    try {
      const from = process.env.LEAD_EMAIL_FROM || emailTo[0];
      const transport = getMailTransport();
      await transport.sendMail({
        from,
        to: emailTo,
        subject,
        text
      });
      deliveryResults.push({ channel: 'email', ok: true });
    } catch (error) {
      deliveryResults.push({ channel: 'email', ok: false, error });
    }
  }

  // TELEGRAM
  if (hasTelegram && tgToken) {
    const apiUrl = `https://api.telegram.org/bot${tgToken}/sendMessage`;

    try {
      await Promise.all(
        tgChats.map(async (chatId) => {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              disable_web_page_preview: true
            })
          });

          if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`Telegram sendMessage failed: ${response.status} ${body}`);
          }
        })
      );
      deliveryResults.push({ channel: 'telegram', ok: true });
    } catch (error) {
      deliveryResults.push({ channel: 'telegram', ok: false, error });
    }
  }

  // MAX
  if (hasMax) {
    try {
      await sendToMax(text);
      deliveryResults.push({ channel: 'max', ok: true });
    } catch (error) {
      deliveryResults.push({ channel: 'max', ok: false, error });
    }
  }

  const delivered = deliveryResults.some((result) => result.ok);
  const failed = deliveryResults.filter((result) => !result.ok);

  if (failed.length > 0) {
    console.error('[lead] delivery failures', failed);
  }

  if (!delivered) {
    throw new Error('Не удалось доставить заявку ни в один канал.');
  }

  return deliveryResults;
}
