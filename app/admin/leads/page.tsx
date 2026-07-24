import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import {
  LEAD_ADMIN_COOKIE_NAME,
  leadAdminEnabled,
  verifyConfiguredLeadAdminSession,
} from '@/app/lib/lead-admin-auth';
import LeadAdminDashboard from './LeadAdminDashboard';

export const dynamic = 'force-dynamic';

export default function LeadAdminPage() {
  if (!leadAdminEnabled()) notFound();
  let session: ReturnType<typeof verifyConfiguredLeadAdminSession>;
  try {
    const token = cookies().get(LEAD_ADMIN_COOKIE_NAME)?.value;
    session = verifyConfiguredLeadAdminSession(token);
  } catch {
    redirect('/admin/leads/login');
  }
  if (!session) redirect('/admin/leads/login');
  return (
    <LeadAdminDashboard
      displayName={session.displayName}
      role={session.role}
    />
  );
}
