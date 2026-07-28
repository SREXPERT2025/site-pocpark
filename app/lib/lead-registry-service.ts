import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import type { LeadPayload } from '@/lib/leads';
import {
  LEAD_NOTIFICATION_CHANNELS,
  type LeadNotificationChannel,
  registerLead,
} from './lead-registry-core';
import { getLeadRegistryDatabase } from './lead-registry-database';
import { findDemoFeedbackLeadCandidate } from './demo-feedback-lead-store';
import {
  DEMO_FEEDBACK_CONSENT_VERSION,
  DEMO_FEEDBACK_PAGE_SOURCE,
  DEMO_FEEDBACK_SOURCE,
  type DemoFeedbackChannel,
} from './demo-feedback-consent';

export const SITE_LEAD_CONSENT_VERSION = 'site-lead-v1-2026-07-24';

export function leadRegistryEnabled() {
  return process.env.LEAD_REGISTRY_ENABLED === 'true';
}

export function configuredLeadDefaultAssignee() {
  const value = process.env.LEAD_DEFAULT_ASSIGNEE?.trim() || 'sergey';
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(value)) {
    throw new Error('LEAD_DEFAULT_ASSIGNEE задан некорректно.');
  }
  return value;
}

export function configuredLeadOutboxChannels() {
  const configured = process.env.LEAD_OUTBOX_CHANNELS?.trim() || 'max';
  const channels = [...new Set(
    configured
      .split(',')
      .map((channel) => channel.trim().toLowerCase())
      .filter(Boolean),
  )];
  if (
    channels.length === 0 ||
    channels.some((channel) => (
      !(LEAD_NOTIFICATION_CHANNELS as readonly string[]).includes(channel)
    ))
  ) {
    throw new Error('LEAD_OUTBOX_CHANNELS содержит неподдерживаемый канал.');
  }
  return channels as LeadNotificationChannel[];
}

function sourceUrlPath(value: string | undefined) {
  if (!value) return undefined;
  try {
    return new URL(value, 'https://www.роспарк.рф').pathname;
  } catch {
    return undefined;
  }
}

function siteLeadContext(payload: LeadPayload) {
  return {
    company: payload.company,
    object_type: payload.objectType,
    city: payload.city,
    access_points: payload.accessPoints,
    project_stage: payload.projectStage,
    request_goal: payload.requestGoal,
    current_system: payload.currentSystem,
    project_interests: payload.projectInterests,
    message: payload.message,
    intent: payload.intent,
    product: payload.product,
    package_name: payload.packageName,
    source_url_path: sourceUrlPath(payload.sourceUrl),
    ...(payload.utm ?? {}),
  };
}

export function registerSiteLead(
  payload: LeadPayload,
  requestedSubmissionId?: string,
) {
  const submissionId = requestedSubmissionId?.trim() || `site:${randomUUID()}`;
  return registerLead(getLeadRegistryDatabase(), {
    submissionId,
    kind: 'site_form',
    name: payload.name,
    phone: payload.phone,
    source: payload.source ?? payload.sourceSection ?? 'site_form',
    sourcePage: payload.sourcePage,
    sourceSection: payload.sourceSection,
    consentGranted: payload.consent,
    consentVersion: SITE_LEAD_CONSENT_VERSION,
    context: siteLeadContext(payload),
  }, {
    outboxChannels: configuredLeadOutboxChannels(),
    defaultAssignee: configuredLeadDefaultAssignee(),
  });
}

function demoSubmissionId(sessionId: string, requestId: string) {
  const sessionRef = createHash('sha256').update(sessionId).digest('hex');
  return `demo:${sessionRef}:${requestId}`;
}

export function registerDemoFeedbackLead(
  sessionId: string,
  requestId: string,
  channel: DemoFeedbackChannel,
) {
  const candidate = findDemoFeedbackLeadCandidate(sessionId, requestId);
  if (!candidate) return null;

  return registerLead(getLeadRegistryDatabase(), {
    submissionId: demoSubmissionId(sessionId, candidate.requestId),
    kind: 'demo_feedback',
    phone: candidate.phone,
    source: DEMO_FEEDBACK_SOURCE,
    sourcePage: DEMO_FEEDBACK_PAGE_SOURCE,
    sourceSection: 'demo-feedback',
    consentGranted: true,
    consentVersion: DEMO_FEEDBACK_CONSENT_VERSION,
    context: {
      channel,
      request_id: candidate.requestId,
      demo_name: 'guest_request_portal',
    },
  }, {
    outboxChannels: configuredLeadOutboxChannels(),
    defaultAssignee: configuredLeadDefaultAssignee(),
  });
}
