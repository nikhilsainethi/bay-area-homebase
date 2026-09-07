begin;
create table if not exists public.homebase_properties (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 id text not null check (length(id) between 1 and 100),
 osm_id text,
 data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 150000 and data->>'id' = id and length(data->>'name') > 0),
 updated_at timestamptz not null default now(),
 primary key (user_id,id),
 unique(user_id,osm_id)
);
alter table public.homebase_properties enable row level security;
revoke all on public.homebase_properties from anon;
grant select,insert,update,delete on public.homebase_properties to authenticated;
drop policy if exists homebase_select_own on public.homebase_properties;
create policy homebase_select_own on public.homebase_properties for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists homebase_insert_own on public.homebase_properties;
create policy homebase_insert_own on public.homebase_properties for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists homebase_update_own on public.homebase_properties;
create policy homebase_update_own on public.homebase_properties for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists homebase_delete_own on public.homebase_properties;
create policy homebase_delete_own on public.homebase_properties for delete to authenticated using ((select auth.uid()) = user_id);
create or replace function public.homebase_stamp_updated() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists homebase_stamp_updated on public.homebase_properties;
create trigger homebase_stamp_updated before update on public.homebase_properties for each row execute function public.homebase_stamp_updated();
commit;
