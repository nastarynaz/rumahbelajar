-- A separate self-service quiz. Its score is never treated as a Tangga Angka assessor level.
create table if not exists public.public_quizzes (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), slug text not null unique check (length(slug) between 12 and 80), title text not null default 'Posttest Numerasi', version text not null default 'kuis-numerasi-v1', is_open boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,organization_id)
);
create table if not exists public.public_quiz_questions (
 id uuid primary key default gen_random_uuid(), version text not null, code text not null, sort_order integer not null, section text not null, prompt text not null, visual jsonb, options jsonb not null, answer text not null, created_at timestamptz not null default now(), unique(version,code), unique(version,sort_order)
);
create table if not exists public.public_quiz_attempts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), quiz_id uuid not null, participant_id uuid, submission_key uuid not null, full_name text not null check (length(full_name) between 2 and 120), age_years integer not null check (age_years between 4 and 99), answers jsonb not null, result jsonb not null, created_at timestamptz not null default now(), unique(quiz_id,submission_key), foreign key (quiz_id,organization_id) references public.public_quizzes(id,organization_id), foreign key (participant_id,organization_id) references public.participants(id,organization_id)
);
create table if not exists public.public_quiz_rate_limits (
 quiz_id uuid not null references public.public_quizzes(id) on delete cascade, ip_hash text not null, window_start timestamptz not null default now(), attempts integer not null default 0, primary key(quiz_id,ip_hash)
);
create index if not exists quiz_attempts_org_date_idx on public.public_quiz_attempts(organization_id,created_at desc);
create index if not exists quiz_attempts_quiz_date_idx on public.public_quiz_attempts(quiz_id,created_at desc);
create index if not exists quiz_rate_window_idx on public.public_quiz_rate_limits(window_start);
alter table public.public_quizzes enable row level security;
alter table public.public_quiz_questions enable row level security;
alter table public.public_quiz_attempts enable row level security;
alter table public.public_quiz_rate_limits enable row level security;
revoke all on public.public_quizzes,public.public_quiz_questions,public.public_quiz_attempts,public.public_quiz_rate_limits from public,anon,authenticated;
grant all on public.public_quizzes,public.public_quiz_questions,public.public_quiz_attempts,public.public_quiz_rate_limits to service_role;
grant select,insert,update(is_open,title) on public.public_quizzes to authenticated;
grant select,update(participant_id) on public.public_quiz_attempts to authenticated;
drop policy if exists quiz_admin_read on public.public_quizzes;
create policy quiz_admin_read on public.public_quizzes for select to authenticated using (public.is_org_admin(organization_id));
drop policy if exists quiz_admin_insert on public.public_quizzes;
create policy quiz_admin_insert on public.public_quizzes for insert to authenticated with check (public.is_org_admin(organization_id));
drop policy if exists quiz_admin_update on public.public_quizzes;
create policy quiz_admin_update on public.public_quizzes for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
drop policy if exists quiz_attempts_admin_read on public.public_quiz_attempts;
create policy quiz_attempts_admin_read on public.public_quiz_attempts for select to authenticated using (public.is_org_admin(organization_id));
drop policy if exists quiz_attempts_admin_update on public.public_quiz_attempts;
create policy quiz_attempts_admin_update on public.public_quiz_attempts for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
drop trigger if exists touch_public_quizzes on public.public_quizzes;
create trigger touch_public_quizzes before update on public.public_quizzes for each row execute function public.touch_updated_at();

with source(code,sort_order,section,prompt,visual,options,answer) as (values
 ('q1',1,'Menghitung','Ada berapa bintang?','{"symbol":"★","count":7}'::jsonb,'["5","6","7","8"]'::jsonb,'7'),
 ('q2',2,'Menghitung','Pilih kelompok yang berisi 5 titik.',null::jsonb,'["●●●","●●●●","●●●●●","●●●●●●"]'::jsonb,'●●●●●'),
 ('q3',3,'Angka','Pilih titik yang cocok dengan angka 3.','{"symbol":"3","count":1}'::jsonb,'["●●","●●●","●●●●","●●●●●"]'::jsonb,'●●●'),
 ('q4',4,'Angka','Pilih titik yang cocok dengan angka 7.','{"symbol":"7","count":1}'::jsonb,'["●●●●●","●●●●●●","●●●●●●●","●●●●●●●●"]'::jsonb,'●●●●●●●'),
 ('q5',5,'Angka','Mana angka yang lebih besar?','{"left":38,"right":83}'::jsonb,'["38","83"]'::jsonb,'83'),
 ('q6',6,'Tambah dan kurang','6 + 3 = ?',null::jsonb,'["7","8","9","10"]'::jsonb,'9'),
 ('q7',7,'Tambah dan kurang','9 − 4 = ?',null::jsonb,'["4","5","6","7"]'::jsonb,'5'),
 ('q8',8,'Tambah dan kurang','27 + 15 = ?',null::jsonb,'["32","40","42","52"]'::jsonb,'42'),
 ('q9',9,'Tambah dan kurang','42 − 17 = ?',null::jsonb,'["23","24","25","35"]'::jsonb,'25'),
 ('q10',10,'Perkalian','3 × 4 = ?','{"symbol":"●","count":4,"groups":3}'::jsonb,'["7","10","12","16"]'::jsonb,'12'),
 ('q11',11,'Perkalian','Ada 4 tim bola. Tiap tim 5 anak. Semuanya berapa anak?',null::jsonb,'["9","16","20","25"]'::jsonb,'20'),
 ('q12',12,'Pembagian','12 ÷ 3 = ?','{"symbol":"●","count":4,"groups":3}'::jsonb,'["3","4","6","9"]'::jsonb,'4')
) insert into public.public_quiz_questions(version,code,sort_order,section,prompt,visual,options,answer)
select 'kuis-numerasi-v1',s.code,s.sort_order,s.section,s.prompt,s.visual,s.options,s.answer from source s on conflict(version,code) do nothing;

create or replace function public.submit_public_quiz(target_slug text, request_key uuid, name_input text, age_input integer, answers_input jsonb, client_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare quiz public.public_quizzes; attempt_id uuid; rate_count integer; item public.public_quiz_questions; given text; correct_count integer := 0; total_count integer := 0; graded jsonb := '[]'::jsonb; question_snapshot jsonb := '[]'::jsonb; created boolean := false;
begin
 select * into quiz from public.public_quizzes where slug=target_slug and is_open=true;
 if not found then raise exception 'Kuis tidak tersedia'; end if;
 select id into attempt_id from public.public_quiz_attempts where quiz_id=quiz.id and submission_key=request_key;
 if attempt_id is not null then return attempt_id; end if;
 if length(trim(name_input)) not between 2 and 120 or age_input not between 4 and 99 or jsonb_typeof(answers_input)<>'array' or jsonb_array_length(answers_input)>30 or length(client_hash)<>64 then raise exception 'Isian tidak valid'; end if;
 delete from public.public_quiz_rate_limits where window_start < now() - interval '30 days';
 insert into public.public_quiz_rate_limits(quiz_id,ip_hash,window_start,attempts) values(quiz.id,client_hash,now(),1)
 on conflict(quiz_id,ip_hash) do update set window_start=case when public.public_quiz_rate_limits.window_start < now()-interval '1 hour' then now() else public.public_quiz_rate_limits.window_start end,
 attempts=case when public.public_quiz_rate_limits.window_start < now()-interval '1 hour' then 1 else public.public_quiz_rate_limits.attempts+1 end returning attempts into rate_count;
 if rate_count>100 then raise exception 'Terlalu banyak kiriman. Coba lagi nanti'; end if;
 if exists(select 1 from jsonb_array_elements(answers_input) as entry(value) where entry.value->>'question_id' is null or entry.value->>'value' is null or not exists(select 1 from public.public_quiz_questions q where q.version=quiz.version and q.code=entry.value->>'question_id')) then raise exception 'Pilihan jawaban tidak valid'; end if;
 if (select count(*) from jsonb_array_elements(answers_input)) <> (select count(distinct entry.value->>'question_id') from jsonb_array_elements(answers_input) as entry(value)) then raise exception 'Jawaban ganda tidak valid'; end if;
 for item in select * from public.public_quiz_questions where version=quiz.version order by sort_order loop
  total_count:=total_count+1;
  select value->>'value' into given from jsonb_array_elements(answers_input) where value->>'question_id'=item.code limit 1;
  if given is not null and not item.options ? given then raise exception 'Pilihan jawaban tidak valid'; end if;
  if given=item.answer then correct_count:=correct_count+1; end if;
  graded:=graded || jsonb_build_array(jsonb_build_object('question_id',item.code,'status',case when given is null then 'skipped' when given=item.answer then 'correct' else 'incorrect' end));
  question_snapshot:=question_snapshot || jsonb_build_array(jsonb_build_object('id',item.code,'section',item.section,'prompt',item.prompt,'answer',item.answer));
 end loop;
 if total_count=0 then raise exception 'Kuis belum memiliki soal'; end if;
 insert into public.public_quiz_attempts(organization_id,quiz_id,submission_key,full_name,age_years,answers,result)
 values(quiz.organization_id,quiz.id,request_key,trim(name_input),age_input,answers_input,jsonb_build_object('correct',correct_count,'total',total_count,'graded',graded,'questions',question_snapshot))
 on conflict(quiz_id,submission_key) do nothing returning id into attempt_id;
 created := attempt_id is not null;
 if attempt_id is null then
  select id into attempt_id from public.public_quiz_attempts where quiz_id=quiz.id and submission_key=request_key;
 end if;
 if attempt_id is null then raise exception 'Kiriman belum tersimpan'; end if;
 if created then
  insert into public.audit_logs(organization_id,entity_type,entity_id,action) values(quiz.organization_id,'public_quiz_attempt',attempt_id,'submit');
 end if;
 return attempt_id;
end $$;
revoke all on function public.submit_public_quiz(text,uuid,text,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.submit_public_quiz(text,uuid,text,integer,jsonb,text) to service_role;

create or replace function public.audit_quiz_link() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if old.participant_id is distinct from new.participant_id then
  insert into public.audit_logs(organization_id,actor_id,entity_type,entity_id,action,detail)
  values(new.organization_id,auth.uid(),'public_quiz_attempt',new.id,'link_participant',jsonb_build_object('participant_id',new.participant_id));
 end if;
 return new;
end $$;
drop trigger if exists audit_quiz_link on public.public_quiz_attempts;
create trigger audit_quiz_link after update on public.public_quiz_attempts for each row execute function public.audit_quiz_link();

create or replace function public.keep_quiz_identity() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.id is distinct from old.id or new.organization_id is distinct from old.organization_id
    or new.slug is distinct from old.slug or new.version is distinct from old.version then
  raise exception 'Identitas dan versi tautan kuis tidak boleh diubah';
 end if;
 return new;
end $$;
drop trigger if exists keep_quiz_identity on public.public_quizzes;
create trigger keep_quiz_identity before update on public.public_quizzes for each row execute function public.keep_quiz_identity();
