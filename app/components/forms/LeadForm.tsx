'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type UtmData = Record<string, string>;

type LeadFormProps = {
  sourceSection?: string;
  sourcePage?: string;
  submitLabel?: string;
  className?: string;
  compact?: boolean;
};

type ApiResponse = {
  success: boolean;
  message?: string;
};

function cn(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(' ');
}

function pickUtm(params: URLSearchParams) {
  const keys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'yclid',
    'fbclid',
  ];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = params.get(k);
    if (v) out[k] = v;
  }
  return out;
}

export default function LeadForm({
  sourceSection,
  sourcePage,
  submitLabel = 'Отправить заявку',
  className,
  compact = false,
}: LeadFormProps) {
  const pathname = usePathname();
  const [utm, setUtm] = useState<UtmData>({});

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setUtm(pickUtm(sp));
    } catch {
      setUtm({});
    }
  }, []);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [objectType, setObjectType] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(true);
  const [website, setWebsite] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setSuccess(false);

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          company,
          objectType,
          message,
          consent,
          website,
          sourceSection,
          sourcePage: sourcePage ?? pathname,
          utm,
        }),
      });

      const data = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !data?.success) {
        setError(data?.message || 'Не удалось отправить заявку. Попробуйте позже.');
        return;
      }

      setSuccess(true);
      setName('');
      setPhone('');
      setCompany('');
      setObjectType('');
      setMessage('');
      setWebsite('');
      setConsent(true);
    } catch {
      setError('Не удалось отправить заявку. Проверьте интернет и попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={cn('w-full', className)}>
      {/* Honeypot */}
      <div className="hidden">
        <label>
          Website
          <input value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <div
        className={cn(
          'grid gap-3',
          compact ? 'md:grid-cols-3' : 'md:grid-cols-2'
        )}
      >
        <div>
          <label className="text-sm font-medium text-text-primary">Имя</label>
          <input
            className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-blue-200"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Андрей"
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-text-primary">Телефон</label>
          <input
            className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-blue-200"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 999 123-45-67"
            autoComplete="tel"
            required
          />
        </div>

        {!compact && (
          <div>
            <label className="text-sm font-medium text-text-primary">Компания</label>
            <input
              className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-blue-200"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="ООО “...”"
              autoComplete="organization"
            />
          </div>
        )}

        {!compact && (
          <div>
            <label className="text-sm font-medium text-text-primary">Тип объекта</label>
            <input
              className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-blue-200"
              value={objectType}
              onChange={(e) => setObjectType(e.target.value)}
              placeholder="ТЦ / БЦ / ЖК / Паркинг"
            />
          </div>
        )}
      </div>

      {!compact && (
        <div className="mt-3">
          <label className="text-sm font-medium text-text-primary">Комментарий</label>
          <textarea
            className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-blue-200"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Коротко опишите объект и задачу (кол-во въездов, типы клиентов, пожелания)"
          />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-start gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4"
            required
          />
          <span>
            Согласен(на) на обработку персональных данных и связь со мной по заявке.
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors',
            isSubmitting ? 'opacity-70' : 'hover:bg-blue-700'
          )}
        >
          {isSubmitting ? 'Отправляем…' : submitLabel}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Заявка отправлена. Мы свяжемся с вами в рабочее время.
        </p>
      )}
    </form>
  );
}
