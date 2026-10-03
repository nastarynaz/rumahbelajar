create extension if not exists pgcrypto;

create table if not exists public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 2 and 120), retention_months integer not null default 36 check (retention_months between 1 and 120), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, display_name text not null default 'Relawan', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.organization_members (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), user_id uuid not null references auth.users(id) on delete cascade, role text not null check (role in ('admin','assessor')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,user_id)
);
create table if not exists public.programs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,organization_id)
);
create table if not exists public.participants (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), program_id uuid, display_name text not null check (length(display_name) between 1 and 80), code text, start_level text not null default 'A' check (start_level in ('A','B','C','D1','D2','E','F')), archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,organization_id), foreign key (program_id,organization_id) references public.programs(id,organization_id)
);
create table if not exists public.assessor_assignments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), participant_id uuid not null, assessor_id uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(participant_id,assessor_id), foreign key (participant_id,organization_id) references public.participants(id,organization_id)
);
create table if not exists public.instruments (
 id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id), code text not null, version text not null, title text not null, published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(code,version)
);
create table if not exists public.instrument_levels (
 id uuid primary key default gen_random_uuid(), instrument_id uuid not null references public.instruments(id) on delete cascade, code text not null, title text not null, sort_order integer not null, threshold integer not null check (threshold > 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(instrument_id,code), unique(id,instrument_id)
);
create table if not exists public.questions (
 id uuid primary key default gen_random_uuid(), instrument_id uuid not null references public.instruments(id) on delete cascade, level_id uuid not null, code text not null, sort_order integer not null, prompt text not null, answer text not null, role text not null check (role in ('core','practice','verification','closing')), kind text not null check (kind in ('count','recognize','arithmetic','story','compare','activity')), visual jsonb, help text, operation jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(instrument_id,code), foreign key (level_id,instrument_id) references public.instrument_levels(id,instrument_id)
);
create table if not exists public.assessment_sessions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), participant_id uuid not null, assessor_id uuid not null references auth.users(id), instrument_id uuid not null references public.instruments(id), instrument_snapshot jsonb not null, idempotency_key uuid not null, type text not null check (type in ('baseline','posttest','reassessment')), status text not null default 'draft' check (status in ('draft','in_progress','completed','void')), assessed_on date not null default current_date, start_level text not null check (start_level in ('A','B','C','D1','D2','E','F')), highest_passed_level text check (highest_passed_level in ('A','B','C','D1','D2','E','F')), stop_reason text check (stop_reason in ('level_not_met','child_declined','assessor_decision','all_levels_passed','time_limit')), override_reason text, summary_note text, started_at timestamptz, completed_at timestamptz, duration_seconds integer check (duration_seconds >= 0), revision integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,idempotency_key), unique(id,organization_id), foreign key (participant_id,organization_id) references public.participants(id,organization_id)
);
create table if not exists public.assessment_responses (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), session_id uuid not null, question_code text not null, status text not null check (status in ('correct','incorrect','skipped','not_asked')), response text check (length(response) <= 300), help text check (length(help) <= 120), note text check (length(note) <= 1000), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(session_id,question_code), foreign key (session_id,organization_id) references public.assessment_sessions(id,organization_id) on delete cascade
);
create table if not exists public.assessment_observations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), session_id uuid not null unique, counting_method text, explanation text, difficulty_response text, tools text[] not null default '{}', motivator text, note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), foreign key (session_id,organization_id) references public.assessment_sessions(id,organization_id) on delete cascade
);
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), actor_id uuid references auth.users(id), entity_type text not null, entity_id uuid not null, action text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create index if not exists participants_org_program_idx on public.participants(organization_id,program_id) where archived_at is null;
create index if not exists assignments_assessor_idx on public.assessor_assignments(assessor_id,participant_id);
create index if not exists sessions_participant_date_idx on public.assessment_sessions(participant_id,assessed_on desc);
create index if not exists sessions_assessor_status_idx on public.assessment_sessions(assessor_id,status);
create index if not exists responses_session_idx on public.assessment_responses(session_id);
create index if not exists audit_org_date_idx on public.audit_logs(organization_id,created_at desc);

create or replace function public.is_org_admin(target_org uuid) returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.organization_members m where m.organization_id = target_org and m.user_id = (select auth.uid()) and m.role = 'admin') $$;
create or replace function public.is_org_member(target_org uuid) returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.organization_members m where m.organization_id = target_org and m.user_id = (select auth.uid())) $$;
create or replace function public.can_access_participant(target_org uuid, target_participant uuid) returns boolean language sql stable security definer set search_path = '' as $$ select public.is_org_admin(target_org) or exists(select 1 from public.assessor_assignments a join public.organization_members m on m.organization_id = a.organization_id and m.user_id = a.assessor_id where a.organization_id = target_org and a.participant_id = target_participant and a.assessor_id = (select auth.uid()) and m.role = 'assessor') $$;
revoke all on function public.is_org_admin(uuid), public.is_org_member(uuid), public.can_access_participant(uuid,uuid) from public;
grant execute on function public.is_org_admin(uuid), public.is_org_member(uuid), public.can_access_participant(uuid,uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.programs enable row level security;
alter table public.participants enable row level security;
alter table public.assessor_assignments enable row level security;
alter table public.instruments enable row level security;
alter table public.instrument_levels enable row level security;
alter table public.questions enable row level security;
alter table public.assessment_sessions enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.assessment_observations enable row level security;
alter table public.audit_logs enable row level security;
revoke all on public.organizations, public.profiles, public.organization_members,
 public.programs, public.participants, public.assessor_assignments,
 public.instruments, public.instrument_levels, public.questions,
 public.assessment_sessions, public.assessment_responses,
 public.assessment_observations, public.audit_logs from public, anon, authenticated;
grant all on public.organizations, public.profiles, public.organization_members,
 public.programs, public.participants, public.assessor_assignments,
 public.instruments, public.instrument_levels, public.questions,
 public.assessment_sessions, public.assessment_responses,
 public.assessment_observations, public.audit_logs to service_role;
grant select on public.organizations,public.profiles,public.organization_members,public.programs,public.participants,public.assessor_assignments,public.instruments,public.instrument_levels,public.questions,public.assessment_sessions,public.assessment_responses,public.assessment_observations,public.audit_logs to authenticated;
grant update(retention_months) on public.organizations to authenticated;
grant insert,update on public.participants,public.assessor_assignments,public.programs,public.organization_members,public.assessment_observations to authenticated;

drop policy if exists organizations_read on public.organizations;
create policy organizations_read on public.organizations for select to authenticated using (public.is_org_member(id));
drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()) or exists(select 1 from public.organization_members m where m.user_id = profiles.id and public.is_org_admin(m.organization_id)));
drop policy if exists members_read on public.organization_members;
create policy members_read on public.organization_members for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists members_insert on public.organization_members;
create policy members_insert on public.organization_members for insert to authenticated with check (public.is_org_admin(organization_id));
drop policy if exists members_update on public.organization_members;
create policy members_update on public.organization_members for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
drop policy if exists programs_read on public.programs;
create policy programs_read on public.programs for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists programs_insert on public.programs;
create policy programs_insert on public.programs for insert to authenticated with check (public.is_org_admin(organization_id));
drop policy if exists programs_update on public.programs;
create policy programs_update on public.programs for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
drop policy if exists participants_read on public.participants;
create policy participants_read on public.participants for select to authenticated using (public.can_access_participant(organization_id,id));
drop policy if exists participants_insert on public.participants;
create policy participants_insert on public.participants for insert to authenticated with check (public.is_org_admin(organization_id));
drop policy if exists participants_update on public.participants;
create policy participants_update on public.participants for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
drop policy if exists assignments_read on public.assessor_assignments;
create policy assignments_read on public.assessor_assignments for select to authenticated using (public.is_org_admin(organization_id) or assessor_id = (select auth.uid()));
drop policy if exists assignments_insert on public.assessor_assignments;
create policy assignments_insert on public.assessor_assignments for insert to authenticated with check (public.is_org_admin(organization_id));
drop policy if exists assignments_update on public.assessor_assignments;
create policy assignments_update on public.assessor_assignments for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
drop policy if exists instruments_read on public.instruments;
create policy instruments_read on public.instruments for select to authenticated using (published and (organization_id is null or public.is_org_member(organization_id)));
drop policy if exists levels_read on public.instrument_levels;
create policy levels_read on public.instrument_levels for select to authenticated using (exists(select 1 from public.instruments i where i.id = instrument_id and i.published and (i.organization_id is null or public.is_org_member(i.organization_id))));
drop policy if exists questions_read on public.questions;
create policy questions_read on public.questions for select to authenticated using (exists(select 1 from public.instruments i where i.id = instrument_id and i.published and (i.organization_id is null or public.is_org_member(i.organization_id))));
drop policy if exists sessions_read on public.assessment_sessions;
create policy sessions_read on public.assessment_sessions for select to authenticated using (public.can_access_participant(organization_id,participant_id));
drop policy if exists sessions_insert on public.assessment_sessions;
create policy sessions_insert on public.assessment_sessions for insert to authenticated with check (public.can_access_participant(organization_id,participant_id) and (assessor_id = (select auth.uid()) or public.is_org_admin(organization_id)) and status = 'draft');
drop policy if exists sessions_update on public.assessment_sessions;
create policy sessions_update on public.assessment_sessions for update to authenticated using (public.can_access_participant(organization_id,participant_id) and status <> 'completed') with check (public.can_access_participant(organization_id,participant_id) and status <> 'completed');
drop policy if exists responses_read on public.assessment_responses;
create policy responses_read on public.assessment_responses for select to authenticated using (exists(select 1 from public.assessment_sessions s where s.id = session_id and s.organization_id = organization_id and public.can_access_participant(s.organization_id,s.participant_id)));
drop policy if exists responses_insert on public.assessment_responses;
create policy responses_insert on public.assessment_responses for insert to authenticated with check (exists(select 1 from public.assessment_sessions s where s.id = session_id and s.organization_id = organization_id and s.status <> 'completed' and public.can_access_participant(s.organization_id,s.participant_id)));
drop policy if exists responses_update on public.assessment_responses;
create policy responses_update on public.assessment_responses for update to authenticated using (exists(select 1 from public.assessment_sessions s where s.id = session_id and s.status <> 'completed' and public.can_access_participant(s.organization_id,s.participant_id))) with check (exists(select 1 from public.assessment_sessions s where s.id = session_id and s.status <> 'completed' and public.can_access_participant(s.organization_id,s.participant_id)));
drop policy if exists observations_read on public.assessment_observations;
create policy observations_read on public.assessment_observations for select to authenticated using (exists(select 1 from public.assessment_sessions s where s.id = session_id and public.can_access_participant(s.organization_id,s.participant_id)));
drop policy if exists observations_insert on public.assessment_observations;
create policy observations_insert on public.assessment_observations for insert to authenticated with check (exists(select 1 from public.assessment_sessions s where s.id = session_id and s.status <> 'completed' and public.can_access_participant(s.organization_id,s.participant_id)));
drop policy if exists observations_update on public.assessment_observations;
create policy observations_update on public.assessment_observations for update to authenticated using (exists(select 1 from public.assessment_sessions s where s.id = session_id and s.status <> 'completed' and public.can_access_participant(s.organization_id,s.participant_id))) with check (exists(select 1 from public.assessment_sessions s where s.id = session_id and s.status <> 'completed' and public.can_access_participant(s.organization_id,s.participant_id)));
drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select to authenticated using (public.is_org_admin(organization_id));

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
do $$ declare table_name text; begin foreach table_name in array array['organizations','profiles','organization_members','programs','participants','assessor_assignments','instruments','instrument_levels','questions','assessment_sessions','assessment_responses','assessment_observations'] loop execute format('drop trigger if exists touch_%I on public.%I',table_name,table_name); execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()',table_name,table_name); end loop; end $$;

create or replace function public.create_profile_for_auth_user() returns trigger language plpgsql security definer set search_path = '' as $$ begin insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),'Relawan')) on conflict(id) do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_auth_user();
insert into public.profiles(id) select id from auth.users on conflict(id) do nothing;
do $$ begin if not exists (select 1 from pg_constraint where conname='organization_members_profile_fk') then alter table public.organization_members add constraint organization_members_profile_fk foreign key(user_id) references public.profiles(id); end if; end $$;
