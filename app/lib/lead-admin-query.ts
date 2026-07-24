import {
  LEAD_KINDS,
  LEAD_STATUSES,
  type LeadKind,
  type LeadStatus,
} from './lead-registry-core';
import type { LeadAdminListFilters } from './lead-admin-core';

function integer(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function moscowDay(value: string | null, endExclusive: boolean) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  const timestamp = new Date(`${value}T00:00:00+03:00`).getTime();
  if (!Number.isFinite(timestamp)) return Number.NaN;
  return endExclusive ? timestamp + 24 * 60 * 60 * 1000 : timestamp;
}

export function leadAdminFilters(params: URLSearchParams): LeadAdminListFilters {
  const statusValue = params.get('status')?.trim();
  const kindValue = params.get('kind')?.trim();
  const status = statusValue && LEAD_STATUSES.includes(statusValue as LeadStatus)
    ? statusValue as LeadStatus
    : statusValue
      ? 'invalid' as LeadStatus
      : undefined;
  const kind = kindValue && LEAD_KINDS.includes(kindValue as LeadKind)
    ? kindValue as LeadKind
    : kindValue
      ? 'invalid' as LeadKind
      : undefined;
  return {
    status,
    kind,
    search: params.get('search')?.trim() || undefined,
    fromMs: moscowDay(params.get('from'), false),
    toMs: moscowDay(params.get('to'), true),
    page: integer(params.get('page')),
    pageSize: integer(params.get('pageSize')),
  };
}
