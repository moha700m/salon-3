-- Add cryptographically unguessable short-share lookup without changing existing links.
-- The plaintext share code is derived server-side and never stored in the database.

alter table public.previews
  add column if not exists public_share_code_hash text;

create unique index if not exists idx_previews_public_share_code_hash_unique
  on public.previews(public_share_code_hash)
  where public_share_code_hash is not null;

comment on column public.previews.public_share_code_hash is
  'SHA-256 hash of the non-sequential public preview share code. Plaintext is not stored.';
