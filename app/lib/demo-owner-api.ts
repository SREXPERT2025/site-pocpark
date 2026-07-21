import 'server-only';

import { NextResponse } from 'next/server';
import { DemoOwnerReportError } from './demo-owner-report-service';

export function demoOwnerUnauthorized() {
  return NextResponse.json(
    { error: 'Сначала войдите в demo-кабинет.', code: 'UNAUTHORIZED' },
    { status: 401 },
  );
}

export function demoOwnerApiError(error: unknown) {
  if (error instanceof DemoOwnerReportError) {
    const status = error.code === 'TENANT_NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  return NextResponse.json(
    { error: 'Не удалось сформировать demo-отчёт.', code: 'INTERNAL_ERROR' },
    { status: 500 },
  );
}
