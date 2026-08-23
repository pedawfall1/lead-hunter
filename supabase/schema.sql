-- =====================================================================
-- Lead Hunter - schema inicial
-- Rode este arquivo em: Supabase -> SQL Editor -> New query -> Run
-- =====================================================================

-- ---------- enum de status ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type lead_status as enum (
      'novo', 'contatado', 'respondeu', 'negociando', 'fechou', 'descartado'
    );
  end if;
end$$;

-- ---------- projetos ----------
create table if not exists public.projetos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  nicho      text,
  regiao     text,
  criado_em  timestamptz not null default now(),
  -- Preparado para multi-usuario: hoje fica preenchido mas nao e usado para isolar.
  user_id    uuid references auth.users(id) on delete cascade default auth.uid()
);

-- ---------- leads ----------
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid not null references public.projetos(id) on delete cascade,
  nome          text not null,
  telefone      text,
  endereco      text,
  tem_site      boolean not null default false,
  instagram     text,
  status        lead_status not null default 'novo',
  nota          text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists leads_projeto_id_idx on public.leads (projeto_id);
create index if not exists leads_status_idx     on public.leads (status);
create index if not exists leads_tem_site_idx   on public.leads (tem_site);

-- ---------- templates de mensagem ----------
create table if not exists public.templates_mensagem (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  texto     text not null,
  criado_em timestamptz not null default now(),
  user_id   uuid references auth.users(id) on delete cascade default auth.uid()
);

-- ---------- atualizado_em automatico ----------
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists leads_set_atualizado_em on public.leads;
create trigger leads_set_atualizado_em
  before update on public.leads
  for each row execute function public.set_atualizado_em();

-- =====================================================================
-- RLS
-- Versao atual: 1 usuario (admin). Qualquer usuario autenticado ve tudo.
-- Para virar multi-tenant depois, veja o bloco comentado no fim do arquivo.
-- =====================================================================
alter table public.projetos           enable row level security;
alter table public.leads              enable row level security;
alter table public.templates_mensagem enable row level security;

drop policy if exists "auth full access" on public.projetos;
create policy "auth full access" on public.projetos
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access" on public.leads;
create policy "auth full access" on public.leads
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access" on public.templates_mensagem;
create policy "auth full access" on public.templates_mensagem
  for all to authenticated using (true) with check (true);

-- ---------- seed opcional de templates ----------
insert into public.templates_mensagem (nome, texto)
select 'Primeira abordagem',
       'Oi {nome}, tudo bem? Vi que voces atendem aqui no {bairro} e reparei que nao encontrei o site de voces. Trabalho ajudando negocios da regiao a aparecer no Google. Posso te mostrar rapidinho como ficaria?'
where not exists (select 1 from public.templates_mensagem);

insert into public.templates_mensagem (nome, texto)
select 'Follow-up 3 dias',
       'Oi {nome}, passando aqui de novo. Chegou a ver minha mensagem sobre a divulgacao de voces no {bairro}? Se fizer sentido eu te mando uma previa sem compromisso.'
where not exists (select 1 from public.templates_mensagem where nome = 'Follow-up 3 dias');

-- =====================================================================
-- FUTURO: multi-usuario. Nao rode agora.
-- =====================================================================
-- -- 1) leads passam a herdar o dono via projeto
-- drop policy if exists "auth full access" on public.projetos;
-- create policy "dono" on public.projetos for all to authenticated
--   using (user_id = auth.uid()) with check (user_id = auth.uid());
--
-- drop policy if exists "auth full access" on public.templates_mensagem;
-- create policy "dono" on public.templates_mensagem for all to authenticated
--   using (user_id = auth.uid()) with check (user_id = auth.uid());
--
-- drop policy if exists "auth full access" on public.leads;
-- create policy "dono via projeto" on public.leads for all to authenticated
--   using (exists (select 1 from public.projetos p
--                  where p.id = leads.projeto_id and p.user_id = auth.uid()))
--   with check (exists (select 1 from public.projetos p
--                  where p.id = leads.projeto_id and p.user_id = auth.uid()));
