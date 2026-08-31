import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  AI_WIDGET_ATTENTION_DELAY_MS,
  AI_WIDGET_ATTENTION_PULSE_MS,
  AI_WIDGET_ATTENTION_SESSION_KEY,
  aiWidgetWaitingStageFor,
} from '../app/components/ai-widget/ai-widget-ux.ts';
import {
  validateAiWidgetChatPayload,
} from '../app/lib/ai-widget-pilot.ts';

const component = await readFile(
  new URL('../app/components/ai-widget/AiWidgetPilot.tsx', import.meta.url),
  'utf8',
);
const analytics = await readFile(
  new URL('../app/lib/analytics-events.ts', import.meta.url),
  'utf8',
);
const puzzlePromo = await readFile(
  new URL('../app/puzzle2/Puzzle2AiPromo.tsx', import.meta.url),
  'utf8',
);
const puzzleExperience = await readFile(
  new URL('../app/puzzle2/Puzzle2Experience.tsx', import.meta.url),
  'utf8',
);
const parkovkaEmbed = await readFile(
  new URL('../app/parkovka/embed/route.ts', import.meta.url),
  'utf8',
);

const checks = [];

function check(name, test) {
  test();
  checks.push(name);
  console.log(`PASS ${name}`);
}

check('waiting 0-20 seconds', () => {
  assert.equal(aiWidgetWaitingStageFor(0).title, 'Изучаем ваш вопрос');
  assert.equal(aiWidgetWaitingStageFor(19).isLongWait, false);
});
check('waiting 20-40 seconds', () => {
  assert.equal(
    aiWidgetWaitingStageFor(20).title,
    'Проверяем подходящие варианты',
  );
});
check('waiting 40-60 seconds', () => {
  assert.equal(aiWidgetWaitingStageFor(40).title, 'Готовим понятный ответ');
});
check('waiting over 60 seconds', () => {
  assert.equal(aiWidgetWaitingStageFor(60).isLongWait, true);
  assert.equal(
    aiWidgetWaitingStageFor(61).title,
    'Ещё немного — готовим ответ',
  );
});
check('waiting progress remains non-SLA', () => {
  assert.equal(aiWidgetWaitingStageFor(120).progressPercent, 92);
  assert.equal(aiWidgetWaitingStageFor(Number.NaN).progressPercent, 10);
});
check('consultant title and value CTA', () => {
  assert.match(component, /Онлайн-консультант РОСПАРК/);
  assert.match(component, /Вопросы по парковке и оборудованию/);
  assert.match(component, /Задать вопрос по парковке/);
  assert.doesNotMatch(component, />AI-консультант РОСПАРК</);
});
check('commercial launcher and greeting copy', () => {
  assert.match(component, /Поможем разобраться с парковкой/);
  assert.match(
    component,
    /Опишите задачу — консультант подскажет подходящий вариант/,
  );
  assert.match(
    component,
    /Здравствуйте! Помогу разобраться с автоматизацией парковки/,
  );
});
check('collapsed status uses integrated green indicator', () => {
  const attentionAttributeIndex = component.indexOf('data-attention-cue');
  const collapsedLauncherSource = component.slice(
    Math.max(0, attentionAttributeIndex - 1_200),
    attentionAttributeIndex + 1_200,
  );
  assert.match(component, /bg-emerald-300/);
  assert.match(component, /aria-hidden="true"/);
  assert.match(component, /<span>Онлайн-консультант РОСПАРК<\/span>/);
  assert.doesNotMatch(collapsedLauncherSource, /animate-pulse/);
});
check('attention cue timing is finite and within requested window', () => {
  assert.ok(AI_WIDGET_ATTENTION_DELAY_MS >= 4_000);
  assert.ok(AI_WIDGET_ATTENTION_DELAY_MS <= 7_000);
  assert.ok(AI_WIDGET_ATTENTION_PULSE_MS > 0);
  assert.ok(AI_WIDGET_ATTENTION_PULSE_MS <= 1_500);
  assert.match(component, /setLauncherAttentionActive\(true\)/);
  assert.match(component, /setLauncherAttentionActive\(false\)/);
});
check('attention cue and tooltip are once per session', () => {
  assert.equal(
    AI_WIDGET_ATTENTION_SESSION_KEY,
    'rospark_ai_widget_attention_seen_v1',
  );
  assert.match(component, /sessionStorage\.getItem\(/);
  assert.match(component, /sessionStorage\.setItem\(AI_WIDGET_ATTENTION_SESSION_KEY/);
  assert.match(component, /rememberLauncherInteraction/);
});
check('attention cue respects reduced motion', () => {
  assert.match(
    component,
    /matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/,
  );
  assert.match(component, /motion-reduce:transform-none/);
  assert.match(component, /motion-reduce:transition-none/);
});
check('four ordinary quick questions', () => {
  const questions = [
    'Подобрать систему для моего объекта',
    'Нужен шлагбаум — с чего начать?',
    'Как организовать доступ сотрудников и гостей?',
    'Хочу модернизировать существующую парковку',
  ];
  for (const question of questions) {
    assert.match(component, new RegExp(question.replace(/[?]/g, '\\?')));
    assert.match(analytics, new RegExp(question.replace(/[?]/g, '\\?')));
  }
});
check('free-form example placeholder', () => {
  assert.match(
    component,
    /Например: торговый центр, один въезд, один выезд, 350 машин…/,
  );
});
check('customer-facing forbidden copy is absent', () => {
  const forbiddenRussian = [
    /закрыт(?:ый|ого) тест/iu,
    /тестов(?:ый|ая|ое|ую|ые|ого|ом)/iu,
    /тестовый режим/iu,
    /не вводите (?:реальные )?персональные данные/iu,
    /реальные данные на стенде не вводите/iu,
    /вымышленн(?:ые|ыми|ая|ую)/iu,
    /эксперимент/iu,
  ];
  for (const pattern of forbiddenRussian) {
    assert.doesNotMatch(component, pattern);
    assert.doesNotMatch(puzzleExperience, pattern);
  }
  assert.doesNotMatch(component, /ownerCanaryMarker/);
  assert.doesNotMatch(
    component,
    /aria-(?:label|description)="[^"]*(?:pilot|preview)[^"]*"/iu,
  );
  assert.doesNotMatch(
    component,
    /title="[^"]*(?:pilot|preview)[^"]*"/iu,
  );
  assert.doesNotMatch(
    component,
    />[^<{>\n]*(?:pilot|preview)[^<\n]*</iu,
  );
});
check('preview lead form does not claim an unsent handoff', () => {
  assert.doesNotMatch(
    puzzleExperience,
    /if \(runtimeMode === 'preview'\) \{\s*setCompleted\(true\)/u,
  );
  assert.match(
    puzzleExperience,
    /Отправка формы сейчас недоступна\. Позвоните нам по \+7 \(499\) 321-20-40\./u,
  );
});
check('synthetic contact messages remain ordinary chat input', () => {
  const syntheticMessages = [
    'Иван, +7 999 123-45-67',
    'Свяжитесь со мной по example@example.com',
    'Мой телефон +7 900 000-00-00',
    'Отправлю ТЗ, перезвоните мне',
  ];
  for (const [index, message] of syntheticMessages.entries()) {
    const result = validateAiWidgetChatPayload({
      sessionId: 'session-customer-copy-0001',
      turnId: `turn-customer-copy-${String(index).padStart(4, '0')}`,
      sourcePage: '/parkovka',
      messages: [{ role: 'user', content: message }],
    });
    assert.equal(result.ok, true);
    assert.equal(
      result.ok ? result.payload.messages[0]?.content : null,
      message,
    );
  }
});
check('no unconfirmed lead handoff promise', () => {
  const forbiddenClaims = [
    /заявка создана/iu,
    /менеджер получил/iu,
    /мы вам перезвоним/iu,
    /контакты переданы/iu,
    /специалист уже изучает/iu,
    /специалист РОСПАРК свяжется/iu,
  ];
  for (const pattern of forbiddenClaims) {
    assert.doesNotMatch(component, pattern);
  }
  assert.match(component, /Обращение \$\{result\.publicId\} принято/);
});
check('existing privacy links remain intact', () => {
  assert.match(component, /href="\/privacy"/);
  assert.match(
    component,
    /href="\/soglasie-na-obrabotku-personalnyh-dannyh"/,
  );
});
check('duplicate-send guard preserved', () => {
  assert.match(component, /if \(!content \|\| isSending\) return;/);
  assert.match(component, /Повторно нажимать не нужно/);
});
check('existing chat transport preserved', () => {
  assert.match(component, /fetch\('\/api\/ai-widget\/chat'/);
});
check('recoverable error UI', () => {
  assert.match(component, /Вернуть вопрос в поле/);
  assert.match(component, /setFailedMessage\(userMessage\)/);
});
check('mobile safe-area support', () => {
  assert.match(component, /safe-area-inset-top/);
  assert.match(component, /safe-area-inset-bottom/);
  assert.match(component, /100dvh/);
});
check('minimum primary tap targets', () => {
  assert.match(component, /min-h-11/);
  assert.match(component, /h-12 w-12/);
});
check('keyboard and focus support', () => {
  assert.match(component, /event\.key === 'Escape'/);
  assert.match(component, /focus-visible:ring-2/);
  assert.match(component, /inputRef\.current\?\.focus/);
});
check('live-region and busy semantics', () => {
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /aria-busy=\{isSending\}/);
  assert.match(component, /role="status"/);
});
check('reduced-motion support', () => {
  assert.match(component, /motion-reduce:animate-none/);
  assert.match(component, /motion-reduce:transition-none/);
});
check('consistent Puzzle2 entry point', () => {
  assert.match(puzzlePromo, /онлайн-консультанта РОСПАРК/i);
  assert.match(puzzlePromo, /Задать вопрос по парковке/);
});
check('consistent parkovka embed entry point', () => {
  assert.match(parkovkaEmbed, /онлайн-консультанту РОСПАРК/i);
  assert.match(parkovkaEmbed, /Задать вопрос по парковке/);
});

console.log(`AI_WIDGET_CUSTOMER_CLEANUP_V1_1=${checks.length}/${checks.length} PASS`);
