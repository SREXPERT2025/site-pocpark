import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import {
  LEAD_ADMIN_COOKIE_NAME,
  leadAdminEnabled,
  verifyConfiguredLeadAdminSession,
} from '@/app/lib/lead-admin-auth';
import LeadAdminLogin from './LeadAdminLogin';

export const dynamic = 'force-dynamic';

export default function LeadAdminLoginPage() {
  if (!leadAdminEnabled()) notFound();
  let session = null;
  try {
    const token = cookies().get(LEAD_ADMIN_COOKIE_NAME)?.value;
    session = verifyConfiguredLeadAdminSession(token);
  } catch {
    // The login form will show the safe configuration error returned by API.
  }
  if (session) redirect('/admin/leads');
  return <LeadAdminLogin />;
}
