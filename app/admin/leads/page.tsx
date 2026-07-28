import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import {
  LEAD_ADMIN_COOKIE_NAME,
  leadAdminEnabled,
  verifyConfiguredLeadAdminSession,
} from '@/app/lib/lead-admin-auth';
import LeadAdminDashboard from './LeadAdminDashboard';

export const dynamic = 'force-dynamic';

export default function LeadAdminPage({
  searchParams,
}: {
  searchParams?: { search?: string | string[] };
}) {
  if (!leadAdminEnabled()) notFound();
  let session: ReturnType<typeof verifyConfiguredLeadAdminSession>;
  try {
    const token = cookies().get(LEAD_ADMIN_COOKIE_NAME)?.value;
    session = verifyConfiguredLeadAdminSession(token);
  } catch {
    redirect('/admin/leads/login');
  }
  if (!session) redirect('/admin/leads/login');
  const requestedSearch = Array.isArray(searchParams?.search)
    ? searchParams?.search[0]
    : searchParams?.search;
  const initialSearch = (requestedSearch || '').trim().slice(0, 160);
  return (
    <LeadAdminDashboard
      displayName={session.displayName}
      role={session.role}
      initialSearch={initialSearch}
    />
  );
}
