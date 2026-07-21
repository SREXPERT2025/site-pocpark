import assert from 'node:assert/strict';
import Database from 'better-sqlite3';

const baseUrl = process.env.DEMO_BASE_URL;
const databasePath = process.env.DEMO_REQUESTS_DB_PATH;
if (!baseUrl || !databasePath) {
  throw new Error('Set DEMO_BASE_URL and DEMO_REQUESTS_DB_PATH to an isolated running demo instance.');
}

async function login() {
  const response = await fetch(`${baseUrl}/api/demo/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: 'TEST', password: 'TEST' }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
  assert.ok(cookie);
  return cookie;
}

async function request(path, { cookie, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  return { status: response.status, payload: await response.json() };
}

function sessionId(cookie) {
  return cookie.slice(cookie.indexOf('=') + 1);
}

function assertSafeDto(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.notEqual(key, 'session_id');
    assert.notEqual(key, 'sessionId');
    assert.notEqual(key, 'phone');
    assertSafeDto(child);
  }
}

const unauthenticatedParking = await request('/api/demo/parking-sessions');
const unauthenticatedDiscounts = await request('/api/demo/web-discounts');
assert.equal(unauthenticatedParking.status, 401);
assert.equal(unauthenticatedParking.payload.code, 'UNAUTHORIZED');
assert.equal(unauthenticatedDiscounts.status, 401);
assert.equal(unauthenticatedDiscounts.payload.code, 'UNAUTHORIZED');

const cookieA = await login();
const cookieB = await login();
const [parkingA, parkingB] = await Promise.all([
  request('/api/demo/parking-sessions?pageSize=50', { cookie: cookieA }),
  request('/api/demo/parking-sessions?pageSize=50', { cookie: cookieB }),
]);
assert.equal(parkingA.status, 200);
assert.equal(parkingB.status, 200);
assert.equal(parkingA.payload.total, 14);
assert.equal(parkingB.payload.total, 14);
assert.deepEqual(
  parkingA.payload.items.map(({ ticketNumber }) => ticketNumber).sort(),
  parkingB.payload.items.map(({ ticketNumber }) => ticketNumber).sort(),
);
assertSafeDto(parkingA.payload);

const ticketA = await request('/api/demo/parking-sessions?ticket=%20d-1042%20', { cookie: cookieA });
const ticketB = await request('/api/demo/parking-sessions?ticket=D-1042', { cookie: cookieB });
const vehicle = await request(`/api/demo/parking-sessions?vehicle=${encodeURIComponent('A 104 B-C 77')}`, { cookie: cookieA });
assert.equal(ticketA.payload.total, 1);
assert.equal(ticketB.payload.total, 1);
assert.equal(vehicle.payload.items[0].vehicleNumber, 'А104ВС77');

const body = {
  parkingSessionId: ticketA.payload.items[0].id,
  comment: '<b>stored as text</b>',
  originalCost: 1,
  discountPercent: 1,
};
const race = await Promise.all([
  request('/api/demo/web-discounts', { cookie: cookieA, method: 'POST', body }),
  request('/api/demo/web-discounts', { cookie: cookieA, method: 'POST', body }),
]);
assert.deepEqual(race.map(({ status }) => status).sort(), [201, 409]);
assert.equal(race.find(({ status }) => status === 409).payload.code, 'DISCOUNT_ALREADY_APPLIED');
const appliedA = race.find(({ status }) => status === 201).payload.discount;
assert.equal(appliedA.discountPercent, 100);
assert.equal(appliedA.guestDue, 0);
assert.equal(appliedA.tenantCharge, appliedA.originalCost);
assert.notEqual(appliedA.originalCost, 1);

assert.equal((await request('/api/demo/web-discounts?pageSize=50', { cookie: cookieA })).payload.total, 1);
assert.equal((await request('/api/demo/web-discounts?pageSize=50', { cookie: cookieB })).payload.total, 0);
const foreignSessionDiscount = await request('/api/demo/web-discounts', {
  cookie: cookieB,
  method: 'POST',
  body: { parkingSessionId: ticketA.payload.items[0].id },
});
assert.equal(foreignSessionDiscount.status, 404);
assert.equal(foreignSessionDiscount.payload.code, 'PARKING_SESSION_NOT_FOUND');
assert.equal((await request('/api/demo/web-discounts', {
  cookie: cookieB,
  method: 'POST',
  body: { parkingSessionId: ticketB.payload.items[0].id },
})).status, 201);

const completed = parkingA.payload.items.find(({ status }) => status === 'completed');
assert.ok(completed);
const completedDiscount = await request('/api/demo/web-discounts', {
  cookie: cookieA,
  method: 'POST',
  body: { parkingSessionId: completed.id },
});
assert.equal(completedDiscount.status, 409);
assert.equal(completedDiscount.payload.code, 'SESSION_ALREADY_COMPLETED');

const discountsA = await request('/api/demo/web-discounts?pageSize=50', { cookie: cookieA });
const discountsB = await request('/api/demo/web-discounts?pageSize=50', { cookie: cookieB });
assert.equal(discountsA.payload.total, 1);
assert.equal(discountsB.payload.total, 1);
assertSafeDto(discountsA.payload);
assertSafeDto(discountsB.payload);

const db = new Database(databasePath, { readonly: true });
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM demo_parking_sessions WHERE session_id = ?').get(sessionId(cookieA)).count, 14);
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM demo_parking_sessions WHERE session_id = ?').get(sessionId(cookieB)).count, 14);
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM demo_web_discounts WHERE session_id = ?').get(sessionId(cookieA)).count, 1);
assert.equal(db.prepare('SELECT COUNT(*) AS count FROM demo_web_discounts WHERE session_id = ?').get(sessionId(cookieB)).count, 1);
assert.equal(db.pragma('foreign_key_check').length, 0);
db.close();

process.stdout.write(`${JSON.stringify({
  seedRowsPerSession: 14,
  ticketSearch: ticketA.payload.items[0].ticketNumber,
  vehicleSearch: vehicle.payload.items[0].vehicleNumber,
  race: race.map(({ status }) => status).sort(),
  discountsA: discountsA.payload.total,
  discountsB: discountsB.payload.total,
  foreignKeyViolations: 0,
}, null, 2)}\n`);
