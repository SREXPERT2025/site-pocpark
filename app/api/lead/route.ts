import { NextResponse } from 'next/server';
import { sendLead, type LeadPayload } from '@/lib/leads';

export const runtime = 'nodejs';

function getClientIp(req: Request): string | undefined {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  const xr = req.headers.get('x-real-ip');
  if (xr) return xr.trim();
  return undefined;
}

function normalizePhone(value: string) {
  return value.replace(/\s|\(|\)|-|\+/g, '');
}

function isValidRuPhone(value: string) {
  const v = normalizePhone(value);
  if (!/^\d{10,11}$/.test(v)) return false;
  if (v.length === 11) return v.startsWith('7') || v.startsWith('8');
  return true;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

// Простейший rate-limit на процесс (ок для MVP). На serverless может не сохраняться.
const RATE_BUCKET: Map<string, { ts: number; count: number }> = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

function allowByIp(ip: string | undefined) {
  if (!ip) return true;
  const now = Date.now();
  const cur = RATE_BUCKET.get(ip);
  if (!cur || now - cur.ts > WINDOW_MS) {
    RATE_BUCKET.set(ip, { ts: now, count: 1 });
    return true;
  }
  if (cur.count >= MAX_PER_WINDOW) return false;
  cur.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!allowByIp(ip)) {
      return NextResponse.json(
        { success: false, message: 'Слишком много запросов. Попробуйте позже.' },
        { status: 429 }
      );
    }

    const body = (await req.json().catch(() => null)) as any;
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Некорректные данные.' },
        { status: 400 }
      );
    }

    // Honeypot: если заполнено — молча считаем успехом
    if (typeof body.website === 'string' && body.website.trim().length > 0) {
      return NextResponse.json({ success: true });
    }

    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const consent = Boolean(body.consent);
    const company = readString(body.company);
    const objectType = readString(body.objectType);
    const city = readString(body.city);
    const accessPoints = readString(body.accessPoints);
    const projectStage = readString(body.projectStage);
    const requestGoal = readString(body.requestGoal);
    const currentSystem = readString(body.currentSystem);
    const message = readString(body.message) ?? readString(body.comment);
    const sourcePage = readString(body.sourcePage);
    const sourceSection = readString(body.sourceSection);
    const source = readString(body.source);
    const intent = readString(body.intent);
    const product = readString(body.product);
    const packageName = readString(body.packageName) ?? readString(body.package);
    const sourceUrl = readString(body.sourceUrl);
    const utm = (body.utm && typeof body.utm === 'object') ? body.utm : undefined;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Укажите имя.' },
        { status: 400 }
      );
    }
    if (!phone || !isValidRuPhone(phone)) {
      return NextResponse.json(
        { success: false, message: 'Проверьте телефон.' },
        { status: 400 }
      );
    }
    if (!consent) {
      return NextResponse.json(
        { success: false, message: 'Нужно согласие на обработку данных.' },
        { status: 400 }
      );
    }

    const payload: LeadPayload = {
      name,
      phone,
      phoneNormalized: normalizePhone(phone),
      company,
      objectType,
      city,
      accessPoints,
      projectStage,
      requestGoal,
      currentSystem,
      message,
      source,
      intent,
      product,
      packageName,
      sourceUrl,
      consent,
      sourcePage,
      sourceSection,
      utm,
      ip,
      userAgent: req.headers.get('user-agent') || undefined,
      timestamp: new Date().toISOString(),
    };

    await sendLead(payload);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[lead] submit failed', err);
    return NextResponse.json(
      {
        success: false,
        message: 'Не удалось отправить заявку. Попробуйте ещё раз или свяжитесь с нами по телефону.',
      },
      { status: 500 }
    );
  }
}
