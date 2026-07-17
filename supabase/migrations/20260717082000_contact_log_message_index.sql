-- Cover the optional outreach message foreign key used by contact history lookups.
create index if not exists idx_contact_logs_message
  on public.contact_logs(message_id)
  where message_id is not null;
