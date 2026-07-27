import assert from 'node:assert/strict';
import {
  aiWidgetOriginAllowed,
  aiWidgetPilotEnabled,
  requireLoopbackGatewayUrl,
  validateAiWidgetChatPayload,
} from '../app/lib/ai-widget-pilot.ts';

assert.equal(aiWidgetPilotEnabled({ AI_WIDGET_PILOT_ENABLED: 'true' }), true);
assert.equal(aiWidgetPilotEnabled({ AI_WIDGET_PILOT_ENABLED: 'false' }), false);
assert.equal(aiWidgetPilotEnabled({}), false);

assert.equal(
  requireLoopbackGatewayUrl('http://127.0.0.1:4317/'),
  'http://127.0.0.1:4317',
);
assert.throws(
  () => requireLoopbackGatewayUrl('https://example.com'),
  /NOT_LOOPBACK/,
);
assert.throws(
  () => requireLoopbackGatewayUrl('http://192.168.1.20:4317'),
  /NOT_LOOPBACK/,
);

const valid = validateAiWidgetChatPayload({
  sourcePage: '/demo',
  messages: [{ role: 'user', content: 'Какие объекты вы автоматизируете?' }],
});
assert.equal(valid.ok, true);

for (const invalid of [
  null,
  {},
  { sourcePage: 'https://example.com', messages: [{ role: 'user', content: 'x' }] },
  { sourcePage: '/demo', messages: [] },
  { sourcePage: '/demo', messages: [{ role: 'system', content: 'x' }] },
  { sourcePage: '/demo', messages: [{ role: 'assistant', content: 'x' }] },
  { sourcePage: '/demo', messages: [{ role: 'user', content: 'x'.repeat(1_201) }] },
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
