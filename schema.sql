-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Chats Table
create table if not exists public.chats (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages Table
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Analytics Events Table
create table if not exists public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text not null,
  event_type text not null,
  event_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_chats_user_id on public.chats(user_id);
create index if not exists idx_messages_chat_id on public.messages(chat_id);
create index if not exists idx_analytics_user_id on public.analytics_events(user_id);
create index if not exists idx_analytics_event_type on public.analytics_events(event_type);

-- Row Level Security (RLS) Policies
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.analytics_events enable row level security;

-- Chats policies
create policy "Users can perform all actions on their own chats."
  on public.chats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Messages policies
create policy "Users can perform all actions on messages of their own chats."
  on public.messages for all
  using (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id
      and chats.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id
      and chats.user_id = auth.uid()
    )
  );

-- Analytics policies
create policy "Users can view their own analytics events and insert new ones."
  on public.analytics_events for all
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

-- Auto-update updated_at for chats
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger trigger_update_chats_updated_at
before update on public.chats
for each row
execute function update_updated_at_column();

-- User Sessions Table for persistent session tracking
create table if not exists public.user_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null unique,
  started_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  duration_seconds integer not null default 0
);

-- Row Level Security for User Sessions
alter table public.user_sessions enable row level security;

create policy "Users can perform all actions on their own sessions."
  on public.user_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
