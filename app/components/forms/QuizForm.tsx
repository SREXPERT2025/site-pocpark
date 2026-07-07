'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/app/components/ui/Button';
import { dispatchLeadFormEvent, type LeadFormEventParams } from '@/app/lib/analytics-events';
import { getLeadAttribution } from '@/app/lib/lead-attribution';

type FormData = {
  name: string;
  phone: string;
  objectType: string;
};

type QuizFormProps = {
  source?: string;
  intent?: string;
  product?: string;
  packageName?: string;
  sourceUrl?: string;
};

function normalizePhone(value: string) {
  return value.replace(/\s|\(|\)|-|\+/g, '');
}

function isValidRuPhone(value: string) {
  const v = normalizePhone(value);
  // Упрощённая проверка: 10-11 цифр, допускаем ведущую 7/8
  if (!/^\d{10,11}$/.test(v)) return false;
  if (v.length === 11) return v.startsWith('7') || v.startsWith('8');
  return true;
}

export default function QuizForm({
  source,
  intent,
  product,
  packageName,
  sourceUrl,
}: QuizFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    objectType: 'ТЦ / Бизнес-центр',
  });

  const [consent, setConsent] = useState(false);

  const [touched, setTouched] = useState<{ phone: boolean }>({ phone: false });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasStartedRef = useRef(false);
  const resolvedSourceUrl =
    sourceUrl || (typeof window !== 'undefined' ? window.location.href : undefined);

  function getEventParams(): LeadFormEventParams {
    return {
      form_name: 'quiz_form',
      source_page: resolvedSourceUrl || '/quiz',
      source_section: source ? `quiz:${source}` : 'quiz',
    };
  }

  function handleFormStart() {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    dispatchLeadFormEvent('form_start', getEventParams());
  }

  useEffect(() => {
    dispatchLeadFormEvent('form_view', getEventParams());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const phoneError = useMemo(() => {
    if (!touched.phone) return null;
    if (!formData.phone.trim()) return 'Укажите телефон.';
    if (!isValidRuPhone(formData.phone)) return 'Проверьте формат телефона.';
    return null;
  }, [formData.phone, touched.phone]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSuccess(false);

    // Мини-валидация перед отправкой
    if (!formData.name.trim()) {
      setError('Укажите имя.');
      dispatchLeadFormEvent('form_error', {
        ...getEventParams(),
        error_type: 'validation',
      });
      return;
    }
    if (!formData.phone.trim() || !isValidRuPhone(formData.phone)) {
      setTouched({ phone: true });
      setError('Проверьте телефон.');
      dispatchLeadFormEvent('form_error', {
        ...getEventParams(),
        error_type: 'validation',
      });
      return;
    }
    if (!consent) {
      setError('Нужно согласиться на обработку персональных данных.');
      dispatchLeadFormEvent('form_error', {
        ...getEventParams(),
        error_type: 'validation',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      dispatchLeadFormEvent('form_submit', getEventParams());

      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          phoneNormalized: normalizePhone(formData.phone),
          objectType: formData.objectType,
          message: 'Заявка с квиза: подготовить коммерческое предложение / расчёт. ',
          consent,
          source,
          intent: intent || source,
          product,
          packageName,
          sourceUrl: resolvedSourceUrl,
          sourceSection: source ? `quiz:${source}` : 'quiz',
          sourcePage: '/quiz',
          utm: getLeadAttribution(),
        }),
      });

      const json = (await res.json()) as { success: boolean; message?: string };

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Ошибка отправки');
      }

      setIsSuccess(true);
      dispatchLeadFormEvent('form_success', getEventParams());
      setFormData({ name: '', phone: '', objectType: 'ТЦ / Бизнес-центр' });
      setTouched({ phone: false });
      setConsent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      dispatchLeadFormEvent('form_error', {
        ...getEventParams(),
        error_type: 'network',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} onFocus={handleFormStart} className="mt-8 space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary">Имя</label>
        <input
          value={formData.name}
          onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
          className="mt-2 w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          placeholder="Иван"
          autoComplete="name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary">Телефон</label>
        <input
          value={formData.phone}
          onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
          onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
          className="mt-2 w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          placeholder="+7 999 123-45-67"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={!!phoneError}
        />
        {phoneError ? <p className="mt-2 text-xs text-red-600">{phoneError}</p> : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary">Тип объекта</label>
        <select
          value={formData.objectType}
          onChange={(e) => setFormData((p) => ({ ...p, objectType: e.target.value }))}
          className="mt-2 w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        >
          <option>ТЦ / Бизнес-центр</option>
          <option>ЖК / Дворовая территория</option>
          <option>Промышленная площадка</option>
          <option>Парковка у офиса</option>
          <option>Другое</option>
        </select>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isSuccess ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex items-center gap-2">
          <span aria-hidden="true">✓</span>
          <span>Заявка принята. Мы свяжемся с вами в ближайшее время.</span>
        </div>
      ) : null}

      <div className="flex items-start gap-2">
        <input
          id="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border-primary"
        />
        <label htmlFor="consent" className="text-xs leading-5 text-text-secondary">
          Я даю согласие на обработку моих персональных данных для обработки обращения,
          подготовки расчёта и связи со мной. Подтверждаю, что ознакомлен с{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-text-primary">
            Политикой обработки персональных данных
          </Link>{' '}
          и{' '}
          <Link
            href="/soglasie-na-obrabotku-personalnyh-dannyh"
            className="underline underline-offset-2 hover:text-text-primary"
          >
            Согласием на обработку персональных данных
          </Link>
          .
        </label>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          <span className="inline-flex items-center gap-2">
            {isSubmitting ? <span className="spinner" aria-label="Отправка" /> : null}
            {isSubmitting ? 'Отправляем…' : 'Отправить'}
          </span>
        </Button>
      </div>

      <p className="text-xs text-text-secondary">
        Заявка поступит в отдел продаж и будет обработана ответственным специалистом.
      </p>
    </form>
  );
}
