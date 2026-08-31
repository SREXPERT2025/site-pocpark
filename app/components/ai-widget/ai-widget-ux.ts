export type AiWidgetWaitingStage = {
  title: string;
  detail: string;
  progressPercent: number;
  isLongWait: boolean;
};

export const AI_WIDGET_ATTENTION_DELAY_MS = 5_200;
export const AI_WIDGET_ATTENTION_PULSE_MS = 900;
export const AI_WIDGET_ATTENTION_SESSION_KEY =
  'rospark_ai_widget_attention_seen_v1';

export function aiWidgetWaitingStageFor(
  elapsedSeconds: number,
): AiWidgetWaitingStage {
  const safeElapsedSeconds = Number.isFinite(elapsedSeconds)
    ? Math.max(0, elapsedSeconds)
    : 0;
  const progressPercent = Math.max(
    10,
    Math.min(92, Math.round((safeElapsedSeconds / 60) * 92)),
  );

  if (safeElapsedSeconds < 20) {
    return {
      title: 'Изучаем ваш вопрос',
      detail: 'Ответ обычно занимает около минуты',
      progressPercent,
      isLongWait: false,
    };
  }

  if (safeElapsedSeconds < 40) {
    return {
      title: 'Проверяем подходящие варианты',
      detail: 'Сверяем детали задачи и доступные решения',
      progressPercent,
      isLongWait: false,
    };
  }

  if (safeElapsedSeconds < 60) {
    return {
      title: 'Готовим понятный ответ',
      detail: 'Осталось немного — вопрос уже обрабатывается',
      progressPercent,
      isLongWait: false,
    };
  }

  return {
    title: 'Ещё немного — готовим ответ',
    detail: 'Не отправляйте его повторно: мы уже готовим ответ',
    progressPercent: 92,
    isLongWait: true,
  };
}
