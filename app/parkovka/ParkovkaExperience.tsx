'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  dispatchAiPromoEvent,
  dispatchLandingEvent,
  type AiPromoEventName,
} from '@/app/lib/analytics-events';
import type { LandingRuntimeMode } from '@/app/lib/landing-runtime';
import ParkovkaFrame from './ParkovkaFrame';
import ParkovkaLeadModal from './ParkovkaLeadModal';

function aiSessionId() {
  const key = 'rospark_ai_widget_session_id';
  const stored = window.sessionStorage.getItem(key);
  const value = stored && /^[a-z0-9][a-z0-9._:-]{15,127}$/i.test(stored)
    ? stored
    : crypto.randomUUID();
  window.sessionStorage.setItem(key, value);
  return value;
}

export default function ParkovkaExperience({
  runtimeMode,
}: {
  runtimeMode: LandingRuntimeMode;
}) {
  const [leadTask, setLeadTask] = useState('');

  useEffect(() => {
    dispatchLandingEvent('landing_view', {
      landing_variant: 'parkovka',
      source_section: 'page',
    });
  }, []);
  const openLeadModal = useCallback((task: string) => {
    dispatchLandingEvent('landing_cta_click', {
      landing_variant: 'parkovka',
      source_section: 'landing_content',
      cta_id: 'calculate_parking',
      selected_choice: task,
      selected_choices_count: task ? 1 : 0,
    });
    setLeadTask(task);
  }, []);
  const trackAiEvent = useCallback((
    eventName: Extract<
      AiPromoEventName,
      'ai_promo_view' | 'ai_promo_click' | 'ai_quick_question_click'
    >,
    selectedProblem?: string,
    quickQuestion?: string,
  ) => {
    dispatchAiPromoEvent(eventName, {
      landing_variant: 'parkovka',
      source_section: 'ai_after_problem_selector',
      selected_problem: selectedProblem,
      quick_question: quickQuestion,
      session_id: aiSessionId(),
    });
  }, []);
  const openAiWidget = useCallback((
    selectedProblem?: string,
    prompt?: string,
  ) => {
    window.dispatchEvent(new CustomEvent('rospark:open-ai-widget', {
      detail: {
        landingVariant: 'parkovka',
        sourceSection: 'ai_after_problem_selector',
        selectedProblem,
        prompt,
        sessionId: aiSessionId(),
      },
    }));
  }, []);

  return (
    <>
      <ParkovkaFrame
        onLeadRequest={openLeadModal}
        onAiEvent={trackAiEvent}
        onAiOpen={openAiWidget}
      />
      {leadTask ? (
        <ParkovkaLeadModal
          selectedTask={leadTask}
          runtimeMode={runtimeMode}
          onClose={() => setLeadTask('')}
        />
      ) : null}
    </>
  );
}
