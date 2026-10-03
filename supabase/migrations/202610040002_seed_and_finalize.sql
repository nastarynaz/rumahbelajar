-- Immutable published instrument. Admins publish later versions through controlled migrations.
insert into public.instruments (code,version,title,published) values ('tangga-angka','tangga-angka-v1','Tangga Angka',true) on conflict (code,version) do nothing;
with source(code,title,sort_order,threshold) as (values
 ('A','Menghitung benda',1,2),('B','Angka 1–9',2,4),('C','Angka 10–99',3,4),('D1','Tambah dan kurang dasar',4,2),('D2','Menyimpan dan meminjam',5,2),('E','Perkalian',6,2),('F','Pembagian dan cerita',7,2)
) insert into public.instrument_levels(instrument_id,code,title,sort_order,threshold)
select i.id,s.code,s.title,s.sort_order,s.threshold from source s cross join public.instruments i where i.version='tangga-angka-v1' on conflict (instrument_id,code) do nothing;
with source(level_code,code,sort_order,prompt,answer,role,kind,visual,help) as (values
 ('A','a-1',1,'Ayo hitung bersama dari 1 sampai 10.','1–10','practice','activity',null::jsonb,null::text),
 ('A','a-2',2,'Ada berapa bintang?','7','core','count','{"symbol":"★","count":7}'::jsonb,null),
 ('A','a-3',3,'Ambilkan 5 benda.','5','core','activity',null,null),
 ('B','b-1',1,'Angka berapa ini?','3','core','recognize','{"symbol":"3","count":1}'::jsonb,'Kartu titik boleh digunakan.'),
 ('B','b-2',2,'Angka berapa ini?','7','core','recognize','{"symbol":"7","count":1}'::jsonb,'Kartu titik boleh digunakan.'),
 ('B','b-3',3,'Angka berapa ini?','5','core','recognize','{"symbol":"5","count":1}'::jsonb,'Kartu titik boleh digunakan.'),
 ('B','b-4',4,'Angka berapa ini?','9','core','recognize','{"symbol":"9","count":1}'::jsonb,'Kartu titik boleh digunakan.'),
 ('B','b-5',5,'Angka berapa ini?','2','core','recognize','{"symbol":"2","count":1}'::jsonb,'Kartu titik boleh digunakan.'),
 ('B','b-v1',6,'Angka berapa ini?','4','verification','recognize','{"symbol":"4","count":1}'::jsonb,null),
 ('B','b-v2',7,'Angka berapa ini?','8','verification','recognize','{"symbol":"8","count":1}'::jsonb,null),
 ('C','c-1',1,'Angka berapa ini?','14','core','recognize','{"symbol":"14","count":1}'::jsonb,null),
 ('C','c-2',2,'Angka berapa ini?','27','core','recognize','{"symbol":"27","count":1}'::jsonb,null),
 ('C','c-3',3,'Angka berapa ini?','60','core','recognize','{"symbol":"60","count":1}'::jsonb,null),
 ('C','c-4',4,'Angka berapa ini?','83','core','recognize','{"symbol":"83","count":1}'::jsonb,null),
 ('C','c-5',5,'Angka berapa ini?','51','core','recognize','{"symbol":"51","count":1}'::jsonb,null),
 ('C','c-v1',6,'Mana yang lebih besar, 38 atau 83?','83','verification','compare',null,null),
 ('D1','d1-1',1,'6 + 3 = ?','9','core','arithmetic',null,'Jari atau benda hitung boleh digunakan.'),
 ('D1','d1-2',2,'9 − 4 = ?','5','core','arithmetic',null,null),
 ('D1','d1-v1',3,'5 + 4 = ?','9','verification','arithmetic',null,null),
 ('D1','d1-v2',4,'8 − 3 = ?','5','verification','arithmetic',null,null),
 ('D2','d2-1',1,'27 + 15 = ?','42','core','arithmetic',null,'Coretan di kertas boleh digunakan.'),
 ('D2','d2-2',2,'42 − 17 = ?','25','core','arithmetic',null,null),
 ('D2','d2-v1',3,'53 − 26 = ?','27','verification','arithmetic',null,null),
 ('E','e-1',1,'3 × 4 = ?','12','core','arithmetic','{"symbol":"●","count":4,"groups":3}'::jsonb,null),
 ('E','e-2',2,'6 × 7 = ?','42','core','arithmetic',null,null),
 ('E','e-3',3,'Ada 4 tim bola. Tiap tim 5 anak. Semuanya berapa anak?','20','core','story',null,null),
 ('F','f-1',1,'12 ÷ 3 = ?','4','core','arithmetic','{"symbol":"●","count":4,"groups":3}'::jsonb,null),
 ('F','f-2',2,'56 ÷ 7 = ?','8','core','arithmetic',null,null),
 ('F','f-3',3,'Ada 3 kantong berisi 6 kelereng. Lima diberikan ke teman. Berapa sisanya?','13','core','story',null,null)
) insert into public.questions(instrument_id,level_id,code,sort_order,prompt,answer,role,kind,visual,help)
select i.id,l.id,s.code,s.sort_order,s.prompt,s.answer,s.role,s.kind,s.visual,s.help from source s join public.instruments i on i.version='tangga-angka-v1' join public.instrument_levels l on l.instrument_id=i.id and l.code=s.level_code on conflict (instrument_id,code) do nothing;

-- Server calls this with the user's JWT. Row locks and status guard make retry safe.
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
 insert into public.audit_logs(organization_id,actor_id,entity_type,entity_id,action,detail) values (s.organization_id,auth.uid(),'assessment_session',s.id,'finalize',jsonb_build_object('highest_passed_level',passed));
 return rec;
end $$;
revoke all on function public.finalize_assessment(uuid,integer,text,text,text) from public;
grant execute on function public.finalize_assessment(uuid,integer,text,text,text) to authenticated;
