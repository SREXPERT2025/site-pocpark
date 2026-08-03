'use client';

import { useEffect, useRef, useState } from 'react';

import { dispatchLeadFormEvent } from '@/app/lib/analytics-events';
import { getLeadAttribution } from '@/app/lib/lead-attribution';
import { createLeadSubmissionId } from '@/app/lib/lead-submission-id';
import type { LandingRuntimeMode } from '@/app/lib/landing-runtime';

type ParkovkaLeadModalProps = {
  selectedTask: string;
  runtimeMode: LandingRuntimeMode;
  onClose: () => void;
};

export default function ParkovkaLeadModal({
  selectedTask,
  runtimeMode,
  onClose,
}: ParkovkaLeadModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [task, setTask] = useState(selectedTask);
  const [consent, setConsent] = useState(true);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formStartedRef = useRef(false);
  const submissionIdRef = useRef<string | null>(null);

  const eventParams = {
    form_name: 'landing_request',
    landing_variant: 'parkovka' as const,
    source_page: '/parkovka',
    source_section: 'lead_modal',
    product_slug: 'parking_system',
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    dispatchLeadFormEvent('form_view', eventParams);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  // The modal is mounted for one request, so this event must run only once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Оставьте имя и телефон — менеджеру нужно понимать, как с вами связаться.');
      dispatchLeadFormEvent('form_error', {
        ...eventParams,
        error_type: 'validation',
      });
      return;
    }
    if (!consent) {
      setError('Чтобы подготовить заявку, нужно согласие на обработку данных.');
      dispatchLeadFormEvent('form_error', {
        ...eventParams,
        error_type: 'validation',
      });
      return;
    }
    setError('');
    dispatchLeadFormEvent('form_submit', eventParams);

    if (runtimeMode === 'preview') {
      setSent(true);
      return;
    }

    setIsSubmitting(true);
    try {
      submissionIdRef.current ||= createLeadSubmissionId('site');
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          consent,
          message: task.trim() || selectedTask,
          projectInterests: selectedTask ? [selectedTask] : undefined,
          source: 'landing-parkovka',
          sourcePage: '/parkovka',
          sourceSection: 'lead_modal',
          intent: 'calculate_parking',
          product: 'parking_system',
          sourceUrl: window.location.href,
          utm: getLeadAttribution(),
          submissionId: submissionIdRef.current,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      submissionIdRef.current = null;
      setSent(true);
      dispatchLeadFormEvent('form_success', eventParams);
    } catch (submissionError) {
      console.error('[parkovka] lead submission failed', submissionError);
      setError('Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.');
      dispatchLeadFormEvent('form_error', {
        ...eventParams,
        error_type: 'network',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="parkovka-lead-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="parkovka-lead-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="parkovka-lead-title"
      >
        <button
          className="parkovka-lead-close"
          type="button"
          onClick={onClose}
          aria-label="Закрыть форму"
        >
          ×
        </button>

        {sent ? (
          <div className="parkovka-lead-success">
            <span aria-hidden="true">✓</span>
            <p className="parkovka-lead-eyebrow">Заявка подготовлена</p>
            <h2 id="parkovka-lead-title">Спасибо!</h2>
            <p>
              {runtimeMode === 'preview'
                ? 'На тестовом стенде данные не отправляются и не сохраняются.'
                : 'Заявка отправлена. Менеджер свяжется с вами, чтобы уточнить задачу.'}
            </p>
            <button type="button" onClick={onClose}>Вернуться на сайт</button>
          </div>
        ) : (
          <>
            <p className="parkovka-lead-eyebrow">До разговора не нужно ТЗ</p>
            <h2 id="parkovka-lead-title">
              Расскажите, что сейчас не устраивает на парковке
            </h2>
            <form
              className="parkovka-lead-form"
              onSubmit={submit}
              onFocus={() => {
                if (formStartedRef.current) return;
                formStartedRef.current = true;
                dispatchLeadFormEvent('form_start', eventParams);
              }}
            >
              <label>
                Ваше имя
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Как к вам обращаться"
                />
              </label>
              <label>
                Телефон
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+7"
                  inputMode="tel"
                />
              </label>
              <label>
                Задача
                <textarea
                  value={task}
                  onChange={(event) => setTask(event.target.value)}
                  rows={4}
                />
              </label>
              <label className="parkovka-lead-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>Согласен на обработку персональных данных</span>
              </label>
              {error ? <p className="parkovka-lead-error">{error}</p> : null}
              <button
                className="parkovka-lead-submit"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Отправляем…' : 'Отправить заявку'}{' '}
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
