create table profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,20}$'),
  referral_code text unique not null default substr(md5(random()::text),1,8),
  referred_by uuid references profiles(id),
  slots_unlocked int not null default 5 check (slots_unlocked between 5 and 50),
  founding_scout boolean not null default false,
  default_claim_visibility text not null default 'public' check (default_claim_visibility in ('public','artist','anonymous')),
  default_watch_named boolean not null default false,
  created_at timestamptz not null default now(),
  check (referred_by is distinct from id)
);
create table artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  status text not null default 'pending' check (status in ('pending','live','disputed','delisted')),
  verified_at timestamptz,
  claims_frozen boolean not null default false,
  next_claim_number int not null default 1,
  donation_url text check (donation_url is null or donation_url ~ '^https://'),
  created_at timestamptz not null default now()
);
create table artist_links (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists on delete cascade,
  platform text not null, canonical_key text unique not null, url text not null,
  is_primary boolean not null default false
);
create table artist_submissions (
  artist_id uuid references artists on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (artist_id, user_id)
);
create table claims (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists,
  user_id uuid not null references profiles,
  claim_number int not null,
  claimed_at timestamptz not null default now(),
  dropped_at timestamptz,
  status text not null default 'active' check (status in ('active','historical')),
  base_qualified int not null default 0,
  visibility text not null default 'public' check (visibility in ('public','artist','anonymous')),
  unique (artist_id, claim_number)
);
create unique index one_active_claim on claims(artist_id, user_id) where status='active';
create table watchlist (
  user_id uuid references profiles on delete cascade,
  artist_id uuid references artists on delete cascade,
  named_to_artist boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);
create table referrals (
  referrer uuid not null references profiles,
  referred uuid unique not null references profiles,
  check (referrer <> referred)
);
create table verification_attempts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists, code text not null, url text,
  result text, checked_at timestamptz not null default now()
);
create table top_songs (
  artist_id uuid references artists on delete cascade,
  position int check (position between 1 and 10),
  title text not null, url text not null check (url ~ '^https://'),
  primary key (artist_id, position)
);
create index claims_user_id_idx on claims(user_id);
create index claims_artist_status_idx on claims(artist_id, status);
create index artist_links_artist_id_idx on artist_links(artist_id);
create index profiles_referred_by_idx on profiles(referred_by);
create index referrals_referrer_idx on referrals(referrer);
create index verification_attempts_artist_id_idx on verification_attempts(artist_id);

alter table profiles enable row level security;
alter table artists enable row level security;
alter table artist_links enable row level security;
alter table claims enable row level security;
alter table watchlist enable row level security;
alter table artist_submissions enable row level security;
alter table referrals enable row level security;
alter table verification_attempts enable row level security;
alter table top_songs enable row level security;

create policy "public read live" on artists for select using (status='live');
create policy "public read live artist links" on artist_links for select
  using (exists (select 1 from artists a where a.id = artist_id and a.status = 'live'));
-- claims: no public read; a scout sees only their own rows. Public views come from security-definer functions that mask handles.
create policy "own claims" on claims for select using (user_id = auth.uid());
create policy "own profile" on profiles for select using (auth.uid() = id);
create policy "own watchlist" on watchlist for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "public read live top songs" on top_songs for select
  using (exists (select 1 from artists a where a.id = artist_id and a.status = 'live'));

-- Safe public projection; owned by the migration owner so it bypasses profiles RLS.
create view public_profiles as
  select id, handle, founding_scout, created_at from profiles;
grant select on public_profiles to anon, authenticated;
