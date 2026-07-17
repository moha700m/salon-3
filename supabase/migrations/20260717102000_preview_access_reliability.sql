-- Make token-hash lookup deterministic for private previews.
-- Additive and non-destructive.
create unique index if not exists idx_previews_access_token_hash_unique
  on public.previews(access_token_hash)
  where access_token_hash is not null;
