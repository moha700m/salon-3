-- Salon campaign workflow: preview + advertisement image + WhatsApp review state.
-- Additive migration. Existing lead, preview, and outreach data remains untouched.

create table if not exists public.salon_campaigns (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  preview_id uuid references public.previews(id) on delete set null,
  salon_name text not null,
  owner_name text,
  phone text,
  whatsapp text,
  city text,
  district text,
  address text,
  maps_url text,
  working_hours text,
  services_json jsonb not null default '[]'::jsonb,
  instagram_url text,
  tiktok_url text,
  website_preview_url text,
  ai_content_json jsonb not null default '{}'::jsonb,
  advertisement_image_path text,
  advertisement_image_url text,
  whatsapp_message text,
  whatsapp_link text,
  missing_fields jsonb not null default '[]'::jsonb,
  generation_status text not null default 'draft'
    check (generation_status in ('draft','generating','ready_for_review','ready_to_send','partial_failure','failed')),
  send_status text not null default 'not_sent'
    check (send_status in ('not_sent','ready','sent','failed')),
  last_error text,
  version integer not null default 1 check (version > 0),
  generated_at timestamptz,
  reviewed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_salon_campaigns_status
  on public.salon_campaigns(generation_status, send_status, updated_at desc);
create index if not exists idx_salon_campaigns_preview
  on public.salon_campaigns(preview_id);

alter table public.salon_campaigns enable row level security;
revoke all on table public.salon_campaigns from anon, authenticated;
grant select, insert, update, delete on table public.salon_campaigns to service_role;

-- Public bucket: only server-side service-role uploads are used by the app.
-- Public read is needed so the generated PNG can be downloaded and attached manually in WhatsApp.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('salon-ads', 'salon-ads', true, 5242880, array['image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.salon_campaigns is
  'One reviewable campaign per lead: customized website preview, advertisement PNG, and WhatsApp message.';
