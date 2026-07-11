-- ─────────────────────────────────────────────────────────────────────────
-- Samen — database schema (Supabase / Postgres)
-- Plak dit in: Supabase dashboard -> SQL Editor -> New query -> Run.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── tabellen ────────────────────────────────────────────────────────────

create table if not exists households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  color        text not null default '#1F6E6B',
  created_at   timestamptz not null default now(),
  unique (household_id, user_id)
);

create table if not exists domains (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  category     text not null check (category in ('home','out','caregiving','magic','wild')),
  owner_id     uuid references household_members(id) on delete set null,
  cadence      text default 'doorlopend',
  standard     text default '',
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  domain_id    uuid references domains(id) on delete set null,
  title        text not null,
  owner_id     uuid references household_members(id) on delete set null,
  stage        text not null default 'conception'
               check (stage in ('conception','planning','execution','done')),
  origin       text not null default 'manual',
  reason       text default '',
  scheduled_at timestamptz,
  due_at       timestamptz,
  location     text,
  handoff_to   uuid references household_members(id) on delete set null,
  handoff_until timestamptz,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists checklist_items (
  id        uuid primary key default gen_random_uuid(),
  task_id   uuid not null references tasks(id) on delete cascade,
  text      text not null,
  done      boolean not null default false,
  position  int not null default 0
);

create table if not exists task_sources (
  id      uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  type    text not null check (type in ('email','whatsapp','link','file')),
  ref     text not null
);

-- ── helper: huishoudens van de huidige gebruiker (security definer, geen RLS-recursie)

create or replace function my_household_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id from household_members where user_id = auth.uid()
$$;

-- ── RLS aanzetten ───────────────────────────────────────────────────────

alter table households        enable row level security;
alter table household_members enable row level security;
alter table domains           enable row level security;
alter table tasks             enable row level security;
alter table checklist_items   enable row level security;
alter table task_sources      enable row level security;

-- households: lezen wat van jou is; schrijven via RPC's hieronder
create policy hh_select on households for select
  using (id in (select my_household_ids()));

create policy hm_select on household_members for select
  using (household_id in (select my_household_ids()));
create policy hm_update on household_members for update
  using (household_id in (select my_household_ids()));

-- domains / tasks / children: volledige toegang binnen je eigen huishouden
create policy dom_all on domains for all
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy task_all on tasks for all
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

create policy chk_all on checklist_items for all
  using (task_id in (select id from tasks where household_id in (select my_household_ids())))
  with check (task_id in (select id from tasks where household_id in (select my_household_ids())));

create policy src_all on task_sources for all
  using (task_id in (select id from tasks where household_id in (select my_household_ids())))
  with check (task_id in (select id from tasks where household_id in (select my_household_ids())));

-- ── RPC: huishouden aanmaken (huishouden + eerste lid in één keer) ───────

create or replace function create_household(p_name text, p_display_name text, p_color text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hh households;
  v_member household_members;
  v_code text;
begin
  v_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
  insert into households (name, invite_code) values (p_name, v_code) returning * into v_hh;
  insert into household_members (household_id, user_id, display_name, color)
    values (v_hh.id, auth.uid(), p_display_name, p_color) returning * into v_member;
  return json_build_object('household_id', v_hh.id, 'member_id', v_member.id, 'invite_code', v_hh.invite_code);
end;
$$;

-- ── RPC: huishouden joinen via code ─────────────────────────────────────

create or replace function join_household(p_code text, p_display_name text, p_color text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hh households;
  v_member household_members;
begin
  select * into v_hh from households where invite_code = upper(p_code);
  if v_hh.id is null then
    raise exception 'Onbekende uitnodigingscode';
  end if;
  insert into household_members (household_id, user_id, display_name, color)
    values (v_hh.id, auth.uid(), p_display_name, p_color)
    on conflict (household_id, user_id) do update set display_name = excluded.display_name
    returning * into v_member;
  return json_build_object('household_id', v_hh.id, 'member_id', v_member.id, 'invite_code', v_hh.invite_code);
end;
$$;

-- ── realtime aanzetten ──────────────────────────────────────────────────
alter publication supabase_realtime add table domains, tasks, checklist_items, task_sources, household_members;
