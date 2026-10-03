revoke update on public.assessment_sessions from authenticated;
revoke insert,update on public.assessment_responses from authenticated;

create or replace function public.save_assessment_response(target_session uuid, expected_revision integer, answer_question_code text, answer_status text, answer_response text default null, answer_help text default null, answer_note text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare s public.assessment_sessions; valid_question boolean; next_revision integer;
begin
 select * into s from public.assessment_sessions where id=target_session for update;
 if not found or not public.can_access_participant(s.organization_id,s.participant_id) then raise exception 'Sesi tidak tersedia'; end if;
 if s.status not in ('draft','in_progress') then raise exception 'Sesi tidak bisa diubah'; end if;
 if s.revision<>expected_revision then raise exception 'Sesi berubah di perangkat lain. Muat ulang halaman'; end if;
 if answer_status not in ('correct','incorrect','skipped','not_asked') or length(coalesce(answer_response,''))>300 or length(coalesce(answer_help,''))>120 or length(coalesce(answer_note,''))>1000 then raise exception 'Jawaban tidak valid'; end if;
 select exists(select 1 from jsonb_array_elements(s.instrument_snapshot->'levels') lvl cross join jsonb_array_elements(lvl->'questions') q where q->>'id'=answer_question_code) into valid_question;
 if not valid_question then raise exception 'Soal tidak ada dalam sesi'; end if;
 insert into public.assessment_responses(organization_id,session_id,question_code,status,response,help,note)
 values(s.organization_id,s.id,answer_question_code,answer_status,answer_response,answer_help,answer_note)
 on conflict(session_id,question_code) do update set status=excluded.status,response=excluded.response,help=excluded.help,note=excluded.note;
 update public.assessment_sessions set status='in_progress',started_at=coalesce(started_at,now()),revision=revision+1 where id=s.id returning revision into next_revision;
 insert into public.audit_logs(organization_id,actor_id,entity_type,entity_id,action,detail) values(s.organization_id,auth.uid(),'assessment_session',s.id,'save_response',jsonb_build_object('question_code',answer_question_code));
 return next_revision;
end $$;
revoke all on function public.save_assessment_response(uuid,integer,text,text,text,text,text) from public;
grant execute on function public.save_assessment_response(uuid,integer,text,text,text,text,text) to authenticated;
