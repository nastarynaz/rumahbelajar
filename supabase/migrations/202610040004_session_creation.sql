revoke insert on public.assessment_sessions from authenticated;

create or replace function public.create_assessment(target_participant uuid, session_type text, assessment_date date, initial_level text, request_key uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare person public.participants; instrument public.instruments; snap jsonb; new_id uuid; created boolean := false;
begin
 select * into person from public.participants where id=target_participant and archived_at is null;
 if not found or not public.can_access_participant(person.organization_id,person.id) then raise exception 'Peserta tidak tersedia'; end if;
 if session_type not in ('baseline','posttest','reassessment') or initial_level not in ('A','B','C','D1','D2','E','F') then raise exception 'Data sesi tidak valid'; end if;
 select * into instrument from public.instruments where version='tangga-angka-v1' and published=true and (organization_id is null or organization_id=person.organization_id) order by organization_id nulls last limit 1;
 if not found then raise exception 'Instrumen belum tersedia'; end if;
 select jsonb_build_object('version',instrument.version,'levels',coalesce(jsonb_agg(jsonb_build_object('code',l.code,'title',l.title,'threshold',l.threshold,'questions',
   (select coalesce(jsonb_agg(jsonb_build_object('id',q.code,'level',l.code,'prompt',q.prompt,'answer',q.answer,'role',q.role,'kind',q.kind,'visual',q.visual,'help',q.help) order by q.sort_order),'[]'::jsonb) from public.questions q where q.level_id=l.id)) order by l.sort_order),'[]'::jsonb)) into snap
 from public.instrument_levels l where l.instrument_id=instrument.id;
 if jsonb_array_length(snap->'levels')<>7 then raise exception 'Instrumen belum lengkap'; end if;
 insert into public.assessment_sessions(organization_id,participant_id,assessor_id,instrument_id,instrument_snapshot,idempotency_key,type,assessed_on,start_level,status)
 values(person.organization_id,person.id,auth.uid(),instrument.id,snap,request_key,session_type,assessment_date,initial_level,'draft')
 on conflict(organization_id,idempotency_key) do nothing returning id into new_id;
 created := new_id is not null;
 if new_id is null then select id into new_id from public.assessment_sessions where organization_id=person.organization_id and idempotency_key=request_key and participant_id=person.id and assessor_id=auth.uid(); end if;
 if new_id is null then raise exception 'Kunci permintaan sudah digunakan'; end if;
 if created then
  insert into public.audit_logs(organization_id,actor_id,entity_type,entity_id,action) values(person.organization_id,auth.uid(),'assessment_session',new_id,'create');
 end if;
 return new_id;
end $$;
revoke all on function public.create_assessment(uuid,text,date,text,uuid) from public;
grant execute on function public.create_assessment(uuid,text,date,text,uuid) to authenticated;

create or replace function public.audit_assessment_observation() returns trigger language plpgsql security definer set search_path = '' as $$ begin insert into public.audit_logs(organization_id,actor_id,entity_type,entity_id,action) values(new.organization_id,auth.uid(),'assessment_observation',new.session_id,lower(tg_op)); return new; end $$;
create or replace function public.keep_observation_session() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.session_id is distinct from old.session_id or new.organization_id is distinct from old.organization_id then
  raise exception 'Identitas sesi pada catatan tidak boleh diubah';
 end if;
 return new;
end $$;
drop trigger if exists keep_observation_session on public.assessment_observations;
create trigger keep_observation_session before update on public.assessment_observations for each row execute function public.keep_observation_session();
drop trigger if exists audit_observation_write on public.assessment_observations;
create trigger audit_observation_write after insert or update on public.assessment_observations for each row execute function public.audit_assessment_observation();
