-- PLANTÃO+ 1.2 - Execute no SQL Editor do seu projeto Supabase.
-- Login por e-mail + equipe com convite de 128 bits + RLS + atualizações otimistas.
-- Executar uma vez. Nenhuma senha ou chave privada deve ir para o site.

create table if not exists public.plantao_teams (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 2 and 80),
 invite_hash text not null unique,
 created_at timestamptz not null default now()
);
create table if not exists public.plantao_team_members (
 team_id uuid not null references public.plantao_teams(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','manager')),
 joined_at timestamptz not null default now(),
 primary key(team_id,user_id)
);
create table if not exists public.plantao_snapshots (
 team_id uuid primary key references public.plantao_teams(id) on delete cascade,
 payload jsonb not null default '{}'::jsonb,
 revision bigint not null default 0,
 updated_at timestamptz not null default now()
);

alter table public.plantao_teams enable row level security;
alter table public.plantao_team_members enable row level security;
alter table public.plantao_snapshots enable row level security;

-- Usuários autenticados só consultam a própria participação e equipes a que pertencem.
drop policy if exists plantao_member_own_read on public.plantao_team_members;
create policy plantao_member_own_read on public.plantao_team_members for select to authenticated
using (user_id=(select auth.uid()));
drop policy if exists plantao_team_read on public.plantao_teams;
create policy plantao_team_read on public.plantao_teams for select to authenticated
using (exists (select 1 from public.plantao_team_members m where m.team_id=id and m.user_id=(select auth.uid())));
drop policy if exists plantao_snapshot_read on public.plantao_snapshots;
create policy plantao_snapshot_read on public.plantao_snapshots for select to authenticated
using (exists (select 1 from public.plantao_team_members m where m.team_id=plantao_snapshots.team_id and m.user_id=(select auth.uid())));

-- Ninguém altera tabelas diretamente a partir do navegador: somente funções com autorização.
revoke all on public.plantao_teams,public.plantao_team_members,public.plantao_snapshots from anon;
revoke insert,update,delete on public.plantao_teams,public.plantao_team_members,public.plantao_snapshots from authenticated;
grant select on public.plantao_teams,public.plantao_team_members,public.plantao_snapshots to authenticated;

create or replace function public.plantao_create_team(p_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare team_id uuid; code text;
begin
 if auth.uid() is null then raise exception 'Faça login.'; end if;
 if p_name is null or char_length(trim(p_name)) not between 2 and 80 then raise exception 'Nome de unidade inválido.'; end if;
 code := replace(gen_random_uuid()::text,'-','');
 insert into public.plantao_teams(name,invite_hash)
 values (trim(p_name),encode(sha256(convert_to(code,'UTF8')),'hex')) returning id into team_id;
 insert into public.plantao_team_members(team_id,user_id,role) values (team_id,auth.uid(),'owner');
 insert into public.plantao_snapshots(team_id,payload) values (team_id,'{}'::jsonb);
 return jsonb_build_object('team_id',team_id,'invite_code',code);
end;
$$;

create or replace function public.plantao_join_team(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare team_id uuid;
begin
 if auth.uid() is null then raise exception 'Faça login.'; end if;
 if p_code is null or length(trim(p_code)) <> 32 then raise exception 'Código inválido.'; end if;
 select id into team_id from public.plantao_teams
 where invite_hash=encode(sha256(convert_to(lower(trim(p_code)),'UTF8')),'hex');
 if team_id is null then raise exception 'Código não encontrado.'; end if;
 insert into public.plantao_team_members(team_id,user_id,role)
 values (team_id,auth.uid(),'manager') on conflict do nothing;
 return team_id;
end;
$$;

-- A gravação só é permitida se a revisão esperada ainda é a atual.
-- Se outro gerente salvou primeiro, retorna -1 e a UI pede resolução manual.
create or replace function public.plantao_update_snapshot(p_team uuid,p_expected_revision bigint,p_payload jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_revision bigint;
begin
 if auth.uid() is null or not exists (
  select 1 from public.plantao_team_members
  where team_id=p_team and user_id=auth.uid() and role in ('owner','manager')
 ) then raise exception 'Sem permissão para alterar esta equipe.'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>750000
 then raise exception 'Conteúdo inválido ou acima de 750 KB.'; end if;
 update public.plantao_snapshots
 set payload=p_payload,revision=revision+1,updated_at=now()
 where team_id=p_team and revision=p_expected_revision
 returning revision into new_revision;
 return coalesce(new_revision,-1);
end;
$$;

-- Somente donos da equipe podem rotacionar códigos de convite.
create or replace function public.plantao_rotate_invite(p_team uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare code text;
begin
 if auth.uid() is null or not exists (
  select 1 from public.plantao_team_members
  where team_id=p_team and user_id=auth.uid() and role='owner'
 ) then raise exception 'Somente o responsável pode trocar o convite.'; end if;
 code:=replace(gen_random_uuid()::text,'-','');
 update public.plantao_teams set invite_hash=encode(sha256(convert_to(code,'UTF8')),'hex') where id=p_team;
 return code;
end;
$$;

revoke all on function public.plantao_create_team(text) from public,anon;
revoke all on function public.plantao_join_team(text) from public,anon;
revoke all on function public.plantao_update_snapshot(uuid,bigint,jsonb) from public,anon;
revoke all on function public.plantao_rotate_invite(uuid) from public,anon;
grant execute on function public.plantao_create_team(text) to authenticated;
grant execute on function public.plantao_join_team(text) to authenticated;
grant execute on function public.plantao_update_snapshot(uuid,bigint,jsonb) to authenticated;
grant execute on function public.plantao_rotate_invite(uuid) to authenticated;

-- Realtime: habilitar eventos de atualização de registros da equipe.
do $$ begin
 alter publication supabase_realtime add table public.plantao_snapshots;
exception when duplicate_object then null;
end $$;
