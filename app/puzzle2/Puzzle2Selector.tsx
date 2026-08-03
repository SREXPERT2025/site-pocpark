'use client';

import { dispatchLandingEvent } from '@/app/lib/analytics-events';
import { usePuzzle2Selection } from './Puzzle2SelectionContext';

const options = [
  ['Закрыть въезд', 'Пропускать только разрешённые автомобили.'],
  ['Въезд по госномеру', 'Открывать шлагбаум после распознавания автомобиля.'],
  ['Карты доступа', 'Организовать проезд постоянных пользователей.'],
  ['Билеты для посетителей', 'Фиксировать въезд и время разового визита.'],
  ['Оплата парковки', 'Принимать оплату онлайн, в терминале или на выезде.'],
  ['Доступ для гостей', 'Создавать временные разрешения и приглашения.'],
  ['Сотрудники и гости', 'Разделить постоянный и временный доступ.'],
  ['Заменить старую систему', 'Сохранить полезное и обновить необходимое.'],
] as const;

export function Puzzle2Selector() {
  const { selected, toggle, clear } = usePuzzle2Selection();

  return (
    <section className="problem-section section puzzle2-selector" id="problem">
      <div className="selector-heading">
        <div className="section-title-stack">
          <span className="section-label">01 — Подбор под объект</span>
          <h2>Что должна уметь ваша парковка?</h2>
        </div>
        <div className="selector-intro">
          <strong>Можно выбрать несколько вариантов</strong>
          <p>
            Мы учтём выбранные пункты вместе и не будем предлагать лишнее
            оборудование.
          </p>
        </div>
      </div>

      <div className="selector-grid" aria-label="Выбор возможностей парковки">
        {options.map(([title, text], index) => {
          const active = selected.includes(title);
          return (
            <button
              type="button"
              className={active ? 'selector-card selected' : 'selector-card'}
              aria-pressed={active}
              onClick={() => {
                dispatchLandingEvent('landing_choice_change', {
                  landing_variant: 'puzzle2',
                  source_section: 'function_selector',
                  selected_choice: title,
                  selected_choices_count: active
                    ? Math.max(0, selected.length - 1)
                    : selected.length + 1,
                  selection_action: active ? 'unselect' : 'select',
                });
                toggle(title);
              }}
              key={title}
            >
              <span className="selector-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="selector-check" aria-hidden="true">{active ? '✓' : '+'}</span>
              <strong>{title}</strong>
              <small>{text}</small>
            </button>
          );
        })}
      </div>

      <div className="selector-result" aria-live="polite">
        <div>
          <strong>
            {selected.length
              ? `Выбрано: ${selected.length}`
              : 'Можно выбрать несколько вариантов'}
          </strong>
          <span>
            {selected.length ? selected.join(' · ') : 'Начните с того, что уже точно знаете.'}
          </span>
        </div>
        <div className="selector-actions">
          {selected.length ? (
            <button
              type="button"
              className="selector-clear"
              onClick={() => {
                dispatchLandingEvent('landing_choice_change', {
                  landing_variant: 'puzzle2',
                  source_section: 'function_selector',
                  selected_choices_count: 0,
                  selection_action: 'clear',
                });
                clear();
              }}
            >
              Очистить
            </button>
          ) : null}
          <a
            className="primary-button"
            href="#preview-form"
            onClick={() => dispatchLandingEvent('landing_cta_click', {
              landing_variant: 'puzzle2',
              source_section: 'function_selector',
              cta_id: 'calculate_parking',
              selected_choices_count: selected.length,
            })}
          >
            Рассчитать парковку <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
