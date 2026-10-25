import { execSync } from 'node:child_process';

/**
 * Clears the application rate-limit counters of the local database so repeated test runs from
 * 127.0.0.1 are not blocked. Uses the local Supabase container directly: no test-only code path
 * exists in the application itself.
 */
export default function globalSetup() {
  execSync(
    'docker exec supabase_db_moroccotravelride psql -U postgres -c "truncate private.rate_limits"',
    { stdio: 'ignore' },
  );
}
