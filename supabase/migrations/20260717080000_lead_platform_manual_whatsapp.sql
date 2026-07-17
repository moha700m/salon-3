-- Lead discovery and private preview platform.
-- Additive migration: preserves all existing tables and data.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  google_place_id text not null unique,
  name text not null,
  phone_local text,
  phone_international text,
  address text,
  city text not null default 'السعودية',
  district text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  rating numeric(2,1) check (rating is null or rating between 0 and 5),
  reviews_count integer not null default 0 check (reviews_count >= 0),
  business_status text,
  maps_url text,
  website_url text,
  website_status text not null default 'NEEDS_REVIEW'
    check (website_status in ('HAS_WEBSITE', 'NO_WEBSITE', 'NEEDS_REVIEW')),
  opening_hours_json jsonb not null default '[]'::jsonb,
  photos_json jsonb not null default '[]'::jsonb,
  place_data_json jsonb not null default '{}'::jsonb,
  primary_type text,
  types_json jsonb not null default '[]'::jsonb,
  contact_status text not null default 'NEW'
    check (contact_status in (
      'NEW','NEEDS_REVIEW','NO_WEBSITE','PREVIEW_GENERATING','PREVIEW_READY',
      'READY_TO_CONTACT','CONTACTED','REPLIED','INTERESTED','NOT_INTERESTED',
      'DO_NOT_CONTACT','PHONE_MISSING','ERROR'
    )),
  contact_block_reason text,
  notes text,
  last_contacted_at timestamptz,
  last_google_fetch_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_city on public.leads(city);
create index if not exists idx_leads_district on public.leads(district);
create index if not exists idx_leads_rating on public.leads(rating desc);
create index if not exists idx_leads_reviews on public.leads(reviews_count desc);
create index if not exists idx_leads_website_status on public.leads(website_status);
create index if not exists idx_leads_contact_status on public.leads(contact_status);
create index if not exists idx_leads_updated_at on public.leads(updated_at desc);
create index if not exists idx_leads_phone_international on public.leads(phone_international) where phone_international is not null;

create table if not exists public.previews (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  slug text not null unique,
  access_token_hash text,
  title text not null,
  subtitle text,
  about_text text,
  services_json jsonb not null default '[]'::jsonb,
  gallery_json jsonb not null default '[]'::jsonb,
  theme_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_previews_lead on public.previews(lead_id);
create index if not exists idx_previews_active on public.previews(is_active, expires_at);
create index if not exists idx_previews_created_at on public.previews(created_at desc);

-- Extend the existing outreach_messages table for the new manual workflow.
alter table public.outreach_messages alter column barber_id drop not null;
alter table public.outreach_messages alter column recipient_phone drop not null;
alter table public.outreach_messages alter column message_content drop not null;
alter table public.outreach_messages add column if not exists lead_id uuid references public.leads(id) on delete cascade;
alter table public.outreach_messages add column if not exists preview_id uuid references public.previews(id) on delete set null;
alter table public.outreach_messages add column if not exists message_text text;
alter table public.outreach_messages add column if not exists ai_model text;
alter table public.outreach_messages add column if not exists version integer not null default 1;
alter table public.outreach_messages add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_outreach_lead on public.outreach_messages(lead_id);
create index if not exists idx_outreach_preview on public.outreach_messages(preview_id);

create table if not exists public.contact_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  message_id uuid references public.outreach_messages(id) on delete set null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'phone', 'email', 'other')),
  action text not null check (action in ('OPENED_WHATSAPP','MARKED_SENT','NOT_SENT','STATUS_CHANGED','NOTE_ADDED')),
  message_snapshot text,
  contacted_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_contact_logs_lead on public.contact_logs(lead_id, created_at desc);

create table if not exists public.search_jobs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  country text not null default 'السعودية',
  city text not null,
  district text,
  activity_types jsonb not null default '[]'::jsonb,
  requested_limit integer not null check (requested_limit between 1 and 60),
  status text not null default 'RUNNING' check (status in ('RUNNING','COMPLETED','FAILED','RATE_LIMITED')),
  results_count integer not null default 0,
  new_results_count integer not null default 0,
  error_message text,
  request_fingerprint text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_search_jobs_created_at on public.search_jobs(created_at desc);
create index if not exists idx_search_jobs_fingerprint on public.search_jobs(request_fingerprint, created_at desc);

create table if not exists public.place_cache (
  google_place_id text primary key,
  place_data_json jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists idx_place_cache_expires on public.place_cache(expires_at);

create table if not exists public.rate_limit_events (
  id bigint generated always as identity primary key,
  action text not null,
  fingerprint text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_rate_limit_events_lookup on public.rate_limit_events(action, fingerprint, created_at desc);

-- Keep the browser roles locked out. All dashboard and public-preview reads go through server routes.
alter table public.leads enable row level security;
alter table public.previews enable row level security;
alter table public.contact_logs enable row level security;
alter table public.search_jobs enable row level security;
alter table public.place_cache enable row level security;
alter table public.rate_limit_events enable row level security;

revoke all on table public.leads from anon, authenticated;
revoke all on table public.previews from anon, authenticated;
revoke all on table public.contact_logs from anon, authenticated;
revoke all on table public.search_jobs from anon, authenticated;
revoke all on table public.place_cache from anon, authenticated;
revoke all on table public.rate_limit_events from anon, authenticated;

grant select, insert, update, delete on table public.leads to service_role;
grant select, insert, update, delete on table public.previews to service_role;
grant select, insert, update, delete on table public.contact_logs to service_role;
grant select, insert, update, delete on table public.search_jobs to service_role;
grant select, insert, update, delete on table public.place_cache to service_role;
grant select, insert, update, delete on table public.rate_limit_events to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace view public.lead_dashboard_kpis
with (security_invoker = true)
as
select
  count(*) filter (where website_status = 'NO_WEBSITE') as potential_customers,
  count(*) filter (where contact_status in ('PREVIEW_READY','READY_TO_CONTACT','CONTACTED','REPLIED','INTERESTED')) as previews_ready,
  count(*) filter (where contact_status = 'CONTACTED') as contacted,
  count(*) filter (where contact_status in ('REPLIED','INTERESTED')) as positive_replies
from public.leads;

revoke all on table public.lead_dashboard_kpis from anon, authenticated;
grant select on table public.lead_dashboard_kpis to service_role;
