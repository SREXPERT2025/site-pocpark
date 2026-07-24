import { hashLeadAdminPassword } from '../app/lib/lead-admin-auth-core.ts';

const password = process.env.LEAD_ADMIN_PASSWORD_TO_HASH;

if (!password) {
  console.error('Set LEAD_ADMIN_PASSWORD_TO_HASH before running this command.');
  process.exit(1);
}

if (password.length < 14) {
  console.error('Use a password with at least 14 characters.');
  process.exit(1);
}

console.log(hashLeadAdminPassword(password));
