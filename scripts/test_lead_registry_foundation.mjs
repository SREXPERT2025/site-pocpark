import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {
  DEMO_FEEDBACK_RETENTION_MS,
  LEAD_DUPLICATE_WINDOW_MS,
  LEAD_REGISTRY_SLA_MINUTES,
  LEAD_REGISTRY_TIMEZONE,
  LEAD_REGISTRY_WORKDAY_END,
  LEAD_REGISTRY_WORKDAY_START,
  LEAD_REGISTRY_WORKDAYS,
  LeadRegistryError,
  SITE_LEAD_RETENTION_MS,
  cleanupExpiredLeads,
  listAppliedLeadRegistryMigrations,
  registerLead,
  runLeadRegistryMigrations,
  transitionLeadStatus,
} from '../app/lib/lead-registry-core.ts';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const baseTime = Date.UTC(2026, 6, 24, 7, 0, 0);
let idSequence = 0;
const idFactory = () => `test-id-${String(++idSequence).padStart(24, '0')}`;

function expectRegistryError(code, callback) {
  assert.throws(callback, (error) => (
    error instanceof LeadRegistryError && error.code === code
  ));
}

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
runLeadRegistryMigrations(db);
runLeadRegistryMigrations(db);

assert.deepEqual(
  listAppliedLeadRegistryMigrations(db).map(({ version, name }) => ({ version, name })),
  [{ version: 1, name: 'lead_registry_foundation' }],
);
assert.equal(LEAD_REGISTRY_TIMEZONE, 'Europe/Moscow');
assert.deepEqual(LEAD_REGISTRY_WORKDAYS, [1, 2, 3, 4, 5]);
assert.equal(LEAD_REGISTRY_WORKDAY_START, '10:00');
assert.equal(LEAD_REGISTRY_WORKDAY_END, '18:00');
assert.equal(LEAD_REGISTRY_SLA_MINUTES, 60);
assert.equal(LEAD_DUPLICATE_WINDOW_MS, DAY_MS);

const firstInput = {
  submissionId: 'site-form-20260724-0001',
  kind: 'site_form',
  name: 'Тест',
  phone: '+7 999 000-00-01',
  source: 'contacts-form',
  sourcePage: '/contacts',
  sourceSection: 'lead-form',
  consentGranted: true,
  consentVersion: 'site-lead-v1',
  context: {
    city: 'Москва',
    project_interests: ['гостевые заявки', 'парковочная система'],
  },
};

expectRegistryError('CONSENT_REQUIRED', () => registerLead(db, {
  ...firstInput,
  submissionId: 'site-form-20260724-no-consent',
  consentGranted: false,
}, {
  nowMs: baseTime,
  idFactory,
}));

expectRegistryError('INVALID_CONTEXT', () => registerLead(db, {
  ...firstInput,
  submissionId: 'site-form-20260724-bad-context',
  context: { arbitrary_payload: 'not allowed' },
}, {
  nowMs: baseTime,
  idFactory,
}));

const first = registerLead(db, firstInput, { nowMs: baseTime, idFactory });
assert.equal(first.created, true);
assert.equal(first.duplicate, false);
assert.equal(first.idempotent, false);

const firstRetry = registerLead(db, firstInput, {
  nowMs: baseTime + HOUR_MS,
  idFactory,
});
assert.equal(firstRetry.leadId, first.leadId);
assert.equal(firstRetry.created, false);
assert.equal(firstRetry.duplicate, false);
assert.equal(firstRetry.idempotent, true);
assert.equal(
  db.prepare('SELECT COUNT(*) AS count FROM lead_submissions').get().count,
  1,
);

expectRegistryError('IDEMPOTENCY_CONFLICT', () => registerLead(db, {
  ...firstInput,
  phone: '+7 999 000-00-02',
}, {
  nowMs: baseTime + HOUR_MS,
  idFactory,
}));

const duplicate = registerLead(db, {
  ...firstInput,
  submissionId: 'site-form-20260724-0002',
  source: 'quiz-form',
}, {
  nowMs: baseTime + 2 * HOUR_MS,
  idFactory,
});
assert.equal(duplicate.leadId, first.leadId);
assert.equal(duplicate.created, false);
assert.equal(duplicate.duplicate, true);
assert.equal(duplicate.idempotent, false);
assert.equal(
  db.prepare('SELECT COUNT(*) AS count FROM lead_records').get().count,
  1,
);
assert.equal(
  db.prepare('SELECT COUNT(*) AS count FROM lead_submissions').get().count,
  2,
);

expectRegistryError('INVALID_STATUS_TRANSITION', () => transitionLeadStatus(db, {
  leadId: first.leadId,
  toStatus: 'contacted',
  actor: 'director',
  nowMs: baseTime + 3 * HOUR_MS,
  eventIdFactory: idFactory,
}));

expectRegistryError('ASSIGNEE_REQUIRED', () => transitionLeadStatus(db, {
  leadId: first.leadId,
  toStatus: 'assigned',
  actor: 'director',
  nowMs: baseTime + 3 * HOUR_MS,
  eventIdFactory: idFactory,
}));

const assigned = transitionLeadStatus(db, {
  leadId: first.leadId,
  toStatus: 'assigned',
  actor: 'director',
  assignedTo: 'sales-head',
  nowMs: baseTime + 3 * HOUR_MS,
  eventIdFactory: idFactory,
});
assert.equal(assigned.status, 'assigned');
assert.equal(assigned.assigned_to, 'sales-head');

const contacted = transitionLeadStatus(db, {
  leadId: first.leadId,
  toStatus: 'contacted',
  actor: 'sales-head',
  nowMs: baseTime + 4 * HOUR_MS,
  eventIdFactory: idFactory,
});
assert.equal(contacted.status, 'contacted');
assert.equal(contacted.first_contact_at, new Date(baseTime + 4 * HOUR_MS).toISOString());

expectRegistryError('CLOSE_OUTCOME_REQUIRED', () => transitionLeadStatus(db, {
  leadId: first.leadId,
  toStatus: 'closed',
  actor: 'sales-head',
  nowMs: baseTime + 5 * HOUR_MS,
  eventIdFactory: idFactory,
}));

const closed = transitionLeadStatus(db, {
  leadId: first.leadId,
  toStatus: 'closed',
  actor: 'sales-head',
  closeOutcome: 'processed',
  nowMs: baseTime + 5 * HOUR_MS,
  eventIdFactory: idFactory,
});
assert.equal(closed.status, 'closed');
assert.equal(closed.close_outcome, 'processed');
assert.equal(
  db.prepare(`
    SELECT COUNT(*) AS count
    FROM lead_status_events
    WHERE lead_id = ?
  `).get(first.leadId).count,
  4,
);

const afterClose = registerLead(db, {
  ...firstInput,
  submissionId: 'site-form-20260724-0003',
}, {
  nowMs: baseTime + 6 * HOUR_MS,
  idFactory,
});
assert.equal(afterClose.created, true);
assert.notEqual(afterClose.leadId, first.leadId);

const outsideWindowPhone = '+7 999 000-00-03';
const outsideWindowFirst = registerLead(db, {
  ...firstInput,
  submissionId: 'site-form-20260724-0004',
  phone: outsideWindowPhone,
}, {
  nowMs: baseTime,
  idFactory,
});
transitionLeadStatus(db, {
  leadId: outsideWindowFirst.leadId,
  toStatus: 'assigned',
  actor: 'director',
  assignedTo: 'sales-head',
  nowMs: baseTime + DAY_MS - HOUR_MS,
  eventIdFactory: idFactory,
});
const outsideWindowSecond = registerLead(db, {
  ...firstInput,
  submissionId: 'site-form-20260725-0005',
  phone: outsideWindowPhone,
}, {
  nowMs: baseTime + DAY_MS + 1,
  idFactory,
});
assert.equal(outsideWindowFirst.created, true);
assert.equal(outsideWindowSecond.created, true);
assert.notEqual(outsideWindowSecond.leadId, outsideWindowFirst.leadId);

const demoLead = registerLead(db, {
  submissionId: 'demo-feedback-20260724-01',
  kind: 'demo_feedback',
  phone: '+7 999 000-00-04',
  source: 'demo_guest_requests',
  sourcePage: '/demo/gostevaya-zayavka',
  consentGranted: true,
  consentVersion: 'demo-feedback-v1-2026-07-23',
  context: { channel: 'max' },
}, {
  nowMs: baseTime,
  idFactory,
});
const demoExpiry = db.prepare(`
  SELECT expires_at
  FROM lead_records
  WHERE id = ?
`).get(demoLead.leadId).expires_at;
assert.equal(demoExpiry, baseTime + DEMO_FEEDBACK_RETENTION_MS);

const siteExpiry = db.prepare(`
  SELECT expires_at
  FROM lead_records
  WHERE id = ?
`).get(afterClose.leadId).expires_at;
assert.equal(siteExpiry, baseTime + 6 * HOUR_MS + SITE_LEAD_RETENTION_MS);

assert.equal(cleanupExpiredLeads(db, baseTime + 31 * DAY_MS), 1);
assert.equal(
  db.prepare('SELECT COUNT(*) AS count FROM lead_records WHERE id = ?').get(demoLead.leadId).count,
  0,
);
assert.equal(
  db.prepare('SELECT COUNT(*) AS count FROM lead_submissions WHERE lead_id = ?').get(demoLead.leadId).count,
  0,
);

db.close();
console.log('lead registry foundation smoke: OK');
