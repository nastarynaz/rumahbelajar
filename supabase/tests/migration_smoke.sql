-- Run in the Supabase SQL Editor after applying all migrations.
-- Raises an exception if a required object, seed, or privilege is missing.
do $$
declare missing_rls text;
begin
 if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r' and c.relname = any(array[
      'organizations','profiles','organization_members','programs','participants',
      'assessor_assignments','instruments','instrument_levels','questions',
      'assessment_sessions','assessment_responses','assessment_observations','audit_logs',
      'public_quizzes','public_quiz_questions','public_quiz_attempts','public_quiz_rate_limits'
     ])) <> 17 then raise exception 'Ada tabel aplikasi yang belum dibuat'; end if;
 select string_agg(c.relname, ', ') into missing_rls
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname = any(array[
  'organizations','profiles','organization_members','programs','participants',
  'assessor_assignments','instruments','instrument_levels','questions',
  'assessment_sessions','assessment_responses','assessment_observations','audit_logs',
  'public_quizzes','public_quiz_questions','public_quiz_attempts','public_quiz_rate_limits'
 ]) and c.relkind='r' and not c.relrowsecurity;
 if missing_rls is not null then raise exception 'RLS belum aktif pada: %',missing_rls; end if;
 if (select count(*) from public.instrument_levels l join public.instruments i on i.id=l.instrument_id where i.version='tangga-angka-v1')<>7 then
  raise exception 'Level Tangga Angka tidak lengkap';
 end if;
 if (select count(*) from public.questions q join public.instruments i on i.id=q.instrument_id where i.version='tangga-angka-v1')<>29 then
  raise exception 'Soal Tangga Angka tidak lengkap';
 end if;
 if (select count(*) from public.public_quiz_questions where version='kuis-numerasi-v1')<>12 then
  raise exception 'Soal kuis mandiri tidak lengkap';
 end if;
 if exists(select 1 from public.public_quiz_questions where version='kuis-numerasi-v1' and not options ? answer) then
  raise exception 'Kunci kuis tidak ada dalam pilihan';
 end if;
 if has_table_privilege('anon','public.public_quiz_attempts','SELECT')
    or has_table_privilege('anon','public.public_quiz_questions','SELECT')
    or has_table_privilege('authenticated','public.public_quiz_questions','SELECT')
    or has_table_privilege('authenticated','public.assessment_responses','INSERT')
    or has_table_privilege('authenticated','public.assessment_sessions','INSERT')
    or has_column_privilege('authenticated','public.public_quizzes','version','UPDATE')
    or has_column_privilege('authenticated','public.public_quizzes','slug','UPDATE')
    or has_column_privilege('authenticated','public.public_quiz_attempts','full_name','UPDATE')
    or has_column_privilege('authenticated','public.public_quiz_attempts','result','UPDATE') then
  raise exception 'Hak akses tabel lebih luas dari rancangan';
 end if;
 if not has_column_privilege('authenticated','public.public_quizzes','is_open','UPDATE')
    or not has_column_privilege('authenticated','public.public_quiz_attempts','participant_id','UPDATE')
    or not has_table_privilege('service_role','public.public_quiz_questions','SELECT') then
  raise exception 'Hak akses aplikasi kurang';
 end if;
 if has_function_privilege('anon','public.submit_public_quiz(text,uuid,text,integer,jsonb,text)','EXECUTE')
    or not has_function_privilege('service_role','public.submit_public_quiz(text,uuid,text,integer,jsonb,text)','EXECUTE') then
  raise exception 'Hak akses fungsi kuis tidak sesuai';
 end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.public_quizzes'::regclass and tgname='keep_quiz_identity' and not tgisinternal)
    or not exists(select 1 from pg_trigger where tgrelid='public.assessment_observations'::regclass and tgname='keep_observation_session' and not tgisinternal)
    or not exists(select 1 from pg_trigger where tgrelid='public.public_quiz_attempts'::regclass and tgname='audit_quiz_link' and not tgisinternal) then
  raise exception 'Trigger integritas atau audit belum terpasang';
 end if;
end $$;
