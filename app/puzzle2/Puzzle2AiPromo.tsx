'use client';

import { ArrowUpRight, Check, MessageCircle, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import { dispatchAiPromoEvent } from '@/app/lib/analytics-events';
import { usePuzzle2Selection } from './Puzzle2SelectionContext';
import { SpotlightCard } from './SpotlightCard';

const questions = [
  'Что подойдёт для нашего объекта?',
  'Как организовать гостевой въезд?',
  'Нужны ли билеты или достаточно госномеров?',
] as const;

type AiWidgetOpenDetail = {
  landingVariant: 'puzzle2';
  sourceSection: 'ai_midpage';
  selectedFunctions: string[];
  prompt?: string;
};

export function Puzzle2AiPromo() {
  const { selected } = usePuzzle2Selection();
  const sectionRef = useRef<HTMLElement>(null);
  const viewTrackedRef = useRef(false);

  const analyticsParams = useCallback((quickQuestion?: string) => ({
    landing_variant: 'puzzle2' as const,
    source_section: 'ai_midpage' as const,
    selected_functions: selected,
    quick_question: quickQuestion,
  }), [selected]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || viewTrackedRef.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || viewTrackedRef.current) return;
      viewTrackedRef.current = true;
      dispatchAiPromoEvent('ai_promo_view', analyticsParams());
      observer.disconnect();
    }, { threshold: 0.35 });

    observer.observe(section);
    return () => observer.disconnect();
  }, [analyticsParams]);

  const openConsultant = (prompt?: string) => {
    if (prompt) {
      dispatchAiPromoEvent('ai_quick_question_click', analyticsParams(prompt));
    } else {
      dispatchAiPromoEvent('ai_promo_click', analyticsParams());
    }

    const detail: AiWidgetOpenDetail = {
      landingVariant: 'puzzle2',
      sourceSection: 'ai_midpage',
      selectedFunctions: [...selected],
      prompt,
    };
    window.dispatchEvent(new CustomEvent('rospark:open-ai-widget', { detail }));
  };

  return (
    <section
      ref={sectionRef}
      className="puzzle2-ai-section section"
      aria-labelledby="puzzle2-ai-title"
    >
      <SpotlightCard customSize width="100%" spread={6}>
        <div className="puzzle2-ai-copy">
          <span className="puzzle2-ai-kicker">
            <Sparkles size={17} aria-hidden="true" />
            НЕ УВЕРЕНЫ, ЧТО ВЫБРАТЬ?
          </span>
          <h2 id="puzzle2-ai-title">Спросите онлайн-консультанта РОСПАРК</h2>
          <p>
            Опишите объект или проблему своими словами. Консультант объяснит
            варианты въезда, доступа и оплаты и поможет понять, какие функции
            могут понадобиться вашей парковке.
          </p>
          <button
            type="button"
            className="puzzle2-ai-button"
            onClick={() => openConsultant()}
          >
            Задать вопрос по парковке
            <ArrowUpRight size={20} aria-hidden="true" />
          </button>
          <div className="puzzle2-ai-questions" aria-label="Быстрые вопросы">
            {questions.map((question) => (
              <button type="button" onClick={() => openConsultant(question)} key={question}>
                <span>{question}</span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <div className="puzzle2-ai-preview" aria-hidden="true">
          <div className="puzzle2-ai-preview-head">
            <span><MessageCircle size={17} /> Онлайн-консультант РОСПАРК</span>
            <i>онлайн</i>
          </div>
          <div className="puzzle2-ai-bubble is-question">
            Нужен гостевой въезд без выдачи пропусков вручную.
          </div>
          <div className="puzzle2-ai-bubble is-answer">
            <span><Check size={15} /></span>
            Можно организовать временный доступ по госномеру или гостевой заявке.
          </div>
          <div className="puzzle2-ai-selection">
            <small>УЧТЁМ В КОНСУЛЬТАЦИИ</small>
            <strong>{selected.length ? selected.join(' · ') : 'Ваш объект и выбранные функции'}</strong>
          </div>
        </div>
      </SpotlightCard>
    </section>
  );
}
