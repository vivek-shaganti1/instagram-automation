-- Row Level Security for the Prisma-managed tables.
--
-- Prisma creates tables in `public` with RLS disabled. Supabase exposes
-- `public` through its Data API, so without this every table — including
-- `settings`, which stores API keys — is readable with the public anon key.
--
-- Run once in the Supabase SQL editor (or `psql $DATABASE_URL -f rls.sql`).
-- Idempotent: safe to re-run.
--
-- Access model (single-tenant dashboard):
--   * anon (not signed in)        → no access to anything
--   * authenticated (signed in)   → full access to operational tables
--   * service_role / postgres     → bypass RLS (worker via Prisma, API routes
--                                   when SUPABASE_SERVICE_ROLE_KEY is set)
--   * users / instagram_accounts / sync_logs → legacy backend-auth tables, no
--                                   client access at all

-- Operational tables the dashboard reads and writes.
do $$
declare
  t text;
begin
  foreach t in array array['generated_posts', 'analytics', 'settings', 'used_hooks', 'used_concepts', 'used_themes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s: authenticated full access" on public.%I', t, t);
    execute format(
      'create policy "%s: authenticated full access" on public.%I for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- Legacy tables: lock down completely (RLS on, no policies = deny for anon/authenticated).
alter table public.users enable row level security;
alter table public.instagram_accounts enable row level security;
alter table public.sync_logs enable row level security;

-- Make sure the API roles can reach the tables at all (RLS then filters rows).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.generated_posts, public.analytics, public.settings,
  public.used_hooks, public.used_concepts, public.used_themes
to authenticated;
revoke all on public.users, public.instagram_accounts, public.sync_logs from anon, authenticated;
revoke all on
  public.generated_posts, public.analytics, public.settings,
  public.used_hooks, public.used_concepts, public.used_themes
from anon;
