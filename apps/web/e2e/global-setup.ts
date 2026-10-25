import { execSync } from 'node:child_process';

/**
 * Resets local test state: rate-limit counters (all runs come from 127.0.0.1) and the demo admin's
 * MFA factor. Uses the local Supabase container directly: no test-only code path
 * exists in the application itself.
 */
export default function globalSetup() {
  const sql = [
    'truncate private.rate_limits',
    // The admin enrolls a fresh TOTP factor in admin.spec.ts (the secret is only shown once).
    "delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'admin@moroccotravelride.test')",
  ].join('; ');
  execSync(`docker exec supabase_db_moroccotravelride psql -U postgres -c "${sql}"`, {
    stdio: 'ignore',
  });
}
