-- Explicit default-deny policies for every server-only table.
-- Service role continues to bypass RLS; anon/authenticated receive no rows and cannot write.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'barbers','generated_websites','outreach_messages','admin_users','workflow_settings','workflow_runs',
    'leads','previews','contact_logs','search_jobs','place_cache','rate_limit_events'
  ]
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = 'deny_browser_access'
    ) then
      execute format(
        'create policy deny_browser_access on public.%I for all to anon, authenticated using (false) with check (false)',
        table_name
      );
    end if;
  end loop;
end $$;
