create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  username text unique not null,
  full_name text not null,
  avatar_url text,
  headline text,
  future_plan text,
  bio text,
  profile_tag text,
  is_admin boolean not null default false,
  banned_until timestamptz,
  ban_reason text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists profile_tag text;
alter table public.profiles add column if not exists banned_until timestamptz;
alter table public.profiles add column if not exists ban_reason text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    username,
    full_name,
    avatar_url,
    headline,
    future_plan,
    bio
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'headline',
    new.raw_user_meta_data->>'future_plan',
    new.raw_user_meta_data->>'bio'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    username = coalesce(nullif(excluded.username, ''), profiles.username),
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    headline = coalesce(excluded.headline, profiles.headline),
    future_plan = coalesce(excluded.future_plan, profiles.future_plan),
    bio = coalesce(excluded.bio, profiles.bio);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  category text not null,
  title text not null,
  message text not null,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.album_items (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null,
  image_url text not null,
  storage_path text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.album_items add column if not exists storage_path text;

create table if not exists public.plans (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  details text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.fundraisers (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null,
  goal_amount numeric not null default 0,
  current_amount numeric not null default 0,
  ends_on date,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null,
  starts_at timestamptz not null,
  location text not null,
  capacity integer,
  google_form_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.event_registrations (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  unique (event_id, profile_id)
);

create table if not exists public.forum_posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  title text not null,
  body text not null,
  votes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_replies (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.forum_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.forum_posts(id) on delete cascade,
  reported_by uuid references public.profiles(id) on delete set null,
  title text not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('album-photos', 'album-photos', true)
on conflict (id) do update set public = true;

alter table public.profiles enable row level security;
alter table public.announcements enable row level security;
alter table public.album_items enable row level security;
alter table public.plans enable row level security;
alter table public.fundraisers enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_replies enable row level security;
alter table public.reports enable row level security;

create or replace function public.user_is_active(user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = user_id
      and (profiles.banned_until is null or profiles.banned_until <= now())
  );
$$;

drop policy if exists "profiles are viewable by everyone" on public.profiles;
create policy "profiles are viewable by everyone"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "users can delete own plans" on public.plans;
create policy "users can delete own plans"
on public.plans for delete
to authenticated
using (auth.uid() = author_id and public.user_is_active(auth.uid()));

drop policy if exists "announcements are viewable by everyone" on public.announcements;
create policy "announcements are viewable by everyone"
on public.announcements for select
to anon, authenticated
using (true);

drop policy if exists "admins manage announcements" on public.announcements;
create policy "admins manage announcements"
on public.announcements for all
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
))
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

drop policy if exists "album is viewable by everyone" on public.album_items;
create policy "album is viewable by everyone"
on public.album_items for select
to anon, authenticated
using (true);

drop policy if exists "users can add album photos" on public.album_items;
create policy "users can add album photos"
on public.album_items for insert
to authenticated
with check (auth.uid() = created_by and public.user_is_active(auth.uid()));

drop policy if exists "admins can delete album photos" on public.album_items;
create policy "admins can delete album photos"
on public.album_items for delete
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

drop policy if exists "plans are viewable by everyone" on public.plans;
create policy "plans are viewable by everyone"
on public.plans for select
to anon, authenticated
using (true);

drop policy if exists "users can insert own plans" on public.plans;
create policy "users can insert own plans"
on public.plans for insert
to authenticated
with check (auth.uid() = author_id and public.user_is_active(auth.uid()));

drop policy if exists "users can update own plans" on public.plans;
create policy "users can update own plans"
on public.plans for update
to authenticated
using (auth.uid() = author_id and public.user_is_active(auth.uid()))
with check (auth.uid() = author_id and public.user_is_active(auth.uid()));

drop policy if exists "admins can delete plans" on public.plans;
create policy "admins can delete plans"
on public.plans for delete
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

drop policy if exists "fundraisers are viewable by everyone" on public.fundraisers;
create policy "fundraisers are viewable by everyone"
on public.fundraisers for select
to anon, authenticated
using (true);

drop policy if exists "admins manage fundraisers" on public.fundraisers;
create policy "admins manage fundraisers"
on public.fundraisers for all
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
))
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

drop policy if exists "events are viewable by everyone" on public.events;
create policy "events are viewable by everyone"
on public.events for select
to anon, authenticated
using (true);

drop policy if exists "admins manage events" on public.events;
create policy "admins manage events"
on public.events for all
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
))
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

drop policy if exists "event registrations viewable by everyone" on public.event_registrations;
create policy "event registrations viewable by everyone"
on public.event_registrations for select
to anon, authenticated
using (true);

drop policy if exists "users can create event registrations" on public.event_registrations;
create policy "users can create event registrations"
on public.event_registrations for insert
to authenticated
with check (profile_id = auth.uid() and public.user_is_active(auth.uid()));

drop policy if exists "forum posts are viewable by everyone" on public.forum_posts;
create policy "forum posts are viewable by everyone"
on public.forum_posts for select
to anon, authenticated
using (true);

drop policy if exists "users can insert own forum posts" on public.forum_posts;
create policy "users can insert own forum posts"
on public.forum_posts for insert
to authenticated
with check (auth.uid() = author_id and public.user_is_active(auth.uid()));

drop policy if exists "authenticated users can update votes" on public.forum_posts;
create policy "authenticated users can update votes"
on public.forum_posts for update
to authenticated
using (public.user_is_active(auth.uid()))
with check (public.user_is_active(auth.uid()));

drop policy if exists "admins can delete forum posts" on public.forum_posts;
create policy "admins can delete forum posts"
on public.forum_posts for delete
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

drop policy if exists "users can delete own forum posts" on public.forum_posts;
create policy "users can delete own forum posts"
on public.forum_posts for delete
to authenticated
using (auth.uid() = author_id and public.user_is_active(auth.uid()));

drop policy if exists "forum replies are viewable by everyone" on public.forum_replies;
create policy "forum replies are viewable by everyone"
on public.forum_replies for select
to anon, authenticated
using (true);

drop policy if exists "users can insert own forum replies" on public.forum_replies;
create policy "users can insert own forum replies"
on public.forum_replies for insert
to authenticated
with check (auth.uid() = author_id and public.user_is_active(auth.uid()));

drop policy if exists "admins can delete forum replies" on public.forum_replies;
create policy "admins can delete forum replies"
on public.forum_replies for delete
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

drop policy if exists "users can delete own forum replies" on public.forum_replies;
create policy "users can delete own forum replies"
on public.forum_replies for delete
to authenticated
using (auth.uid() = author_id and public.user_is_active(auth.uid()));

drop policy if exists "users can create reports" on public.reports;
create policy "users can create reports"
on public.reports for insert
to authenticated
with check ((reported_by is null or reported_by = auth.uid()) and public.user_is_active(auth.uid()));

drop policy if exists "admins can view reports" on public.reports;
create policy "admins can view reports"
on public.reports for select
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

drop policy if exists "admins can update reports" on public.reports;
create policy "admins can update reports"
on public.reports for update
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
))
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.is_admin = true
));

drop policy if exists "avatar images are public" on storage.objects;
create policy "avatar images are public"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'avatars');

drop policy if exists "users can upload own avatar images" on storage.objects;
create policy "users can upload own avatar images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can update own avatar images" on storage.objects;
create policy "users can update own avatar images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can delete own avatar images" on storage.objects;
create policy "users can delete own avatar images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "album images are public" on storage.objects;
create policy "album images are public"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'album-photos');

drop policy if exists "users can upload own album images" on storage.objects;
create policy "users can upload own album images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'album-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can update own album images" on storage.objects;
create policy "users can update own album images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'album-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'album-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can delete own album images" on storage.objects;
create policy "users can delete own album images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'album-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "admins can delete album images" on storage.objects;
create policy "admins can delete album images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'album-photos'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.is_admin = true
  )
);

insert into public.announcements (category, title, message, featured)
select 'Important', 'Welcome to the Class of 2026 portal', 'Sign up, complete your profile, and start posting your plans and updates.', true
where not exists (select 1 from public.announcements);

drop policy if exists "ban appeals can be created by banned users" on public.ban_appeals;
create policy "ban appeals can be created by banned users"
on public.ban_appeals for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "admins can view ban appeals" on public.ban_appeals;
create policy "admins can view ban appeals"
on public.ban_appeals for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.is_admin = true
  )
);

drop policy if exists "admins can update ban appeals" on public.ban_appeals;
create policy "admins can update ban appeals"
on public.ban_appeals for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.is_admin = true
  )
);

alter table public.ban_appeals enable row level security;