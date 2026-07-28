import assert from 'node:assert/strict';
import {
  aiWidgetHandoffMode,
  aiWidgetEnabled,
  aiWidgetOriginAllowed,
  aiWidgetPilotEnabled,
  aiWidgetRuntimeMode,
  requireAiWidgetGatewayUrl,
  requireLoopbackGatewayUrl,
  validateAiWidgetChatPayload,
} from '../app/lib/ai-widget-pilot.ts';

assert.equal(aiWidgetPilotEnabled({ AI_WIDGET_PILOT_ENABLED: 'true' }), true);
assert.equal(aiWidgetPilotEnabled({ AI_WIDGET_PILOT_ENABLED: 'false' }), false);
assert.equal(aiWidgetPilotEnabled({}), false);
assert.equal(aiWidgetEnabled({ AI_WIDGET_ENABLED: 'true' }), true);
assert.equal(
  aiWidgetRuntimeMode({ AI_WIDGET_RUNTIME_MODE: 'production' }),
  'production',
);
assert.equal(aiWidgetRuntimeMode({}), 'preview');
assert.equal(aiWidgetHandoffMode({ AI_WIDGET_HANDOFF_MODE: 'test' }), 'test');
assert.equal(aiWidgetHandoffMode({ AI_WIDGET_HANDOFF_MODE: 'live' }), 'off');
assert.equal(aiWidgetHandoffMode({
  AI_WIDGET_RUNTIME_MODE: 'production',
  AI_WIDGET_HANDOFF_MODE: 'live',
}), 'live');
assert.equal(aiWidgetHandoffMode({
  AI_WIDGET_RUNTIME_MODE: 'production',
  AI_WIDGET_HANDOFF_MODE: 'test',
}), 'off');
assert.equal(aiWidgetHandoffMode({}), 'off');

assert.equal(
  requireLoopbackGatewayUrl('http://127.0.0.1:4317/'),
  'http://127.0.0.1:4317',
);
assert.throws(
  () => requireLoopbackGatewayUrl('https://example.com'),
  /NOT_LOOPBACK/,
);
assert.equal(
  requireAiWidgetGatewayUrl(
    'https://ai-gateway.rospark.internal/',
    'production',
  ),
  'https://ai-gateway.rospark.internal',
);
assert.throws(
  () => requireAiWidgetGatewayUrl(
    'http://ai-gateway.rospark.internal',
    'production',
  ),
  /PRODUCTION_HTTPS/,
);
assert.throws(
  () => requireAiWidgetGatewayUrl(
    'https://user:secret@example.com',
    'production',
  ),
  /PRODUCTION_HTTPS/,
);
assert.throws(
  () => requireLoopbackGatewayUrl('http://192.168.1.20:4317'),
  /NOT_LOOPBACK/,
);

const valid = validateAiWidgetChatPayload({
  sessionId: 'session-20260728-test-0001',
  turnId: 'turn-20260728-test-0000001',
  sourcePage: '/demo',
  messages: [{ role: 'user', content: 'Какие объекты вы автоматизируете?' }],
});
assert.equal(valid.ok, true);

for (const invalid of [
  null,
  {},
  {
    sessionId: 'short',
    turnId: 'turn-20260728-test-0000001',
    sourcePage: '/demo',
    messages: [{ role: 'user', content: 'x' }],
  },
  {
    sessionId: 'session-20260728-test-0001',
    turnId: 'turn-20260728-test-0000001',
    sourcePage: 'https://example.com',
    messages: [{ role: 'user', content: 'x' }],
  },
  {
    sessionId: 'session-20260728-test-0001',
    turnId: 'turn-20260728-test-0000001',
    sourcePage: '/demo',
    messages: [],
  },
  {
    sessionId: 'session-20260728-test-0001',
    turnId: 'turn-20260728-test-0000001',
    sourcePage: '/demo',
    messages: [{ role: 'system', content: 'x' }],
  },
  {
    sessionId: 'session-20260728-test-0001',
    turnId: 'turn-20260728-test-0000001',
    sourcePage: '/demo',
    messages: [{ role: 'assistant', content: 'x' }],
  },
  {
    sessionId: 'session-20260728-test-0001',
    turnId: 'turn-20260728-test-0000001',
    sourcePage: '/demo',
    messages: [{ role: 'user', content: 'x'.repeat(1_201) }],
  },
]) {
  assert.equal(validateAiWidgetChatPayload(invalid).ok, false);
}

assert.equal(
  aiWidgetOriginAllowed(
    'https://srtestrealme.ru:3001',
    'http://127.0.0.1:3001/api/demo/ai-widget/chat',
    { AI_WIDGET_PILOT_ORIGINS: 'https://srtestrealme.ru:3001' },
  ),
  true,
);
assert.equal(
  aiWidgetOriginAllowed(
    'https://www.роспарк.рф',
    'http://127.0.0.1:3000/api/ai-widget/chat',
    {
      AI_WIDGET_RUNTIME_MODE: 'production',
      AI_WIDGET_ALLOWED_ORIGINS: 'https://www.роспарк.рф',
    },
  ),
  true,
);
assert.equal(
  aiWidgetOriginAllowed(
    'https://unconfigured.example',
    'https://unconfigured.example/api/ai-widget/chat',
    {
      AI_WIDGET_RUNTIME_MODE: 'production',
      AI_WIDGET_ALLOWED_ORIGINS: 'https://www.роспарк.рф',
    },
  ),
  false,
);
assert.equal(
  aiWidgetOriginAllowed(
    'https://evil.example',
    'http://127.0.0.1:3001/api/demo/ai-widget/chat',
    { AI_WIDGET_PILOT_ORIGINS: 'https://srtestrealme.ru:3001' },
  ),
  false,
);
assert.equal(
  aiWidgetOriginAllowed(
    'https://spoofed.example',
    'http://127.0.0.1:3001/api/demo/ai-widget/chat',
    { AI_WIDGET_PILOT_ORIGINS: 'https://srtestrealme.ru:3001' },
  ),
  false,
);

console.log('AI widget pilot checks: OK');
