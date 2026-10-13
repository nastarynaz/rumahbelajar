-- Day 1 uses a new immutable instrument. Existing sessions retain their v1 snapshot.
alter table public.participants drop constraint if exists participants_start_level_check;
alter table public.participants add constraint participants_start_level_check check (start_level in ('A','B','C','D1','D2','E','F','G','H','I'));
alter table public.assessment_sessions drop constraint if exists assessment_sessions_start_level_check;
alter table public.assessment_sessions add constraint assessment_sessions_start_level_check check (start_level in ('A','B','C','D1','D2','E','F','G','H','I'));
alter table public.assessment_sessions drop constraint if exists assessment_sessions_highest_passed_level_check;
alter table public.assessment_sessions add constraint assessment_sessions_highest_passed_level_check check (highest_passed_level in ('A','B','C','D1','D2','E','F','G','H','I'));
alter table public.assessment_responses drop constraint if exists assessment_responses_status_check;
alter table public.assessment_responses add constraint assessment_responses_status_check check (status in ('correct','assisted','incorrect','skipped','not_asked'));
alter table public.assessment_observations add column if not exists day1_metrics jsonb not null default '{}'::jsonb;

create table if not exists public.assessment_answer_events (
 id bigint generated always as identity primary key,
 organization_id uuid not null references public.organizations(id),
 session_id uuid not null,
 question_code text not null,
 status text not null check (status in ('correct','assisted','incorrect','skipped')),
 response text check (length(response) <= 300),
 help text check (length(help) <= 120),
 created_at timestamptz not null default now(),
 foreign key (session_id,organization_id) references public.assessment_sessions(id,organization_id) on delete cascade
);
create index if not exists answer_events_session_question_idx on public.assessment_answer_events(session_id,question_code,created_at);
alter table public.assessment_answer_events enable row level security;
grant select on public.assessment_answer_events to authenticated;
drop policy if exists answer_events_read on public.assessment_answer_events;
create policy answer_events_read on public.assessment_answer_events for select to authenticated
 using (exists(select 1 from public.assessment_sessions s where s.id=session_id and public.can_access_participant(s.organization_id,s.participant_id)));

insert into public.instruments(code,version,title,published)
values ('tangga-angka','tangga-angka-v2','Tangga Angka · pertemuan 2',true)
on conflict (code,version) do nothing;

with source(code,title,sort_order) as (values
 ('A','Membilang benda',1),('B','Angka 1–9',2),('C','Bilangan 10–99',3),
 ('D1','Tambah dan kurang dasar',4),('D2','Menyimpan dan meminjam',5),
 ('E','Perkalian',6),('F','Pembagian dan cerita',7),
 ('G','Ratusan dan nilai tempat',8),('H','Kali dan bagi lanjutan',9),
 ('I','Cerita dua langkah dan pecahan',10)
)
insert into public.instrument_levels(instrument_id,code,title,sort_order,threshold)
select i.id,s.code,s.title,s.sort_order,2 from source s
cross join public.instruments i where i.version='tangga-angka-v2'
on conflict (instrument_id,code) do nothing;

with source(level_code,code,sort_order,prompt,answer,kind,visual) as (values
 ('A','a2-1',1,'Ambilkan 2 kancing.','2','activity',null::jsonb),
 ('A','a2-2',2,'Ada berapa bintang?','3','count','{"symbol":"★","count":3}'::jsonb),
 ('A','a2-3',3,'Ambilkan 5 kancing.','5','activity',null),
 ('B','b2-1',1,'Tunjuk angka 1.','1','recognize','{"symbol":"1","count":1}'::jsonb),
 ('B','b2-2',2,'Pasangkan angka 2 dengan dua titik.','2','activity',null),
 ('B','b2-3',3,'Pasangkan angka 3 dengan tiga titik.','3','activity',null),
 ('C','c2-1',1,'Mana lebih besar, 47 atau 74?','74','compare',null),
 ('C','c2-2',2,'Angka sesudah 39 berapa?','40','recognize',null),
 ('C','c2-3',3,'3 puluhan dan 5 satuan jadi berapa?','35','activity',null),
 ('D1','d12-1',1,'23 + 14 = ?','37','arithmetic',null),
 ('D1','d12-2',2,'46 − 15 = ?','31','arithmetic',null),
 ('D1','d12-3',3,'48 − 13 = ?','35','arithmetic',null),
 ('D2','d22-1',1,'42 − 17 = ?','25','arithmetic',null),
 ('D2','d22-2',2,'35 − 18 = ?','17','arithmetic',null),
 ('D2','d22-3',3,'38 + 45 = ?','83','arithmetic',null),
 ('E','e2-1',1,'3 × 4 = ?','12','arithmetic','{"symbol":"●","count":4,"groups":3}'::jsonb),
 ('E','e2-2',2,'5 × 3 = ?','15','arithmetic',null),
 ('E','e2-3',3,'2 × 6 = ?','12','arithmetic',null),
 ('F','f2-1',1,'12 ÷ 3 = ?','4','arithmetic',null),
 ('F','f2-2',2,'15 ÷ 5 = ?','3','arithmetic',null),
 ('F','f2-3',3,'20 kue dibagi rata ke 4 piring. Tiap piring berapa?','5','story',null),
 ('G','g-1',1,'Pada 345, angka ratusannya berapa?','3','recognize',null),
 ('G','g-2',2,'125 + 248 = ?','373','arithmetic',null),
 ('G','g-3',3,'300 − 145 = ?','155','arithmetic',null),
 ('H','h-1',1,'14 × 3 = ?','42','arithmetic',null),
 ('H','h-2',2,'23 × 4 = ?','92','arithmetic',null),
 ('H','h-3',3,'17 ÷ 5 = ? Sebutkan sisanya.','3 sisa 2','arithmetic',null),
 ('I','i-1',1,'3 buku masing-masing 4 ribu. Bayar 20 ribu. Kembalinya?','8 ribu','story',null),
 ('I','i-2',2,'Setengah dari 12 berapa?','6','story',null),
 ('I','i-3',3,'Seperempat dari 20 berapa?','5','story',null)
)
insert into public.questions(instrument_id,level_id,code,sort_order,prompt,answer,role,kind,visual)
select i.id,l.id,s.code,s.sort_order,s.prompt,s.answer,'core',s.kind,s.visual
from source s join public.instruments i on i.version='tangga-angka-v2'
join public.instrument_levels l on l.instrument_id=i.id and l.code=s.level_code
on conflict (instrument_id,code) do nothing;

create or replace function public.save_assessment_response(target_session uuid, expected_revision integer, answer_question_code text, answer_status text, answer_response text default null, answer_help text default null, answer_note text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare s public.assessment_sessions; valid_question boolean; next_revision integer;
begin
 select * into s from public.assessment_sessions where id=target_session for update;
 if not found or not public.can_access_participant(s.organization_id,s.participant_id) then raise exception 'Sesi tidak tersedia'; end if;
 if s.status not in ('draft','in_progress') then raise exception 'Sesi tidak bisa diubah'; end if;
 if s.revision<>expected_revision then raise exception 'Sesi berubah di perangkat lain. Muat ulang halaman'; end if;
 if answer_status not in ('correct','assisted','incorrect','skipped','not_asked') or length(coalesce(answer_response,''))>300 or length(coalesce(answer_help,''))>120 or length(coalesce(answer_note,''))>1000 then raise exception 'Jawaban tidak valid'; end if;
 select exists(select 1 from jsonb_array_elements(s.instrument_snapshot->'levels') lvl cross join jsonb_array_elements(lvl->'questions') q where q->>'id'=answer_question_code) into valid_question;
 if not valid_question then raise exception 'Soal tidak ada dalam sesi'; end if;
 insert into public.assessment_responses(organization_id,session_id,question_code,status,response,help,note)
 values(s.organization_id,s.id,answer_question_code,answer_status,answer_response,answer_help,answer_note)
 on conflict(session_id,question_code) do update set status=excluded.status,response=excluded.response,help=excluded.help,note=excluded.note;
 if answer_status in ('correct','assisted','incorrect','skipped') then
  insert into public.assessment_answer_events(organization_id,session_id,question_code,status,response,help)
  values(s.organization_id,s.id,answer_question_code,answer_status,answer_response,answer_help);
 end if;
 update public.assessment_sessions set status='in_progress',started_at=coalesce(started_at,now()),revision=revision+1 where id=s.id returning revision into next_revision;
 insert into public.audit_logs(organization_id,actor_id,entity_type,entity_id,action,detail) values(s.organization_id,auth.uid(),'assessment_session',s.id,'save_response',jsonb_build_object('question_code',answer_question_code));
 return next_revision;
end $$;

create table if not exists public.mission_attempts (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 participant_id uuid not null,
 created_by uuid not null references auth.users(id),
 submission_key uuid not null,
 level text not null check (level in ('A','B','C','D1','D2','E','F','G','H','I')),
 answers jsonb not null check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) = 5),
 independent_correct integer not null check (independent_correct between 0 and 5),
 assisted_count integer not null check (assisted_count between 0 and 5),
 created_at timestamptz not null default now(),
 unique (organization_id,submission_key),
 foreign key (participant_id,organization_id) references public.participants(id,organization_id)
);
create index if not exists mission_attempts_participant_date_idx on public.mission_attempts(participant_id,created_at desc);
alter table public.mission_attempts enable row level security;
grant select,insert on public.mission_attempts to authenticated;
drop policy if exists mission_attempts_read on public.mission_attempts;
create policy mission_attempts_read on public.mission_attempts for select to authenticated
 using (public.can_access_participant(organization_id,participant_id));
drop policy if exists mission_attempts_insert on public.mission_attempts;
create policy mission_attempts_insert on public.mission_attempts for insert to authenticated
 with check (created_by=auth.uid() and public.can_access_participant(organization_id,participant_id));

create or replace function public.create_assessment(target_participant uuid, session_type text, assessment_date date, initial_level text, request_key uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare person public.participants; instrument public.instruments; snap jsonb; new_id uuid; created boolean := false;
begin
 select * into person from public.participants where id=target_participant and archived_at is null;
 if not found or not public.can_access_participant(person.organization_id,person.id) then raise exception 'Peserta tidak tersedia'; end if;
 if session_type not in ('baseline','posttest','reassessment') or initial_level not in ('A','B','C','D1','D2','E','F','G','H','I') then raise exception 'Data sesi tidak valid'; end if;
 select * into instrument from public.instruments where version='tangga-angka-v2' and published=true and (organization_id is null or organization_id=person.organization_id) order by organization_id nulls last limit 1;
 if not found then raise exception 'Instrumen belum tersedia'; end if;
 select jsonb_build_object('version',instrument.version,'levels',coalesce(jsonb_agg(jsonb_build_object('code',l.code,'title',l.title,'threshold',l.threshold,'questions',
   (select coalesce(jsonb_agg(jsonb_build_object('id',q.code,'level',l.code,'prompt',q.prompt,'answer',q.answer,'role',q.role,'kind',q.kind,'visual',q.visual,'help',q.help) order by q.sort_order),'[]'::jsonb) from public.questions q where q.level_id=l.id)) order by l.sort_order),'[]'::jsonb)) into snap
 from public.instrument_levels l where l.instrument_id=instrument.id;
 if jsonb_array_length(snap->'levels')<>10 then raise exception 'Instrumen belum lengkap'; end if;
 insert into public.assessment_sessions(organization_id,participant_id,assessor_id,instrument_id,instrument_snapshot,idempotency_key,type,assessed_on,start_level,status)
 values(person.organization_id,person.id,auth.uid(),instrument.id,snap,request_key,session_type,assessment_date,initial_level,'draft')
 on conflict(organization_id,idempotency_key) do nothing returning id into new_id;
 created := new_id is not null;
 if new_id is null then select id into new_id from public.assessment_sessions where organization_id=person.organization_id and idempotency_key=request_key and participant_id=person.id and assessor_id=auth.uid(); end if;
 if new_id is null then raise exception 'Kunci permintaan sudah digunakan'; end if;
 if created then insert into public.audit_logs(organization_id,actor_id,entity_type,entity_id,action) values(person.organization_id,auth.uid(),'assessment_session',new_id,'create'); end if;
 return new_id;
end $$;

create or replace function public.finalize_assessment(target_session uuid, expected_revision integer, final_stop_reason text, final_override_reason text default null, final_summary_note text default null)
returns public.assessment_sessions language plpgsql security definer set search_path = '' as $$
declare s public.assessment_sessions; lvl jsonb; q jsonb; passed text; correct_count integer; core_count integer; threshold_count integer; rec public.assessment_sessions;
begin
 select * into s from public.assessment_sessions where id=target_session for update;
 if not found or not public.can_access_participant(s.organization_id,s.participant_id) then raise exception 'Sesi tidak tersedia'; end if;
 if s.status='completed' then return s; end if;
 if s.status='void' or s.revision<>expected_revision then raise exception 'Sesi berubah. Muat ulang sebelum menyelesaikan.'; end if;
 if final_stop_reason not in ('level_not_met','child_declined','assessor_decision','all_levels_passed','time_limit') then raise exception 'Alasan berhenti tidak valid'; end if;
 if final_stop_reason='assessor_decision' and length(trim(coalesce(final_override_reason,'')))<5 then raise exception 'Alasan keputusan relawan wajib diisi'; end if;
 for lvl in select value from jsonb_array_elements(s.instrument_snapshot->'levels') loop
  correct_count:=0; core_count:=0; threshold_count:=(lvl->>'threshold')::integer;
  for q in select value from jsonb_array_elements(lvl->'questions') loop
   if q->>'role'='core' then
    core_count:=core_count+1;
    if exists(select 1 from public.assessment_responses r where r.session_id=s.id and r.question_code=q->>'id' and r.status='correct') then correct_count:=correct_count+1; end if;
   end if;
  end loop;
  if core_count>=threshold_count and correct_count>=threshold_count then passed:=lvl->>'code'; end if;
 end loop;
 update public.assessment_sessions set status='completed',highest_passed_level=passed,stop_reason=final_stop_reason,override_reason=final_override_reason,summary_note=left(final_summary_note,2000),completed_at=now(),duration_seconds=greatest(0,extract(epoch from now()-coalesce(started_at,created_at))::integer),revision=revision+1 where id=s.id returning * into rec;
 insert into public.audit_logs(organization_id,actor_id,entity_type,entity_id,action,detail) values(s.organization_id,auth.uid(),'assessment_session',s.id,'finalize',jsonb_build_object('highest_passed_level',passed));
 return rec;
end $$;
