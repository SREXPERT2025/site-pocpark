import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';

export type LeadPayload = {
  name: string;
  phone: string;
  phoneNormalized?: string;
  company?: string;
  objectType?: string;
  message?: string;
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

/**
 * Plain-text формат (для Telegram)
 * Без разметки, без parse_mode, безопасно
 */
function formatLeadText(payload: LeadPayload) {
  const lines: string[] = [];
  lines.push('РОСПАРК — новая заявка');
  lines.push('');
  lines.push(`Имя: ${payload.name}`);
  lines.push(`Телефон: ${payload.phone}`);
  if (payload.company) lines.push(`Компания: ${payload.company}`);
  if (payload.objectType) lines.push(`Тип объекта: ${payload.objectType}`);
  if (payload.message) lines.push(`Сообщение: ${payload.message}`);
  lines.push('');
  if (payload.sourcePage) lines.push(`Страница: ${payload.sourcePage}`);
  if (payload.sourceSection) lines.push(`Раздел: ${payload.sourceSection}`);
  if (payload.ip) lines.push(`IP: ${payload.ip}`);
  if (payload.userAgent) lines.push(`User-Agent: ${payload.userAgent}`);
  if (payload.timestamp) lines.push(`Время: ${payload.timestamp}`);
  if (payload.utm && Object.keys(payload.utm).length > 0) {
    lines.push('');
    lines.push('UTM / Click IDs:');
    for (const [k, v] of Object.entries(payload.utm)) {
      if (!v) continue;
      lines.push(`- ${k}: ${v}`);
    }
  }
  return lines.join('\n');
}

/**
 * HTML-версия (для Email)
 */
function formatLeadHtml(payload: LeadPayload) {
  const kv: Array<[string, string]> = [
    ['Имя', payload.name],
    ['Телефон', payload.phone],
  ];
  if (payload.company) kv.push(['Компания', payload.company]);
  if (payload.objectType) kv.push(['Тип объекта', payload.objectType]);
  if (payload.message) kv.push(['Сообщение', payload.message]);
  if (payload.sourcePage) kv.push(['Страница', payload.sourcePage]);
  if (payload.sourceSection) kv.push(['Раздел', payload.sourceSection]);
  if (payload.ip) kv.push(['IP', payload.ip]);
  if (payload.userAgent) kv.push(['User-Agent', payload.userAgent]);
  if (payload.timestamp) kv.push(['Время', payload.timestamp]);

  const utmRows = payload.utm
    ? Object.entries(payload.utm)
        .filter(([, v]) => Boolean(v))
        .map(
          ([k, v]) =>
            `<tr>
              <td style="padding:6px 10px;border:1px solid #e5e7eb;"><b>${escapeHtml(k)}</b></td>
              <td style="padding:6px 10px;border:1px solid #e5e7eb;">${escapeHtml(String(v))}</td>
            </tr>`
        )
        .join('')
    : '';

  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;">
    <h2>РОСПАРК — новая заявка</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 760px;">
      ${kv
        .map(
          ([k, v]) =>
            `<tr>
              <td style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb;width:200px;"><b>${escapeHtml(
                k
              )}</b></td>
              <td style="padding:6px 10px;border:1px solid #e5e7eb;">${escapeHtml(v)}</td>
            </tr>`
        )
        .join('')}
    </table>
    ${
      utmRows
        ? `<h3 style="margin-top:16px;">UTM / Click IDs</h3>
           <table style="border-collapse: collapse; width: 100%; max-width: 760px;">${utmRows}</table>`
        : ''
    }
    <p style="margin-top:16px;color:#6b7280;font-size:12px;">
      Автоматическое уведомление. Ответьте клиенту по телефону.
    </p>
  </div>`;
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

export async function sendLead(payload: LeadPayload) {
  const emailTo = splitList(process.env.LEAD_EMAIL_TO);
  const tgToken = process.env.LEAD_TELEGRAM_BOT_TOKEN;
  const tgChats = splitList(process.env.LEAD_TELEGRAM_CHAT_IDS);
  const tgTopicRaw = (process.env.LEAD_TELEGRAM_TOPIC_ID || '').trim();
  const tgTopicId = tgTopicRaw ? Number.parseInt(tgTopicRaw, 10) : undefined;
  const hasTopic = Number.isFinite(tgTopicId);

  if (emailTo.length === 0 && (!tgToken || tgChats.length === 0)) {
    throw new Error(
      'Не настроены каналы доставки. Нужен LEAD_EMAIL_TO и/или LEAD_TELEGRAM_BOT_TOKEN + LEAD_TELEGRAM_CHAT_IDS.'
    );
  }

  const subject = `РОСПАРК: заявка${payload.sourceSection ? ` — ${payload.sourceSection}` : ''}`;
  const text = formatLeadText(payload);
  const html = formatLeadHtml(payload);

  // 1) Email
  if (emailTo.length > 0) {
    const from = process.env.LEAD_EMAIL_FROM || emailTo[0];
    const transport = getMailTransport();
    await transport.sendMail({
      from,
      to: emailTo,
      subject,
      text,
      html,
    });
  }

  // 2) Telegram (БЕЗ parse_mode)
  if (tgToken && tgChats.length > 0) {
    const apiUrl = `https://api.telegram.org/bot${tgToken}/sendMessage`;

    await Promise.all(
      tgChats.map(async (chatId) => {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            disable_web_page_preview: true,
            ...(hasTopic ? { message_thread_id: tgTopicId } : {}),
          }),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
        }
      })
    );
  }
}
