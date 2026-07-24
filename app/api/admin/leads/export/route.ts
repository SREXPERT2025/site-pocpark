import { NextRequest, NextResponse } from 'next/server';
import { requireLeadAdmin } from '@/app/lib/lead-admin-api';
import {
  buildLeadAdminCsv,
  listLeadAdminLeads,
  recordLeadAdminAudit,
} from '@/app/lib/lead-admin-core';
import { leadAdminFilters } from '@/app/lib/lead-admin-query';
import { getLeadRegistryDatabase } from '@/app/lib/lead-registry-database';

const MAX_EXPORT_ROWS = 5_000;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = requireLeadAdmin(request, 'export');
  if ('response' in auth) return auth.response;

  try {
    const filters = {
      ...leadAdminFilters(request.nextUrl.searchParams),
      page: 1,
      pageSize: MAX_EXPORT_ROWS,
    };
    const db = getLeadRegistryDatabase();
    const result = listLeadAdminLeads(
      db,
      filters,
      { maxPageSize: MAX_EXPORT_ROWS },
    );
    if (result.total > MAX_EXPORT_ROWS) {
      const response = NextResponse.json(
        {
          error: 'В выгрузке больше 5000 строк. Уточните фильтры.',
          code: 'EXPORT_TOO_LARGE',
        },
        { status: 413 },
      );
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    recordLeadAdminAudit(db, {
      actor: {
        userId: auth.session.userId,
        role: auth.session.role,
      },
      action: 'export',
      metadata: {
        row_count: result.items.length,
        status: filters.status ?? '',
        kind: filters.kind ?? '',
        search_used: Boolean(filters.search),
      },
    });
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(buildLeadAdminCsv(result.items), {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="rospark-leads-${date}.csv"`,
        'Content-Type': 'text/csv; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    const response = NextResponse.json(
      { error: 'Проверьте параметры выгрузки.', code: 'INVALID_FILTERS' },
      { status: 400 },
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
