'use client';

import { useEffect, useRef, useState } from 'react';

const minimumFrameHeight = 8_000;
const maximumFrameHeight = 20_000;

type ParkovkaFrameProps = {
  onLeadRequest: (task: string) => void;
  onAiEvent: (
    eventName: 'ai_promo_view' | 'ai_promo_click' | 'ai_quick_question_click',
    selectedProblem?: string,
    quickQuestion?: string,
  ) => void;
  onAiOpen: (selectedProblem?: string, prompt?: string) => void;
};

export default function ParkovkaFrame({
  onLeadRequest,
  onAiEvent,
  onAiOpen,
}: ParkovkaFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(minimumFrameHeight);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin
        || event.source !== frameRef.current?.contentWindow
      ) {
        return;
      }

      if (event.data?.type === 'rospark:parkovka-height') {
        const nextHeight = Number(event.data.height);
        if (!Number.isFinite(nextHeight)) return;
        setHeight(Math.min(maximumFrameHeight, Math.max(1, nextHeight)));
        return;
      }

      if (event.data?.type === 'rospark:parkovka-lead-open') {
        onLeadRequest(String(event.data.task || 'Рассчитать парковку'));
        return;
      }

      if (event.data?.type === 'rospark:parkovka-ai-open') {
        onAiOpen(
          typeof event.data.selectedProblem === 'string'
            ? event.data.selectedProblem
            : undefined,
          typeof event.data.prompt === 'string'
            ? event.data.prompt
            : undefined,
        );
        return;
      }

      if (event.data?.type === 'rospark:parkovka-ai-event') {
        const eventName = event.data.eventName;
        if (
          eventName !== 'ai_promo_view'
          && eventName !== 'ai_promo_click'
          && eventName !== 'ai_quick_question_click'
        ) return;
        onAiEvent(
          eventName,
          typeof event.data.selectedProblem === 'string'
            ? event.data.selectedProblem
            : undefined,
          typeof event.data.quickQuestion === 'string'
            ? event.data.quickQuestion
            : undefined,
        );
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onAiEvent, onAiOpen, onLeadRequest]);

  return (
    <iframe
      ref={frameRef}
      className="parkovka-frame"
      src="/parkovka/embed"
      scrolling="no"
      title="Лендинг решений для въезда и парковки РОСПАРК"
      style={{ height }}
    />
  );
}
