import { NextRequest } from 'next/server';
import { leadAdminJson, requireLeadAdmin } from '@/app/lib/lead-admin-api';
import {
  getLeadAdminAnalytics,
  getLeadAdminSummary,
  listLeadAdminLeads,
  recordLeadAdminAudit,
} from '@/app/lib/lead-admin-core';
import { getLeadRegistryDatabase } from '@/app/lib/lead-registry-database';
import { leadAdminFilters } from '@/app/lib/lead-admin-query';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = requireLeadAdmin(request, 'view');
  if ('response' in auth) return auth.response;

  try {
    const filters = leadAdminFilters(request.nextUrl.searchParams);
    const db = getLeadRegistryDatabase();
    const result = listLeadAdminLeads(db, filters);
    recordLeadAdminAudit(db, {
      actor: {
        userId: auth.session.userId,
        role: auth.session.role,
      },
      action: 'list_view',
      metadata: {
        status: filters.status ?? '',
        kind: filters.kind ?? '',
        search_used: Boolean(filters.search),
        page: result.page,
        page_size: result.pageSize,
      },
    });
    return leadAdminJson({
      ...result,
      summary: getLeadAdminSummary(db),
      analytics: getLeadAdminAnalytics(db, {
        fromMs: filters.fromMs,
        toMs: filters.toMs,
      }),
      viewer: {
        displayName: auth.session.displayName,
        role: auth.session.role,
      },
    });
  } catch {
    return leadAdminJson(
      { error: 'Проверьте параметры фильтра.', code: 'INVALID_FILTERS' },
      { status: 400 },
    );
  }
}
