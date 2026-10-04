-- A public quiz attempt is complete only after every item has a correct answer.
create or replace function public.require_quiz_mastery() returns trigger
language plpgsql set search_path = '' as $$
begin
  if jsonb_typeof(new.answers) is distinct from 'array' then
    raise exception 'Jawaban kuis tidak valid';
  end if;
  if jsonb_array_length(new.answers) is distinct from
    (select count(*) from public.public_quiz_items where quiz_id = new.quiz_id) then
    raise exception 'Jawab semua soal sebelum mengirim';
  end if;
  if exists (
    select 1 from public.public_quiz_items item
    where item.quiz_id = new.quiz_id
      and not exists (
        select 1 from jsonb_array_elements(new.answers) as submitted(value)
        where submitted.value->>'question_id' = item.code
          and submitted.value->>'value' = item.answer
      )
  ) then
    raise exception 'Selesaikan setiap soal sebelum mengirim';
  end if;
  return new;
end $$;

drop trigger if exists require_quiz_mastery on public.public_quiz_attempts;
create trigger require_quiz_mastery before insert on public.public_quiz_attempts
  for each row execute function public.require_quiz_mastery();
