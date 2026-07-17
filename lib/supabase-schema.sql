-- Salon Agent production schema
-- Server-side access only: the Next.js app uses a Supabase secret key.

create extension if not exists pgcrypto;

create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  place_id text unique not null,
  name_ar text not null,
  name_en text,
  slug text unique not null,
  phone text,
  whatsapp text,
  rating numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  review_count integer not null default 0 check (review_count >= 0),
  address text,
  city text not null,
  neighborhood text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  has_website boolean not null default false,
  existing_website_url text,
  google_maps_url text,
  photo_reference text,
  business_hours jsonb not null default '[]'::jsonb,
  types text[] not null default '{}'::text[],
  discovered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_barbers_city on public.barbers(city);
create index if not exists idx_barbers_rating on public.barbers(rating desc);
create index if not exists idx_barbers_has_website on public.barbers(has_website);
create index if not exists idx_barbers_discovered_at on public.barbers(discovered_at desc);

create table if not exists public.generated_websites (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null unique references public.barbers(id) on delete cascade,
  subdomain text unique not null,
  deployed_url text not null,
  template_id text not null default 'luxury-dark-v2',
  primary_color text not null default '#D4AF37',
  secondary_color text not null default '#0A0A0A',
  ai_description_ar text,
  ai_description_en text,
  services jsonb not null default '[]'::jsonb,
  screenshot_url text,
  screenshot_mobile_url text,
  status text not null default 'draft' check (status in ('draft', 'generated', 'deployed', 'live')),
  vercel_deployment_id text,
  generated_at timestamptz not null default now(),
  deployed_at timestamptz
);

create index if not exists idx_websites_status on public.generated_websites(status);
create index if not exists idx_websites_generated_at on public.generated_websites(generated_at desc);

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  website_id uuid references public.generated_websites(id) on delete set null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'sms', 'email')),
  template_used text,
  message_content text not null,
  language text not null default 'ar' check (language in ('ar', 'en')),
  recipient_phone text not null,
  whatsapp_message_id text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'read', 'failed', 'replied')),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  replied_at timestamptz,
  reply_content text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_outreach_status on public.outreach_messages(status);
create index if not exists idx_outreach_barber on public.outreach_messages(barber_id);
create index if not exists idx_outreach_website on public.outreach_messages(website_id);
create index if not exists idx_outreach_created_at on public.outreach_messages(created_at desc);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  role text not null default 'admin',
  openai_key_encrypted text,
  is_active boolean not null default true,
  last_login timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.admin_users(id) on delete set null,
  target_cities text[] not null default array['الدمام', 'الخبر'],
  min_rating numeric(2,1) not null default 4.0 check (min_rating >= 0 and min_rating <= 5),
  monthly_price numeric(10,2) not null default 300.00 check (monthly_price >= 0),
  currency text not null default 'SAR',
  cron_enabled boolean not null default true,
  cron_schedule text not null default '0 6 * * *',
  daily_limit integer not null default 10 check (daily_limit between 1 and 50),
  message_template_ar text,
  message_template_en text,
  auto_send_whatsapp boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists idx_workflow_settings_user on public.workflow_settings(user_id);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'failed', 'skipped')),
  discovered_count integer not null default 0,
  new_barbers_count integer not null default 0,
  websites_generated integer not null default 0,
  messages_sent integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  triggered_by text not null default 'cron' check (triggered_by in ('cron', 'manual'))
);

-- The app performs all database work on the server with a secret key.
-- Keep browser roles locked out even if the Data API is enabled.
alter table public.barbers enable row level security;
alter table public.generated_websites enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.admin_users enable row level security;
alter table public.workflow_settings enable row level security;
alter table public.workflow_runs enable row level security;

revoke all on table public.barbers from anon, authenticated;
revoke all on table public.generated_websites from anon, authenticated;
revoke all on table public.outreach_messages from anon, authenticated;
revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.workflow_settings from anon, authenticated;
revoke all on table public.workflow_runs from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.barbers to service_role;
grant select, insert, update, delete on table public.generated_websites to service_role;
grant select, insert, update, delete on table public.outreach_messages to service_role;
grant select, insert, update, delete on table public.admin_users to service_role;
grant select, insert, update, delete on table public.workflow_settings to service_role;
grant select, insert, update, delete on table public.workflow_runs to service_role;

create or replace view public.dashboard_kpis
with (security_invoker = true)
as
with price as (
  select coalesce((select monthly_price from public.workflow_settings order by updated_at desc limit 1), 300::numeric) as monthly_price
), counts as (
  select
    (select count(*) from public.barbers where has_website = false) as potential_customers,
    (select count(*) from public.generated_websites where status in ('generated', 'deployed', 'live')) as websites_ready,
    (select count(*) from public.outreach_messages where status in ('sent', 'delivered', 'read', 'replied')) as messages_delivered,
    (select count(*) from public.outreach_messages where status = 'replied') as positive_replies
)
select
  counts.potential_customers,
  counts.websites_ready,
  counts.messages_delivered,
  counts.positive_replies,
  counts.potential_customers * price.monthly_price as potential_monthly_revenue_sar
from counts cross join price;

create or replace view public.recent_activity
with (security_invoker = true)
as
select
  b.id as barber_id,
  b.name_ar,
  b.city,
  b.rating,
  gw.deployed_url,
  latest_message.status as message_status,
  latest_message.sent_at
from public.barbers b
left join public.generated_websites gw on gw.barber_id = b.id
left join lateral (
  select om.status, om.sent_at
  from public.outreach_messages om
  where om.barber_id = b.id
  order by om.created_at desc
  limit 1
) latest_message on true
order by b.discovered_at desc
limit 50;

revoke all on table public.dashboard_kpis from anon, authenticated;
revoke all on table public.recent_activity from anon, authenticated;
grant select on table public.dashboard_kpis to service_role;
grant select on table public.recent_activity to service_role;

insert into public.workflow_settings (
  target_cities,
  min_rating,
  monthly_price,
  currency,
  cron_enabled,
  cron_schedule,
  daily_limit,
  auto_send_whatsapp
)
select array['الدمام', 'الخبر'], 4.0, 300.00, 'SAR', true, '0 6 * * *', 10, false
where not exists (select 1 from public.workflow_settings);
