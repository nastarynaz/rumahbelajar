-- Each shared form owns its questions. Existing forms receive a copy of the v1 bank.
create table if not exists public.public_quiz_items (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null,
  organization_id uuid not null,
  code text not null,
  sort_order integer not null check (sort_order > 0),
  section text not null check (length(section) between 1 and 80),
  prompt text not null check (length(prompt) between 2 and 500),
  visual jsonb,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  answer text not null,
  is_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(quiz_id, code),
  unique(quiz_id, sort_order),
  foreign key (quiz_id, organization_id) references public.public_quizzes(id, organization_id) on delete cascade,
  check (options ? answer)
);
alter table public.public_quiz_items enable row level security;
revoke all on public.public_quiz_items from public, anon, authenticated;
grant all on public.public_quiz_items to service_role;
grant select, insert, update, delete on public.public_quiz_items to authenticated;

drop policy if exists quiz_items_admin_read on public.public_quiz_items;
create policy quiz_items_admin_read on public.public_quiz_items for select to authenticated
  using (public.is_org_admin(organization_id));
drop policy if exists quiz_items_admin_insert on public.public_quiz_items;
create policy quiz_items_admin_insert on public.public_quiz_items for insert to authenticated
  with check (public.is_org_admin(organization_id));
drop policy if exists quiz_items_admin_update on public.public_quiz_items;
create policy quiz_items_admin_update on public.public_quiz_items for update to authenticated
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
drop policy if exists quiz_items_admin_delete on public.public_quiz_items;
create policy quiz_items_admin_delete on public.public_quiz_items for delete to authenticated
  using (public.is_org_admin(organization_id));

drop trigger if exists touch_quiz_items on public.public_quiz_items;
create trigger touch_quiz_items before update on public.public_quiz_items
  for each row execute function public.touch_updated_at();

create or replace function public.guard_quiz_item_edit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.quiz_id is distinct from old.quiz_id
      or new.organization_id is distinct from old.organization_id or new.code is distinct from old.code then
      raise exception 'Identitas soal kuis tidak boleh diubah';
    end if;
  end if;
  if exists(select 1 from public.public_quizzes where id = old.quiz_id and is_open) then
    raise exception 'Tutup tautan kuis sebelum mengubah soal';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists guard_quiz_item_edit on public.public_quiz_items;
create trigger guard_quiz_item_edit before update or delete on public.public_quiz_items
  for each row execute function public.guard_quiz_item_edit();

insert into public.public_quiz_items
  (quiz_id, organization_id, code, sort_order, section, prompt, visual, options, answer)
select p.id, p.organization_id, q.code, q.sort_order, q.section, q.prompt, q.visual, q.options, q.answer
from public.public_quizzes p
join public.public_quiz_questions q on q.version = p.version
on conflict do nothing;

create or replace function public.seed_public_quiz_items() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.public_quiz_items
    (quiz_id, organization_id, code, sort_order, section, prompt, visual, options, answer)
  select new.id, new.organization_id, q.code, q.sort_order, q.section, q.prompt, q.visual, q.options, q.answer
  from public.public_quiz_questions q where q.version = new.version
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists seed_public_quiz_items on public.public_quizzes;
create trigger seed_public_quiz_items after insert on public.public_quizzes
  for each row execute function public.seed_public_quiz_items();

create or replace function public.submit_public_quiz(target_slug text, request_key uuid, name_input text, age_input integer, answers_input jsonb, client_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare quiz public.public_quizzes; attempt_id uuid; rate_count integer; item public.public_quiz_items; given text; correct_count integer := 0; total_count integer := 0; graded jsonb := '[]'::jsonb; question_snapshot jsonb := '[]'::jsonb; created boolean := false;
begin
  select * into quiz from public.public_quizzes where slug = target_slug and is_open = true;
  if not found then raise exception 'Kuis tidak tersedia'; end if;
  select id into attempt_id from public.public_quiz_attempts where quiz_id = quiz.id and submission_key = request_key;
  if attempt_id is not null then return attempt_id; end if;
  if name_input is null or length(trim(name_input)) not between 2 and 120 or age_input not between 4 and 99
     or length(client_hash) <> 64 then raise exception 'Isian tidak valid'; end if;
  if jsonb_typeof(answers_input) is distinct from 'array' then raise exception 'Jawaban tidak valid'; end if;
  if jsonb_array_length(answers_input) > 50 then raise exception 'Jawaban terlalu banyak'; end if;

  insert into public.public_quiz_rate_limits(quiz_id, ip_hash, window_start, attempts)
  values(quiz.id, client_hash, now(), 1)
  on conflict(quiz_id, ip_hash) do update set
    window_start = case when public.public_quiz_rate_limits.window_start < now() - interval '1 hour' then now() else public.public_quiz_rate_limits.window_start end,
    attempts = case when public.public_quiz_rate_limits.window_start < now() - interval '1 hour' then 1 else public.public_quiz_rate_limits.attempts + 1 end
  returning attempts into rate_count;
  if rate_count > 100 then raise exception 'Terlalu banyak kiriman. Coba lagi nanti'; end if;

  if exists(select 1 from jsonb_array_elements(answers_input) as entry(value)
    where entry.value->>'question_id' is null or entry.value->>'value' is null
      or not exists(select 1 from public.public_quiz_items q where q.quiz_id = quiz.id and q.code = entry.value->>'question_id'))
  then raise exception 'Pilihan jawaban tidak valid'; end if;
  if (select count(*) from jsonb_array_elements(answers_input)) <>
     (select count(distinct entry.value->>'question_id') from jsonb_array_elements(answers_input) as entry(value))
  then raise exception 'Jawaban ganda tidak valid'; end if;

  for item in select * from public.public_quiz_items where quiz_id = quiz.id order by sort_order loop
    total_count := total_count + 1;
    select value->>'value' into given from jsonb_array_elements(answers_input)
      where value->>'question_id' = item.code limit 1;
    if item.is_required and given is null then raise exception 'Ada soal wajib yang belum dijawab'; end if;
    if given is not null and not (item.options ? given) then raise exception 'Pilihan jawaban tidak valid'; end if;
    if given = item.answer then correct_count := correct_count + 1; end if;
    graded := graded || jsonb_build_array(jsonb_build_object('question_id', item.code,
      'status', case when given is null then 'skipped' when given = item.answer then 'correct' else 'incorrect' end));
    question_snapshot := question_snapshot || jsonb_build_array(jsonb_build_object('id', item.code,
      'section', item.section, 'prompt', item.prompt, 'answer', item.answer));
  end loop;
  if total_count = 0 then raise exception 'Kuis belum memiliki soal'; end if;

  insert into public.public_quiz_attempts(organization_id, quiz_id, submission_key, full_name, age_years, answers, result)
  values(quiz.organization_id, quiz.id, request_key, trim(name_input), age_input, answers_input,
    jsonb_build_object('correct', correct_count, 'total', total_count, 'graded', graded, 'questions', question_snapshot))
  on conflict(quiz_id, submission_key) do nothing returning id into attempt_id;
  created := attempt_id is not null;
  if attempt_id is null then
    select id into attempt_id from public.public_quiz_attempts where quiz_id = quiz.id and submission_key = request_key;
  end if;
  if attempt_id is null then raise exception 'Kiriman belum tersimpan'; end if;
  if created then
    insert into public.audit_logs(organization_id, entity_type, entity_id, action)
    values(quiz.organization_id, 'public_quiz_attempt', attempt_id, 'submit');
  end if;
  return attempt_id;
end $$;
revoke all on function public.submit_public_quiz(text,uuid,text,integer,jsonb,text) from public, anon, authenticated;
grant execute on function public.submit_public_quiz(text,uuid,text,integer,jsonb,text) to service_role;
