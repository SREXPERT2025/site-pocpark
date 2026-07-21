import { NextRequest, NextResponse } from 'next/server';
import { demoOwnerApiError, demoOwnerUnauthorized } from '@/app/lib/demo-owner-api';
import { getOwnerSummary } from '@/app/lib/demo-owner-report-service';
import { readDemoSession } from '@/app/lib/demo-session';

export async function GET(request: NextRequest) {
  const sessionId = readDemoSession(request);
  if (!sessionId) return demoOwnerUnauthorized();
  try {
    return NextResponse.json(getOwnerSummary(sessionId, request.nextUrl.searchParams));
  } catch (error) {
    return demoOwnerApiError(error);
  }
}
