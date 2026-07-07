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
  city: string;
  accessPoints: string;
  projectStage: string;
  requestGoal: string;
  currentSystem: string;
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

const objectTypeOptions = [
  'ТЦ / торговый объект',
  'Бизнес-центр / офис',
  'ЖК / дворовая территория',
  'Склад / логистический комплекс',
  'Отель / объект с гостями',
  'Другое',
];

const accessPointOptions = [
  '1 въезд / 1 выезд',
  '2-3 въезда/выезда',
  '4+ въезда/выезда',
  'Пока неизвестно',
];

const projectStageOptions = [
  'Новый объект',
  'Модернизация текущей парковки',
  'Нужно заменить часть оборудования',
  'Нужен аудит текущего решения',
];

const requestGoalOptions = [
  'Коммерческое предложение',
  'Предварительный расчет',
  'Консультация инженера',
  'Аудит текущей парковки',
  'Техническое задание',
];

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
    objectType: objectTypeOptions[0],
    city: '',
    accessPoints: accessPointOptions[0],
    projectStage: projectStageOptions[0],
    requestGoal: requestGoalOptions[0],
    currentSystem: '',
  });

  const [consent, setConsent] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
      const messageParts = [
        'Заявка с квиза: подготовить коммерческое предложение / расчёт.',
      ];

      if (detailsOpen) {
        messageParts.push(`Что нужно: ${formData.requestGoal}.`);
        messageParts.push(`Стадия проекта: ${formData.projectStage}.`);
        if (formData.currentSystem.trim()) {
          messageParts.push(`Текущая система: ${formData.currentSystem.trim()}.`);
        }
      }

      const message = messageParts.join('\n');

      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          phoneNormalized: normalizePhone(formData.phone),
          objectType: formData.objectType,
          city: detailsOpen ? formData.city : undefined,
          accessPoints: detailsOpen ? formData.accessPoints : undefined,
          projectStage: detailsOpen ? formData.projectStage : undefined,
          requestGoal: detailsOpen ? formData.requestGoal : undefined,
          currentSystem: detailsOpen ? formData.currentSystem : undefined,
          message,
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
      setFormData({
        name: '',
        phone: '',
        objectType: objectTypeOptions[0],
        city: '',
        accessPoints: accessPointOptions[0],
        projectStage: projectStageOptions[0],
        requestGoal: requestGoalOptions[0],
        currentSystem: '',
      });
      setTouched({ phone: false });
      setConsent(false);
      setDetailsOpen(false);
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
    <form onSubmit={handleSubmit} onFocus={handleFormStart} className="mt-8 space-y-5">
      <section className="rounded-lg border border-border-primary bg-bg-primary p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Короткая заявка
          </p>
          <h2 className="mt-1 text-xl font-semibold text-text-primary">Получить расчет</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            Достаточно контактов и типа объекта. Детали проекта можно добавить по желанию.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary">
              Имя
            </label>
            <input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="mt-2 w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              placeholder="Иван"
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-text-primary">
              Телефон
            </label>
            <input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
              className="mt-2 w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              placeholder="+7 999 123-45-67"
              inputMode="tel"
              autoComplete="tel"
              required
              aria-invalid={!!phoneError}
            />
            {phoneError ? <p className="mt-2 text-xs text-red-600">{phoneError}</p> : null}
          </div>

          <div>
            <label htmlFor="objectType" className="block text-sm font-medium text-text-primary">
              Тип объекта
            </label>
            <select
              id="objectType"
              value={formData.objectType}
              onChange={(e) => setFormData((p) => ({ ...p, objectType: e.target.value }))}
              className="mt-2 w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              {objectTypeOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-border-primary bg-bg-primary">
        <button
          type="button"
          onClick={() => setDetailsOpen((value) => !value)}
          aria-expanded={detailsOpen}
          className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <span>
            <span className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Необязательно
            </span>
            <span className="mt-1 block text-base font-semibold text-text-primary">
              Добавить параметры проекта
            </span>
            <span className="mt-1 block text-sm leading-6 text-text-secondary">
              Если есть время, это поможет быстрее подготовить КП без дополнительных вопросов.
            </span>
          </span>
          <span className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border-primary px-3 text-sm font-medium text-text-primary">
            {detailsOpen ? 'Скрыть' : 'Добавить'}
          </span>
        </button>

        {detailsOpen ? (
          <div className="border-t border-border-primary p-4 sm:p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-text-primary">
                  Город или регион
                </label>
                <input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                  placeholder="Москва, МО, Казань..."
                  autoComplete="address-level2"
                />
              </div>

              <div>
                <label htmlFor="accessPoints" className="block text-sm font-medium text-text-primary">
                  Въезды и выезды
                </label>
                <select
                  id="accessPoints"
                  value={formData.accessPoints}
                  onChange={(e) => setFormData((p) => ({ ...p, accessPoints: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                >
                  {accessPointOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="projectStage" className="block text-sm font-medium text-text-primary">
                  Стадия проекта
                </label>
                <select
                  id="projectStage"
                  value={formData.projectStage}
                  onChange={(e) => setFormData((p) => ({ ...p, projectStage: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                >
                  {projectStageOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="requestGoal" className="block text-sm font-medium text-text-primary">
                  Что подготовить
                </label>
                <select
                  id="requestGoal"
                  value={formData.requestGoal}
                  onChange={(e) => setFormData((p) => ({ ...p, requestGoal: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                >
                  {requestGoalOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="currentSystem" className="block text-sm font-medium text-text-primary">
                  Текущая система или оборудование
                </label>
                <textarea
                  id="currentSystem"
                  value={formData.currentSystem}
                  onChange={(e) => setFormData((p) => ({ ...p, currentSystem: e.target.value }))}
                  className="mt-2 min-h-24 w-full resize-y rounded-md border border-border-primary bg-bg-primary px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                  placeholder="Если уже есть шлагбаумы, СКУД, камеры, терминалы или старая система"
                />
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {error ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isSuccess ? (
        <div
          aria-live="polite"
          className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex items-center gap-2"
        >
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
