import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const originalModuleLoad = Module._load;
Module._load = function loadForLeadAdminTest(request, parent, isMain) {
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
const Database = require('better-sqlite3');
const {
  createLeadAdminSessionToken,
  hashLeadAdminPassword,
  leadAdminRoleHasPermission,
  verifyLeadAdminPassword,
  verifyLeadAdminSessionToken,
} = require(path.join(repoRoot, 'app/lib/lead-admin-auth-core.ts'));
const {
  buildLeadAdminCsv,
  deleteLeadForAdmin,
  getLeadAdminAnalytics,
  getLeadAdminSummary,
  listLeadAdminLeads,
  recordLeadAdminAudit,
  moscowWorkingMinutesBetween,
  transitionLeadForAdmin,
} = require(path.join(repoRoot, 'app/lib/lead-admin-core.ts'));
const {
  registerLead,
  runLeadRegistryMigrations,
} = require(path.join(repoRoot, 'app/lib/lead-registry-core.ts'));

const PASSWORD = 'correct horse battery staple';
const PASSWORD_HASH = hashLeadAdminPassword(
  PASSWORD,
  Buffer.from('00112233445566778899aabbccddeeff', 'hex'),
);
assert.equal(verifyLeadAdminPassword(PASSWORD, PASSWORD_HASH), true);
assert.equal(verifyLeadAdminPassword('wrong password value', PASSWORD_HASH), false);
assert.equal(verifyLeadAdminPassword(PASSWORD, 'broken'), false);
assert.equal(leadAdminRoleHasPermission('director', 'delete'), true);
assert.equal(leadAdminRoleHasPermission('sales_head', 'delete'), false);
assert.equal(leadAdminRoleHasPermission('sales_head', 'export'), true);

const SESSION_SECRET = 'lead-admin-test-secret-with-more-than-32-bytes';
const sessionNow = Date.UTC(2026, 6, 24, 8, 0, 0);
const sessionToken = createLeadAdminSessionToken({
  userId: 'andrey',
  role: 'director',
  nowMs: sessionNow,
  ttlMs: 60_000,
}, SESSION_SECRET);
assert.deepEqual(
  verifyLeadAdminSessionToken(sessionToken, SESSION_SECRET, sessionNow + 30_000),
  {
    userId: 'andrey',
    role: 'director',
    issuedAt: sessionNow,
    expiresAt: sessionNow + 60_000,
  },
);
assert.equal(
  verifyLeadAdminSessionToken(sessionToken, SESSION_SECRET, sessionNow + 60_000),
  null,
);
assert.equal(
  verifyLeadAdminSessionToken(`${sessionToken.slice(0, -1)}x`, SESSION_SECRET, sessionNow),
  null,
);

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
runLeadRegistryMigrations(db);

let idSequence = 0;
const idFactory = () => (++idSequence)
  .toString(16)
  .padStart(8, '0')
  .padEnd(32, '0');
const baseTime = Date.UTC(2026, 6, 24, 7, 0, 0);
const actor = { userId: 'andrey', role: 'director' };

function addLead({
  submissionId,
  kind = 'site_form',
  name,
  phone,
  source = 'contacts-form',
  sourcePage = '/contacts',
  nowMs,
}) {
  return registerLead(db, {
    submissionId,
    kind,
    name,
    phone,
    source,
    sourcePage,
    consentGranted: true,
    consentVersion: kind === 'demo_feedback'
      ? 'demo-feedback-v1-2026-07-23'
      : 'site-lead-v1',
    context: { message: 'Нужна консультация' },
  }, {
    nowMs,
    idFactory,
    outboxChannels: ['max'],
  });
}

const first = addLead({
  submissionId: 'site-form-admin-test-0001',
  name: 'Алексей',
  phone: '+7 999 000-00-31',
  nowMs: baseTime,
});
const formulaLead = addLead({
  submissionId: 'site-form-admin-test-0002',
  name: '=HYPERLINK("https://invalid.test")',
  phone: '+7 999 000-00-32',
  nowMs: baseTime + 1_000,
});
addLead({
  submissionId: 'demo-feedback-admin-0003',
  kind: 'demo_feedback',
  name: 'Демо',
  phone: '+7 999 000-00-33',
  source: 'demo_guest_requests',
  sourcePage: '/demo/gostevaya-zayavka',
  nowMs: baseTime + 2_000,
});

const allLeads = listLeadAdminLeads(db, { pageSize: 25 });
assert.equal(allLeads.total, 3);
assert.equal(allLeads.items.length, 3);
assert.match(allLeads.items[0].publicId, /^RSP-[0-9A-F]{8}$/);
assert.equal(allLeads.items[0].latestMaxNotification.status, 'pending');
assert.equal(
  allLeads.items[0].latestMaxNotification.providerMessageId,
  null,
);
assert.equal(listLeadAdminLeads(db, { kind: 'demo_feedback' }).total, 1);
assert.equal(listLeadAdminLeads(db, { search: 'Алексей' }).total, 1);
assert.equal(listLeadAdminLeads(db, { search: '0032' }).total, 1);
assert.equal(
  listLeadAdminLeads(db, { search: allLeads.items[0].publicId }).total,
  1,
);

const assigned = transitionLeadForAdmin(db, {
  actor,
  leadId: first.leadId,
  toStatus: 'assigned',
  assignedTo: 'sergey',
  nowMs: baseTime + 60_000,
});
assert.equal(assigned.status, 'assigned');
assert.equal(assigned.assigned_to, 'sergey');

const contacted = transitionLeadForAdmin(db, {
  actor: { userId: 'sergey', role: 'sales_head' },
  leadId: first.leadId,
  toStatus: 'contacted',
  nowMs: baseTime + 120_000,
});
assert.equal(contacted.status, 'contacted');

const closed = transitionLeadForAdmin(db, {
  actor: { userId: 'sergey', role: 'sales_head' },
  leadId: first.leadId,
  toStatus: 'closed',
  closeOutcome: 'processed',
  nowMs: baseTime + 180_000,
});
assert.equal(closed.status, 'closed');
assert.equal(closed.close_outcome, 'processed');

const summary = getLeadAdminSummary(db);
assert.equal(summary.statuses.closed, 1);
assert.equal(summary.statuses.new, 2);
assert.equal(summary.outbox.pending, 3);
assert.equal(
  moscowWorkingMinutesBetween(
    Date.parse('2026-07-24T14:30:00.000Z'),
    Date.parse('2026-07-27T07:15:00.000Z'),
  ),
  45,
);
const analytics = getLeadAdminAnalytics(db, {}, {
  nowMs: baseTime + 30 * 60_000,
});
assert.deepEqual(analytics.funnel, {
  received: 3,
  assigned: 1,
  contacted: 1,
  closed: 1,
});
assert.deepEqual(analytics.submissions, {
  received: 3,
  duplicates: 0,
});
assert.deepEqual(analytics.firstContactSla, {
  targetWorkingMinutes: 60,
  eligible: 3,
  met: 1,
  breached: 0,
  pending: 2,
  averageWorkingMinutes: 2,
});
assert.equal(analytics.sources.length, 2);
assert.equal(analytics.sources[0].source, 'contacts-form');
assert.equal(analytics.sources[0].submissions, 2);
assert.ok(!JSON.stringify(analytics).includes('Алексей'));
assert.ok(!JSON.stringify(analytics).includes('79990000031'));
assert.ok(!JSON.stringify(analytics).includes('Нужна консультация'));
assert.equal(
  getLeadAdminAnalytics(db, {
    fromMs: baseTime + 1_500,
    toMs: baseTime + 3_000,
  }, {
    nowMs: baseTime + 30 * 60_000,
  }).funnel.received,
  1,
);
assert.equal(
  db.prepare(`
    SELECT COUNT(*) AS count
    FROM lead_admin_audit_events
    WHERE action = 'status_change'
  `).get().count,
  3,
);

const csv = buildLeadAdminCsv(listLeadAdminLeads(db, { pageSize: 25 }).items);
assert.equal(csv.charCodeAt(0), 0xFEFF);
assert.ok(csv.includes(`"'=HYPERLINK(""https://invalid.test"")"`));
assert.ok(csv.includes(`"'+79990000032"`));
recordLeadAdminAudit(db, {
  actor,
  action: 'export',
  metadata: { row_count: 3 },
  nowMs: baseTime + 240_000,
});

assert.throws(
  () => deleteLeadForAdmin(db, {
    actor: { userId: 'sergey', role: 'sales_head' },
    leadId: formulaLead.leadId,
    reason: 'test',
  }),
  /DELETE_FORBIDDEN/,
);
assert.equal(deleteLeadForAdmin(db, {
  actor,
  leadId: formulaLead.leadId,
  reason: 'test',
  nowMs: baseTime + 300_000,
}), true);
assert.equal(listLeadAdminLeads(db).total, 2);
assert.equal(
  db.prepare(`
    SELECT COUNT(*) AS count
    FROM lead_admin_audit_events
    WHERE action = 'delete' AND lead_id = ?
  `).get(formulaLead.leadId).count,
  1,
);

assert.throws(
  () => recordLeadAdminAudit(db, {
    actor,
    action: 'list_view',
    metadata: { phone: '+79990000000' },
  }),
  /Недопустимые audit metadata/,
);

db.close();
console.log('Lead admin auth, roles, audit, workflow, export and deletion tests passed.');
