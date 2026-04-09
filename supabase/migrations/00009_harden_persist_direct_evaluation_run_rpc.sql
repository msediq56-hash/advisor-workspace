-- Migration 9: Harden persist_direct_evaluation_run_atomic execution boundary.
--
-- Narrow follow-up to migration 8. Keep the existing function body/signature,
-- but lock execution down to the trusted service_role path and pin search_path.
--
-- PostgREST connects as `authenticator` and needs execute privilege to discover
-- the function in its schema cache before switching to the JWT role. Both
-- `authenticator` and `service_role` receive execute; `anon` and `authenticated`
-- are explicitly revoked so the function cannot be called from untrusted paths.
--
-- Wrapped in one DO block so the local Supabase migrator applies the
-- hardening statements as a single executable statement.

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION persist_direct_evaluation_run_atomic(jsonb, jsonb, jsonb) SET search_path = public';
  EXECUTE 'REVOKE ALL ON FUNCTION persist_direct_evaluation_run_atomic(jsonb, jsonb, jsonb) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION persist_direct_evaluation_run_atomic(jsonb, jsonb, jsonb) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION persist_direct_evaluation_run_atomic(jsonb, jsonb, jsonb) FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION persist_direct_evaluation_run_atomic(jsonb, jsonb, jsonb) TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION persist_direct_evaluation_run_atomic(jsonb, jsonb, jsonb) TO authenticator';
END;
$$;
