-- Platform ownership is separate from organization membership.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from public, anon, authenticated;
grant select on public.platform_admins to authenticated;
grant all on public.platform_admins to service_role;

drop policy if exists platform_admin_read_self on public.platform_admins;
create policy platform_admin_read_self on public.platform_admins
  for select to authenticated using (user_id = (select auth.uid()));

do $$
declare owner_id uuid;
begin
  select id into owner_id from auth.users
  where lower(email) = 'admin@roemah-belajar.vercel.app';
  if owner_id is null then
    raise exception 'Akun super admin belum ada di Authentication → Users';
  end if;
  insert into public.platform_admins(user_id) values (owner_id)
  on conflict (user_id) do nothing;
end $$;
