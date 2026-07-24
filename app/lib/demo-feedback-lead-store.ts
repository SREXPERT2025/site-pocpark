import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { DEMO_FEEDBACK_LEAD_TTL_MS } from './demo-config';
import {
  DEMO_FEEDBACK_CONSENT_VERSION,
  DEMO_FEEDBACK_PAGE_SOURCE,
  DEMO_FEEDBACK_SOURCE,
  type DemoFeedbackChannel,
} from './demo-feedback-consent';
import { getDemoDatabase } from './demo-database';

type GuestRequestContactRow = {
  id: string;
  phone: string;
};

function sessionReference(sessionId: string) {
  return createHash('sha256').update(sessionId).digest('hex');
}

function normalizeStoredPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!/^7\d{10}$/.test(digits)) {
    throw new Error('INVALID_DEMO_PHONE');
  }
  return digits;
}

export function findDemoFeedbackLeadCandidate(
  sessionId: string,
  requestId: string,
) {
  const db = getDemoDatabase();
  const guestRequest = db.prepare(`
    SELECT id, phone
    FROM demo_guest_requests
    WHERE id = ? AND session_id = ? AND is_seed = 0
  `).get(requestId, sessionId) as GuestRequestContactRow | undefined;
  if (!guestRequest) return null;
  return {
    requestId: guestRequest.id,
    phone: normalizeStoredPhone(guestRequest.phone),
  };
}

export function createDemoFeedbackLead(
  sessionId: string,
  requestId: string,
  channel: DemoFeedbackChannel,
) {
  const db = getDemoDatabase();
  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  const sessionRef = sessionReference(sessionId);

  return db.transaction(() => {
    db.prepare('DELETE FROM demo_feedback_leads WHERE expires_at <= ?').run(now);

    const guestRequest = db.prepare(`
      SELECT id, phone
      FROM demo_guest_requests
      WHERE id = ? AND session_id = ? AND is_seed = 0
    `).get(requestId, sessionId) as GuestRequestContactRow | undefined;

    if (!guestRequest) return null;

    const result = db.prepare(`
      INSERT INTO demo_feedback_leads (
        id, phone, created_at, source, session_ref, request_id, channel,
        consent, consent_version, status, page_source, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 'new', ?, ?)
      ON CONFLICT(session_ref, request_id) DO NOTHING
    `).run(
      randomBytes(16).toString('hex'),
      normalizeStoredPhone(guestRequest.phone),
      createdAt,
      DEMO_FEEDBACK_SOURCE,
      sessionRef,
      guestRequest.id,
      channel,
      DEMO_FEEDBACK_CONSENT_VERSION,
      DEMO_FEEDBACK_PAGE_SOURCE,
      now + DEMO_FEEDBACK_LEAD_TTL_MS,
    );

    return {
      created: result.changes === 1,
      expiresAt: new Date(now + DEMO_FEEDBACK_LEAD_TTL_MS).toISOString(),
    };
  })();
}
