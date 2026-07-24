-- Samen v0.3 — draai dit in Supabase: SQL Editor -> New query -> Run.
-- Voegt archivering, verlopen-detectie, tijdsregistratie, herhaling en Google-koppeling toe.

-- ── taken: archief, tijd, herhaling, google ──────────────────────────────
alter table tasks add column if not exists archived boolean not null default false;
alter table tasks add column if not exists estimate_minutes int;
alter table tasks add column if not exists spent_minutes int;
alter table tasks add column if not exists time_pending boolean not null default false;

-- herhaling: interval + eenheid; series_id koppelt alle instanties van een reeks
alter table tasks add column if not exists recur_interval int;
alter table tasks add column if not exists recur_unit text check (recur_unit in ('day','week','month','year'));
alter table tasks add column if not exists series_id uuid;

-- google-koppeling
alter table tasks add column if not exists google_task_id text;
alter table tasks add column if not exists google_synced_at timestamptz;

-- gmail-import: voorkomt dubbele taken van dezelfde mail
alter table tasks add column if not exists gmail_message_id text;
create unique index if not exists tasks_gmail_msg_uniq
  on tasks (household_id, gmail_message_id) where gmail_message_id is not null;

create index if not exists tasks_archived_idx on tasks (household_id, archived);

-- ── google-credentials per lid ───────────────────────────────────────────
create table if not exists google_credentials (
  member_id     uuid primary key references household_members(id) on delete cascade,
  household_id  uuid not null references households(id) on delete cascade,
  refresh_token text not null,
  tasklist_id   text,
  gmail_enabled boolean not null default false,
  connected_at  timestamptz not null default now()
);

alter table google_credentials enable row level security;

-- Lid mag zien of er een koppeling is, en 'm zelf zetten/verwijderen.
-- De refresh_token zelf wordt alleen server-side (Edge Function) gelezen.
drop policy if exists gc_all on google_credentials;
create policy gc_all on google_credentials for all
  using (household_id in (select my_household_ids()))
  with check (household_id in (select my_household_ids()));

-- ── automatisch archiveren: max 10 zichtbare 'klaar'-taken ───────────────
create or replace function trim_done_tasks(p_household uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update tasks set archived = true
  where id in (
    select id from tasks
    where household_id = p_household and stage = 'done' and archived = false
    order by coalesce(completed_at, created_at) desc
    offset 10
  );
end; $$;

alter publication supabase_realtime add table google_credentials;
