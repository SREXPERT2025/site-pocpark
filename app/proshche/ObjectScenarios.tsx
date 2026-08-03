'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const assetRoot = '/images/landing/proshche';

const objectScenarios = [
  {
    title: 'Торговые центры',
    benefit: 'Поток, оплата и быстрый выезд',
    image: `${assetRoot}/object-torgovye-centry.jpg`,
  },
  {
    title: 'Бизнес-центры',
    benefit: 'Арендаторы, гости и правила доступа',
    image: `${assetRoot}/object-biznes-centry.jpg`,
  },
  {
    title: 'Складские комплексы',
    benefit: 'Транспорт, КПП и контроль проездов',
    image: `${assetRoot}/object-skladskie-kompleksy.jpg`,
  },
  {
    title: 'Жилые комплексы',
    benefit: 'Резиденты, гости и безопасность',
    image: `${assetRoot}/object-zastroyschiki.jpg`,
  },
];

export function ObjectScenarios() {
  const [active, setActive] = useState<(typeof objectScenarios)[number] | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const close = () => {
      setActive(null);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  const closeDialog = () => {
    setActive(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <>
      <section className="object-section section">
        <div className="object-heading">
          <span>Решения по типу объекта</span>
          <h2>
            Для любого объекта —
            <br />
            свой сценарий.
          </h2>
        </div>
        <div className="object-grid">
          {objectScenarios.map((scenario, index) => (
            <button
              className="object-card"
              key={scenario.title}
              type="button"
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setActive(scenario);
              }}
              aria-label={`Открыть решение: ${scenario.title}`}
            >
              <Image
                src={scenario.image}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                unoptimized
              />
              <span className="object-card-shade" />
              <span className="object-card-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="object-card-copy">
                <strong>{scenario.title}</strong>
                <span>{scenario.benefit}</span>
              </span>
              <span className="object-card-action">Открыть ↗</span>
            </button>
          ))}
        </div>
        <a
          className="button object-cta"
          href="/quiz?source=landing-proshche-v1"
        >
          Подобрать решение для моего объекта
          <span aria-hidden="true">↗</span>
        </a>
      </section>

      {active && (
        <div
          className="object-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="proshche-object-dialog-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeDialog();
          }}
        >
          <div className="object-modal-panel">
            <div className="object-modal-head">
              <div>
                <span>Решение РОСПАРК</span>
                <strong id="proshche-object-dialog-title">{active.title}</strong>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDialog}
                aria-label="Закрыть"
              >
                Закрыть ×
              </button>
            </div>
            <Image
              src={active.image}
              alt={`Решение РОСПАРК: ${active.title}`}
              width={1920}
              height={1080}
              sizes="96vw"
              unoptimized
            />
          </div>
        </div>
      )}
    </>
  );
}
