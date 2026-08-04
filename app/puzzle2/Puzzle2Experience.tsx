'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  dispatchLandingEvent,
  dispatchLeadFormEvent,
} from '@/app/lib/analytics-events';
import { getLeadAttribution } from '@/app/lib/lead-attribution';
import { createLeadSubmissionId } from '@/app/lib/lead-submission-id';
import type { LandingRuntimeMode } from '@/app/lib/landing-runtime';
import { usePuzzle2Selection } from './Puzzle2SelectionContext';

const selectionPrefix = 'Нужно организовать: ';

export function Puzzle2Experience({
  runtimeMode,
}: {
  runtimeMode: LandingRuntimeMode;
}) {
  const { selected } = usePuzzle2Selection();
  const selectedTask = useMemo(
    () => (selected.length ? `${selectionPrefix}${selected.join(', ')}.` : ''),
    [selected],
  );
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [task, setTask] = useState('');
  const [consent, setConsent] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formStartedRef = useRef(false);
  const formViewedRef = useRef(false);
  const submissionIdRef = useRef<string | null>(null);
  const eventParams = {
    form_name: 'landing_request',
    landing_variant: 'puzzle2' as const,
    source_page: '/parkovka-pod-klyuch',
    source_section: 'final_form',
    product_slug: 'parking_system',
  };

  useEffect(() => {
    setTask((current) => {
      if (!current || current.startsWith(selectionPrefix)) return selectedTask;
      return current;
    });
  }, [selectedTask]);

  useEffect(() => {
    if (formViewedRef.current) return;
    formViewedRef.current = true;
    dispatchLandingEvent('landing_view', {
      landing_variant: 'puzzle2',
      source_section: 'page',
    });
    dispatchLeadFormEvent('form_view', eventParams);
  // This form is mounted once per page view.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Оставьте имя и телефон — менеджеру нужно понимать, как с вами связаться.');
      dispatchLeadFormEvent('form_error', { ...eventParams, error_type: 'validation' });
      return;
    }
    if (!consent) {
      setError('Чтобы подготовить заявку, нужно согласие на обработку данных.');
      dispatchLeadFormEvent('form_error', { ...eventParams, error_type: 'validation' });
      return;
    }
    setError('');
    dispatchLeadFormEvent('form_submit', eventParams);
    if (runtimeMode === 'preview') {
      setCompleted(true);
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
          projectInterests: selected.length ? selected : undefined,
          source: 'landing-puzzle2',
          sourcePage: '/parkovka-pod-klyuch',
          sourceSection: 'final_form',
          intent: 'calculate_parking',
          product: 'parking_system',
          sourceUrl: window.location.href,
          utm: getLeadAttribution(),
          submissionId: submissionIdRef.current,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      submissionIdRef.current = null;
      setCompleted(true);
      dispatchLeadFormEvent('form_success', eventParams);
    } catch (submissionError) {
      console.error('[puzzle2] lead submission failed', submissionError);
      setError('Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.');
      dispatchLeadFormEvent('form_error', { ...eventParams, error_type: 'network' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="preview-form-section section" id="preview-form">
      <div className="preview-form-copy">
        <span className="section-label">Подбор решения</span>
        <h2>Рассчитаем парковку под ваш объект</h2>
        <p>
          Выбранные возможности уже добавлены в задачу. Дополните описание и
          оставьте контакт — менеджер уточнит детали и предложит следующий шаг.
        </p>
        {selected.length ? (
          <div className="form-selection-summary">
            <strong>Вы выбрали</strong>
            <span>{selected.join(' · ')}</span>
          </div>
        ) : null}
      </div>

      {completed ? (
        <div className="preview-success" role="status">
          <span aria-hidden="true">✓</span>
          <h3>Заявка подготовлена</h3>
          <p>
            {runtimeMode === 'preview'
              ? 'На тестовом стенде данные не отправлялись и не сохранялись.'
              : 'Заявка отправлена. Менеджер свяжется с вами, чтобы уточнить задачу.'}
          </p>
          <button type="button" onClick={() => setCompleted(false)}>
            Вернуться к форме
          </button>
        </div>
      ) : (
        <form
          className="preview-form puzzle2-form"
          onSubmit={submit}
          onFocus={() => {
            if (formStartedRef.current) return;
            formStartedRef.current = true;
            dispatchLeadFormEvent('form_start', eventParams);
          }}
        >
          <label>
            <span>Ваше имя</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Как к вам обращаться"
            />
          </label>
          <label>
            <span>Телефон</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+7"
              inputMode="tel"
            />
          </label>
          <label className="form-wide">
            <span>Задача</span>
            <textarea
              value={task}
              onChange={(event) => setTask(event.target.value)}
              placeholder="Что нужно организовать на объекте"
              rows={4}
            />
          </label>
          <label className="preview-consent form-wide">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>Согласен на обработку персональных данных</span>
          </label>
          {error ? <p className="preview-error form-wide">{error}</p> : null}
          <button className="form-wide" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Отправляем…' : 'Отправить заявку'}{' '}
            <span aria-hidden="true">→</span>
          </button>
          {runtimeMode === 'preview' ? (
            <small className="form-wide">
              Тестовый режим: данные не отправляются и не сохраняются.
            </small>
          ) : null}
        </form>
      )}
    </section>
  );
}
