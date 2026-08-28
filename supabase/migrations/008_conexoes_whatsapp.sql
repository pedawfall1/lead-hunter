-- 008 — O WhatsApp de cada vendedor (uma instância da Evolution por pessoa).
create table if not exists public.lh_conexoes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  equipe_id uuid not null references public.lh_equipes(id) on delete cascade
    default public.lh_minha_equipe(),
  -- nome da instância na Evolution; único no servidor inteiro
  instancia text not null unique,
  -- o número que atendeu ao QR, quando já conectou
  numero text,
  -- espelho do connectionState da Evolution: open | connecting | close
  status text not null default 'close',
  atualizado_em timestamptz not null default now()
);

create index if not exists lh_conexoes_equipe on public.lh_conexoes(equipe_id);
alter table public.lh_conexoes enable row level security;

-- A equipe VÊ quem está conectado (o dono precisa saber se o vendedor ligou
-- o WhatsApp dele), mas só o próprio dono da linha MEXE nela.
drop policy if exists "equipe ve" on public.lh_conexoes;
create policy "equipe ve" on public.lh_conexoes for select to authenticated
  using (equipe_id in (select public.lh_minhas_equipes()));

drop policy if exists "so a minha" on public.lh_conexoes;
create policy "so a minha" on public.lh_conexoes for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Quem está na minha equipe, com e-mail e estado do WhatsApp. O e-mail mora
-- em auth.users, que nenhuma policy do app alcança; a função devolve só os
-- membros das equipes de quem chama.
create or replace function public.lh_equipe_membros()
returns table (user_id uuid, email text, papel text, status text, numero text, instancia text)
language sql stable security definer set search_path = public
as $fn$
  select m.user_id, u.email::text, m.papel,
         coalesce(c.status, 'close') as status, c.numero, c.instancia
  from public.lh_membros m
  join auth.users u on u.id = m.user_id
  left join public.lh_conexoes c on c.user_id = m.user_id
  where m.equipe_id in (select public.lh_minhas_equipes())
  order by (m.papel = 'dono') desc, u.email
$fn$;

revoke all     on function public.lh_equipe_membros() from public;
revoke execute on function public.lh_equipe_membros() from anon;
grant  execute on function public.lh_equipe_membros() to authenticated;
