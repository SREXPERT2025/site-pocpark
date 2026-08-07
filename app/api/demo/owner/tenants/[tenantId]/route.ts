import { NextRequest, NextResponse } from 'next/server';
import { demoOwnerApiError, demoOwnerUnauthorized } from '@/app/lib/demo-owner-api';
import { DemoOwnerReportError, getOwnerTenantDetail } from '@/app/lib/demo-owner-report-service';
import { readDemoSession } from '@/app/lib/demo-session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const sessionId = readDemoSession(request);
  if (!sessionId) return demoOwnerUnauthorized();
  try {
    if (!tenantId || tenantId.length > 100) {
      throw new DemoOwnerReportError('INVALID_QUERY', 'Некорректный идентификатор арендатора.');
    }
    return NextResponse.json(getOwnerTenantDetail(sessionId, tenantId, request.nextUrl.searchParams));
  } catch (error) {
    return demoOwnerApiError(error);
  }
}
