-- Arithmetic is stored structurally alongside presentation text.
with operations(code,op,left_value,right_value,result_value) as (values
 ('d1-1','add',6,3,9),('d1-2','subtract',9,4,5),('d1-v1','add',5,4,9),('d1-v2','subtract',8,3,5),
 ('d2-1','add',27,15,42),('d2-2','subtract',42,17,25),('d2-v1','subtract',53,26,27),
 ('e-1','multiply',3,4,12),('e-2','multiply',6,7,42),('f-1','divide',12,3,4),('f-2','divide',56,7,8)
) update public.questions q set operation=jsonb_build_object('operator',o.op,'left',o.left_value,'right',o.right_value,'result',o.result_value)
from operations o where q.code=o.code and q.instrument_id=(select id from public.instruments where version='tangga-angka-v1');
