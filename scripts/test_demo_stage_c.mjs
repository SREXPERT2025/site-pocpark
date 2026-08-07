import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

const baseUrl = process.env.DEMO_BASE_URL;
if (!baseUrl) throw new Error('Set DEMO_BASE_URL to an isolated running demo instance.');

const require = createRequire(import.meta.url);
const originalModuleLoad = Module._load;
Module._load = function loadForDemoTest(request, parent, isMain) {
  if (request === 'server-only') return {};
  return originalModuleLoad.call(this, request, parent, isMain);
};
Module._extensions['.ts'] = (module, filename) => {
  const source = readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const repoRoot = process.cwd();
const { getDemoOwnerPeriod } = require(path.join(repoRoot, 'app/lib/demo-report-period.ts'));
const { generateDemoHistoricalDataset } = require(path.join(repoRoot, 'app/lib/demo-history-data.ts'));
const { isValidDemoInn } = require(path.join(repoRoot, 'app/lib/demo-synthetic-data.ts'));

const julyPeriod = getDemoOwnerPeriod('previous-month', new Date('2026-07-21T12:00:00Z'));
assert.equal(julyPeriod.key, '2026-06');
assert.equal(julyPeriod.from, '2026-05-31T21:00:00.000Z');
assert.equal(julyPeriod.toExclusive, '2026-06-30T21:00:00.000Z');
assert.equal(julyPeriod.label, 'Июнь 2026');
const januaryPeriod = getDemoOwnerPeriod('previous-month', new Date('2027-01-05T12:00:00Z'));
assert.equal(januaryPeriod.key, '2026-12');
assert.equal(januaryPeriod.label, 'Декабрь 2026');

const historyOne = generateDemoHistoricalDataset(julyPeriod);
const historyTwo = generateDemoHistoricalDataset(julyPeriod);
const otherMonth = generateDemoHistoricalDataset(januaryPeriod);
const historyAfterOtherMonth = generateDemoHistoricalDataset(julyPeriod);
const runtimePreviousMonthPeriod = getDemoOwnerPeriod('previous-month', new Date());
assert.deepEqual(historyOne, historyTwo);
assert.deepEqual(historyOne, historyAfterOtherMonth);
assert.notDeepEqual(historyOne.guestRequests[0], otherMonth.guestRequests[0]);
assert.equal(historyOne.tenants.length, 32);
assert.equal(historyOne.guestRequests.length, 760);
assert.equal(historyOne.guestPassages.length, 840);
assert.equal(historyOne.webDiscounts.length, 1_450);
assert.equal(historyOne.parkingSessions.length, historyOne.webDiscounts.length);
assert.ok(historyOne.tenants.every(({ inn }) => isValidDemoInn(inn)));
const tenantIds = new Set(historyOne.tenants.map(({ id }) => id));
const requestIds = new Set(historyOne.guestRequests.map(({ id }) => id));
const parkingIds = new Set(historyOne.parkingSessions.map(({ id }) => id));
assert.ok(historyOne.guestRequests.every(({ tenantId }) => tenantIds.has(tenantId)));
assert.ok(historyOne.guestPassages.every(({ tenantId, requestId, durationMinutes, amount, exitedAt }) => (
  tenantIds.has(tenantId) && requestIds.has(requestId) && durationMinutes > 0 && amount >= 0 && Boolean(exitedAt)
)));
assert.ok(historyOne.webDiscounts.every((discount) => (
  tenantIds.has(discount.tenantId)
  && parkingIds.has(discount.parkingSessionId)
  && discount.durationMinutes > 0
  && discount.originalCost >= 0
  && discount.guestDue === 0
  && discount.tenantCharge === discount.originalCost
)));
const passageCounts = new Map();
for (const passage of historyOne.guestPassages) {
  passageCounts.set(passage.requestId, (passageCounts.get(passage.requestId) ?? 0) + 1);
}
const multiPassageRequests = historyOne.guestRequests.filter((request) => (
  request.requestType === 'multi' && (passageCounts.get(request.id) ?? 0) > 1
));
assert.equal(multiPassageRequests.length, 60);
assert.ok(multiPassageRequests.every((request) => {
  const count = passageCounts.get(request.id);
  return count >= 3 && count <= 5;
}));

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

async function request(pathname, { cookie, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
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

function assertSafeDto(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.notEqual(key, 'session_id');
    assert.notEqual(key, 'sessionId');
    assert.notEqual(key, 'phone');
    assert.notEqual(key, 'publicToken');
    assert.notEqual(key, 'public_token');
    assertSafeDto(child);
  }
}

const ownerPaths = [
  '/api/demo/owner/summary',
  '/api/demo/owner/tenants',
  '/api/demo/owner/tenants/tenant-test',
  '/api/demo/owner/guest-requests',
  '/api/demo/owner/web-discounts',
  '/api/demo/owner/operations',
];
for (const pathname of ownerPaths) {
  const unauthorized = await request(pathname);
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.payload.code, 'UNAUTHORIZED');
}

const cookieA = await login();
const cookieB = await login();
const [summaryA, summaryB] = await Promise.all([
  request('/api/demo/owner/summary', { cookie: cookieA }),
  request('/api/demo/owner/summary', { cookie: cookieB }),
]);
assert.equal(summaryA.status, 200);
assert.deepEqual(summaryA.payload, summaryB.payload);
assert.deepEqual(summaryA.payload.period, {
  from: runtimePreviousMonthPeriod.from,
  toExclusive: runtimePreviousMonthPeriod.toExclusive,
  timezone: 'Europe/Moscow',
  label: runtimePreviousMonthPeriod.label,
});
assert.equal(summaryA.payload.tenantCount, 32);
assert.equal(summaryA.payload.guestRequestCount, 760);
assert.equal(summaryA.payload.guestPassageCount, 840);
assert.equal(summaryA.payload.webDiscountCount, 1_450);
assert.equal(summaryA.payload.completedOperationCount, 2_290);
assert.equal(
  summaryA.payload.amounts.totalTenantCharges,
  summaryA.payload.amounts.guestPassages + summaryA.payload.amounts.webDiscounts,
);

const [tenantsA, tenantsB] = await Promise.all([
  request('/api/demo/owner/tenants?pageSize=100&sort=shortName&order=asc', { cookie: cookieA }),
  request('/api/demo/owner/tenants?pageSize=100&sort=shortName&order=asc', { cookie: cookieB }),
]);
assert.equal(tenantsA.payload.total, 32);
assert.deepEqual(tenantsA.payload, tenantsB.payload);
const tenantTotals = tenantsA.payload.items.reduce((totals, tenant) => ({
  requests: totals.requests + tenant.guestRequestCount,
  passages: totals.passages + tenant.guestPassageCount,
  discounts: totals.discounts + tenant.webDiscountCount,
  carCount: totals.carCount + tenant.carOperationCount,
  truckCount: totals.truckCount + tenant.truckOperationCount,
  carAmount: totals.carAmount + tenant.carAmount,
  truckAmount: totals.truckAmount + tenant.truckAmount,
  guest: totals.guest + tenant.guestPassageAmount,
  web: totals.web + tenant.webDiscountAmount,
  total: totals.total + tenant.totalAmount,
}), {
  requests: 0, passages: 0, discounts: 0, carCount: 0, truckCount: 0,
  carAmount: 0, truckAmount: 0, guest: 0, web: 0, total: 0,
});
assert.equal(tenantTotals.requests, summaryA.payload.guestRequestCount);
assert.equal(tenantTotals.passages, summaryA.payload.guestPassageCount);
assert.equal(tenantTotals.discounts, summaryA.payload.webDiscountCount);
assert.equal(tenantTotals.carCount, summaryA.payload.carOperationCount);
assert.equal(tenantTotals.truckCount, summaryA.payload.truckOperationCount);
assert.equal(tenantTotals.guest, summaryA.payload.amounts.guestPassages);
assert.equal(tenantTotals.web, summaryA.payload.amounts.webDiscounts);
assert.equal(tenantTotals.total, summaryA.payload.amounts.totalTenantCharges);
assert.ok(tenantTotals.truckAmount / tenantTotals.truckCount > tenantTotals.carAmount / tenantTotals.carCount);

const operations = await request('/api/demo/owner/operations?pageSize=100', { cookie: cookieA });
assert.equal(operations.payload.total, 2_290);
const guestOperations = await request('/api/demo/owner/operations?operationType=guest_passage&pageSize=1', { cookie: cookieA });
const discountOperations = await request('/api/demo/owner/operations?operationType=web_discount&pageSize=1', { cookie: cookieA });
assert.equal(guestOperations.payload.total, 840);
assert.equal(discountOperations.payload.total, 1_450);
const carOperations = await request('/api/demo/owner/operations?vehicleType=car&pageSize=1', { cookie: cookieA });
const truckOperations = await request('/api/demo/owner/operations?vehicleType=truck&pageSize=1', { cookie: cookieA });
assert.equal(carOperations.payload.total, summaryA.payload.carOperationCount);
assert.equal(truckOperations.payload.total, summaryA.payload.truckOperationCount);
assert.ok(carOperations.payload.total > truckOperations.payload.total);

const multiRequests = await request('/api/demo/owner/guest-requests?requestType=multi&sort=passageCount&order=desc&pageSize=100', { cookie: cookieA });
assert.ok(multiRequests.payload.items.some(({ passageCount }) => passageCount > 1));
const multiExample = multiRequests.payload.items.find(({ passageCount }) => passageCount > 1);
const byRequestNumber = await request(`/api/demo/owner/operations?search=${encodeURIComponent(multiExample.requestNumber)}&pageSize=100`, { cookie: cookieA });
assert.equal(byRequestNumber.payload.total, multiExample.passageCount);

const webDiscounts = await request('/api/demo/owner/web-discounts?pageSize=100&sort=appliedAt&order=desc', { cookie: cookieA });
assert.equal(webDiscounts.payload.total, 1_450);
const sampleDiscount = webDiscounts.payload.items.find(({ vehicleNumber }) => vehicleNumber);
assert.ok(sampleDiscount);
const byTicket = await request(`/api/demo/owner/operations?search=${encodeURIComponent(sampleDiscount.ticketNumber)}`, { cookie: cookieA });
assert.equal(byTicket.payload.total, 1);
const byVehicle = await request(`/api/demo/owner/operations?search=${encodeURIComponent(sampleDiscount.vehicleNumber)}`, { cookie: cookieA });
assert.ok(byVehicle.payload.total >= 1);

const sampleTenant = tenantsA.payload.items[0];
const tenantSummary = await request(`/api/demo/owner/summary?tenantId=${sampleTenant.tenantId}`, { cookie: cookieA });
assert.equal(tenantSummary.payload.guestRequestCount, sampleTenant.guestRequestCount);
assert.equal(tenantSummary.payload.guestPassageCount, sampleTenant.guestPassageCount);
assert.equal(tenantSummary.payload.webDiscountCount, sampleTenant.webDiscountCount);
assert.equal(tenantSummary.payload.amounts.totalTenantCharges, sampleTenant.totalAmount);
const tenantSearch = await request(`/api/demo/owner/operations?search=${encodeURIComponent(sampleTenant.shortName)}&pageSize=100`, { cookie: cookieA });
assert.equal(tenantSearch.payload.total, sampleTenant.operationCount);
const tenantDetail = await request(`/api/demo/owner/tenants/${sampleTenant.tenantId}`, { cookie: cookieA });
assert.equal(tenantDetail.status, 200);
assert.equal(tenantDetail.payload.summary.totalAmount, sampleTenant.totalAmount);
const operationsByTenant = await request(`/api/demo/owner/operations?tenantId=${sampleTenant.tenantId}&pageSize=100`, { cookie: cookieA });
assert.equal(operationsByTenant.payload.total, sampleTenant.operationCount);
const completedRequests = await request('/api/demo/owner/guest-requests?status=completed&pageSize=1', { cookie: cookieA });
assert.equal(completedRequests.payload.total, 660);
const carDiscounts = await request('/api/demo/owner/web-discounts?vehicleType=car&pageSize=1', { cookie: cookieA });
const truckDiscounts = await request('/api/demo/owner/web-discounts?vehicleType=truck&pageSize=1', { cookie: cookieA });
assert.equal(carDiscounts.payload.total, 1_050);
assert.equal(truckDiscounts.payload.total, 400);
const officeTenants = await request('/api/demo/owner/tenants?objectType=office&pageSize=100', { cookie: cookieA });
assert.ok(officeTenants.payload.total > 0);
assert.ok(officeTenants.payload.items.every(({ objectType }) => objectType === 'office'));

const firstPage = await request('/api/demo/owner/operations?page=1&pageSize=10&sort=enteredAt&order=desc', { cookie: cookieA });
const secondPage = await request('/api/demo/owner/operations?page=2&pageSize=10&sort=enteredAt&order=desc', { cookie: cookieA });
assert.equal(firstPage.payload.items.length, 10);
assert.equal(secondPage.payload.items.length, 10);
assert.equal(new Set([...firstPage.payload.items, ...secondPage.payload.items].map(({ id }) => id)).size, 20);
for (const pathname of [
  '/api/demo/owner/summary?period=unknown',
  '/api/demo/owner/operations?page=0',
  '/api/demo/owner/operations?pageSize=101',
  '/api/demo/owner/operations?sort=unsafe_sql',
  '/api/demo/owner/operations?vehicleType=bus',
  '/api/demo/owner/operations?operationType=other',
  '/api/demo/owner/operations?status=unknown',
]) {
  const invalid = await request(pathname, { cookie: cookieA });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.payload.code, 'INVALID_QUERY');
}
const missingTenant = await request('/api/demo/owner/tenants/tenant-does-not-exist', { cookie: cookieA });
assert.equal(missingTenant.status, 404);
assert.equal(missingTenant.payload.code, 'TENANT_NOT_FOUND');

const currentBeforeA = await request('/api/demo/owner/summary?period=current', { cookie: cookieA });
const currentBeforeB = await request('/api/demo/owner/summary?period=current', { cookie: cookieB });
assert.equal(currentBeforeA.payload.guestRequestCount, 0);
assert.equal(currentBeforeB.payload.guestRequestCount, 0);
assert.equal(currentBeforeA.payload.webDiscountCount, 0);
assert.equal(currentBeforeB.payload.webDiscountCount, 0);
assert.equal(currentBeforeA.payload.activeParkingSessionCount, 10);
assert.equal(currentBeforeB.payload.activeParkingSessionCount, 10);

const validFrom = new Date(Date.now() + 3_600_000);
const validUntil = new Date(validFrom.getTime() + 3_600_000);
const createdA = await request('/api/demo/requests', {
  cookie: cookieA,
  method: 'POST',
  body: {
    guestName: 'Гость текущей сессии A',
    phone: '79991234567',
    vehicleNumber: 'А123ВС77',
    note: 'Изоляция owner API',
    requestType: 'single',
    validFrom: validFrom.toISOString(),
    validUntil: validUntil.toISOString(),
  },
});
assert.equal(createdA.status, 201);
const parkingA = await request('/api/demo/parking-sessions?ticket=D-1042', { cookie: cookieA });
const parkingB = await request('/api/demo/parking-sessions?ticket=D-1042', { cookie: cookieB });
const appliedA = await request('/api/demo/web-discounts', {
  cookie: cookieA,
  method: 'POST',
  body: { parkingSessionId: parkingA.payload.items[0].id, comment: 'Операция A' },
});
assert.equal(appliedA.status, 201);

const [currentAAfterOwnAction, currentBBeforeOwnAction] = await Promise.all([
  request('/api/demo/owner/summary?period=current', { cookie: cookieA }),
  request('/api/demo/owner/summary?period=current', { cookie: cookieB }),
]);
assert.equal(currentAAfterOwnAction.payload.guestRequestCount, 1);
assert.equal(currentAAfterOwnAction.payload.webDiscountCount, 1);
assert.equal(currentBBeforeOwnAction.payload.guestRequestCount, 0);
assert.equal(currentBBeforeOwnAction.payload.webDiscountCount, 0);

const appliedB = await request('/api/demo/web-discounts', {
  cookie: cookieB,
  method: 'POST',
  body: { parkingSessionId: parkingB.payload.items[0].id, comment: 'Операция B' },
});
assert.equal(appliedB.status, 201);
const [currentRequestsA, currentRequestsB, currentDiscountsA, currentDiscountsB] = await Promise.all([
  request('/api/demo/owner/guest-requests?period=current&pageSize=100', { cookie: cookieA }),
  request('/api/demo/owner/guest-requests?period=current&pageSize=100', { cookie: cookieB }),
  request('/api/demo/owner/web-discounts?period=current&pageSize=100', { cookie: cookieA }),
  request('/api/demo/owner/web-discounts?period=current&pageSize=100', { cookie: cookieB }),
]);
assert.equal(currentRequestsA.payload.total, 1);
assert.equal(currentRequestsB.payload.total, 0);
assert.equal(currentDiscountsA.payload.total, 1);
assert.equal(currentDiscountsB.payload.total, 1);
assert.notEqual(currentDiscountsA.payload.items[0].id, currentDiscountsB.payload.items[0].id);
assert.equal(currentDiscountsA.payload.items[0].ticketNumber, currentDiscountsB.payload.items[0].ticketNumber);

const historyAfterActionsA = await request('/api/demo/owner/summary', { cookie: cookieA });
const historyAfterActionsB = await request('/api/demo/owner/summary', { cookie: cookieB });
assert.deepEqual(historyAfterActionsA.payload, historyAfterActionsB.payload);

for (const value of [
  summaryA.payload,
  tenantsA.payload,
  operations.payload,
  multiRequests.payload,
  webDiscounts.payload,
  tenantDetail.payload,
  currentAAfterOwnAction.payload,
  currentRequestsA.payload,
  currentDiscountsA.payload,
]) assertSafeDto(value);

process.stdout.write(`${JSON.stringify({
  commitStageAB: '25f8c7978316e095d3a743b8ba23fc323d0743a7',
  period: summaryA.payload.period,
  historical: {
    tenants: summaryA.payload.tenantCount,
    guestRequests: summaryA.payload.guestRequestCount,
    guestPassages: summaryA.payload.guestPassageCount,
    webDiscounts: summaryA.payload.webDiscountCount,
    operations: summaryA.payload.completedOperationCount,
    carOperations: summaryA.payload.carOperationCount,
    truckOperations: summaryA.payload.truckOperationCount,
    carAmount: tenantTotals.carAmount,
    truckAmount: tenantTotals.truckAmount,
    amounts: summaryA.payload.amounts,
  },
  multiRequest: {
    requestNumber: multiExample.requestNumber,
    passageCount: multiExample.passageCount,
  },
  filters: {
    guestOperations: guestOperations.payload.total,
    discountOperations: discountOperations.payload.total,
    ticketResult: byTicket.payload.total,
    vehicleResult: byVehicle.payload.total,
    tenantResult: tenantSearch.payload.total,
  },
  isolation: {
    aRequests: currentRequestsA.payload.total,
    bRequests: currentRequestsB.payload.total,
    aDiscounts: currentDiscountsA.payload.total,
    bDiscounts: currentDiscountsB.payload.total,
  },
}, null, 2)}\n`);
