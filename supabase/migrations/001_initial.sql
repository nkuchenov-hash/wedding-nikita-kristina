-- Wedding application foundation — PRIVATE BY DEFAULT.
-- Run only after creating a Supabase project. No guest or admin data is seeded here.
create extension if not exists pgcrypto;

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_wedding_admin()
returns boolean language sql security definer stable set search_path = '' as $$
  select exists(select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_wedding_admin() from public;
grant execute on function public.is_wedding_admin() to authenticated;

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  slug text unique,
  city text,
  relationship text,
  bio text,
  profile_visible_to_guests boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null unique references public.guests(id) on delete cascade,
  token_hash text unique,
  invited_companions integer not null default 0 check(invited_companions >= 0),
  rsvp_status text not null default 'pending' check(rsvp_status in ('pending','yes','no','maybe')),
  rsvp_companions integer check(rsvp_companions >= 0),
  notes_private text,
  dietary_private text,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.photo_submissions (
  id uuid primary key default gen_random_uuid(),
  uploaded_for_guest uuid references public.guests(id) on delete set null,
  storage_key text not null unique,
  caption text,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  constraint storage_key_length check(char_length(storage_key) <= 1024)
);

create table public.program_items (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz,
  title text not null,
  location text,
  details text,
  visibility text not null default 'admin' check(visibility in ('admin','guests')),
  is_confirmed boolean not null default false,
  sort_order integer not null default 0
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  website text,
  city text,
  service_area text,
  contacts_private text,
  notes_private text,
  status text not null default 'research' check(status in ('research','contacted','quoted','shortlisted','selected','rejected')),
  created_at timestamptz not null default now()
);

create table public.vendor_prices (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  format text,
  guest_count integer check(guest_count > 0),
  total_price_rub numeric(14,2) check(total_price_rub >= 0),
  price_per_person_rub numeric(14,2) check(price_per_person_rub >= 0),
  includes text,
  excludes text,
  source_url text,
  source_kind text not null default 'unverified' check(source_kind in ('published','written_quote','unverified')),
  verified_at date,
  quote_valid_until date,
  notes_private text
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  planned_rub numeric(14,2),
  actual_rub numeric(14,2),
  paid_rub numeric(14,2) default 0,
  vendor_id uuid references public.vendors(id) on delete set null,
  notes_private text,
  due_on date
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  status text not null default 'todo' check(status in ('todo','doing','done')),
  due_on date,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  vendor_id uuid references public.vendors(id) on delete set null,
  storage_key text not null,
  category text,
  uploaded_at timestamptz not null default now()
);

-- All application tables are readable/writable only by approved organizers.
-- Guest access must be implemented via a server-verified, limited API (Edge Functions),
-- NOT by disclosing service role keys, invitation tokens or personal guest records.
do $$
declare t text;
begin
  foreach t in array array['admins','guests','invitations','photo_submissions','program_items','vendors','vendor_prices','budget_items','tasks','documents'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy %I on public.%I for all to authenticated using ((select public.is_wedding_admin())) with check ((select public.is_wedding_admin()))', 'admin_only_'||t,t);
  end loop;
end $$;

-- Private object storage. Secure upload/download needs authenticated admin access
-- and guest Edge Functions validating invitation permissions / quotas.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('wedding-private','wedding-private',false,20971520,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

create policy "wedding objects: organizers read" on storage.objects
  for select to authenticated using(bucket_id='wedding-private' and (select public.is_wedding_admin()));
create policy "wedding objects: organizers upload" on storage.objects
  for insert to authenticated with check(bucket_id='wedding-private' and (select public.is_wedding_admin()));
create policy "wedding objects: organizers update" on storage.objects
  for update to authenticated using(bucket_id='wedding-private' and (select public.is_wedding_admin()))
  with check(bucket_id='wedding-private' and (select public.is_wedding_admin()));
create policy "wedding objects: organizers delete" on storage.objects
  for delete to authenticated using(bucket_id='wedding-private' and (select public.is_wedding_admin()));