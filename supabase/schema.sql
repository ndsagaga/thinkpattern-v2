-- Likes and comments on stories and perspectives.
-- Run once in the Supabase SQL editor.

create table if not exists public.likes (
  target_type text not null check (target_type in ('story', 'perspective')),
  target_id   text not null,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (target_type, target_id, user_id)
);

create table if not exists public.comments (
  id          bigint generated always as identity primary key,
  target_type text not null check (target_type in ('story', 'perspective')),
  target_id   text not null,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 60),
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);

create index if not exists comments_target_idx on public.comments (target_type, target_id, created_at);

alter table public.likes enable row level security;
alter table public.comments enable row level security;

create policy "likes are public" on public.likes for select using (true);
create policy "like as yourself" on public.likes for insert to authenticated with check (user_id = auth.uid());
create policy "unlike your own" on public.likes for delete to authenticated using (user_id = auth.uid());

create policy "comments are public" on public.comments for select using (true);
create policy "comment as yourself" on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "delete your own comment" on public.comments for delete to authenticated using (user_id = auth.uid());
