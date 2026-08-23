-- =====================================================================
-- Lead Hunter — schema
--
-- Este projeto roda dentro de um Supabase COMPARTILHADO com outros
-- sistemas, entao duas decisoes:
--
--   1. Tabelas com prefixo lh_ (mesma convencao das tabelas mc_ que ja
--      existem no banco). Evita colidir com um "leads" de outro sistema.
--   2. RLS por dono, nao por "qualquer autenticado". O auth.users e
--      compartilhado: sem isso, usuario de outro sistema leria os leads.
--
-- Para trocar o prefixo, mexa em T no topo de src/lib/db.ts.
-- Rode em: Supabase -> SQL Editor -> New query -> Run
-- =====================================================================

-- ---------- enums ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lh_lead_status') then
    create type lh_lead_status as enum (
      'novo', 'contatado', 'respondeu', 'negociando', 'fechou', 'descartado'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'lh_interacao_tipo') then
    create type lh_interacao_tipo as enum (
      'whatsapp', 'ligacao', 'visita', 'email', 'nota'
    );
  end if;
end$$;

-- ---------- projetos ----------
-- servico   = o que este projeto esta vendendo
-- criterios = os sinais que qualificam um lead para esse servico, copiados
--             do catalogo na criacao e editaveis por projeto:
--             [{"chave":"sem_site","label":"Nao tem site"}, ...]
create table if not exists public.lh_projetos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  nicho      text,
  regiao     text,
  servico    text,
  criterios  jsonb not null default '[]'::jsonb,
  criado_em  timestamptz not null default now(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid()
);

-- ---------- leads ----------
-- sinais = quais criterios do projeto este lead dispara: {"sem_site": true}
create table if not exists public.lh_leads (
  id              uuid primary key default gen_random_uuid(),
  projeto_id      uuid not null references public.lh_projetos(id) on delete cascade,
  nome            text not null,
  telefone        text,
  endereco        text,
  instagram       text,
  sinais          jsonb not null default '{}'::jsonb,
  status          lh_lead_status not null default 'novo',
  nota            text,
  proximo_contato date,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- ---------- templates de mensagem ----------
create table if not exists public.lh_templates_mensagem (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  texto     text not null,
  criado_em timestamptz not null default now(),
  user_id   uuid not null references auth.users(id) on delete cascade default auth.uid()
);

-- ---------- interacoes ----------
-- A historia da negociacao. O botao de WhatsApp registra sozinho.
create table if not exists public.lh_interacoes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.lh_leads(id) on delete cascade,
  tipo        lh_interacao_tipo not null default 'nota',
  texto       text,
  template_id uuid references public.lh_templates_mensagem(id) on delete set null,
  criado_em   timestamptz not null default now()
);

create index if not exists lh_leads_projeto_id_idx      on public.lh_leads (projeto_id);
create index if not exists lh_leads_status_idx          on public.lh_leads (status);
create index if not exists lh_leads_proximo_contato_idx on public.lh_leads (proximo_contato);
create index if not exists lh_leads_sinais_idx          on public.lh_leads using gin (sinais);
create index if not exists lh_interacoes_lead_id_idx    on public.lh_interacoes (lead_id, criado_em desc);
create index if not exists lh_projetos_user_id_idx      on public.lh_projetos (user_id);

-- ---------- atualizado_em automatico ----------
create or replace function public.lh_set_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists lh_leads_set_atualizado_em on public.lh_leads;
create trigger lh_leads_set_atualizado_em
  before update on public.lh_leads
  for each row execute function public.lh_set_atualizado_em();

-- =====================================================================
-- RLS por dono: cada linha pertence a quem criou.
-- leads e interacoes herdam o dono via projeto.
-- Isso ja e o modelo multi-usuario: adicionar uma segunda conta e so
-- criar o usuario no painel, nada muda no codigo.
-- =====================================================================
alter table public.lh_projetos           enable row level security;
alter table public.lh_leads              enable row level security;
alter table public.lh_interacoes         enable row level security;
alter table public.lh_templates_mensagem enable row level security;

drop policy if exists "dono" on public.lh_projetos;
create policy "dono" on public.lh_projetos for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "dono" on public.lh_templates_mensagem;
create policy "dono" on public.lh_templates_mensagem for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "dono via projeto" on public.lh_leads;
create policy "dono via projeto" on public.lh_leads for all to authenticated
  using (exists (select 1 from public.lh_projetos p
                 where p.id = lh_leads.projeto_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lh_projetos p
                 where p.id = lh_leads.projeto_id and p.user_id = (select auth.uid())));

drop policy if exists "dono via lead" on public.lh_interacoes;
create policy "dono via lead" on public.lh_interacoes for all to authenticated
  using (exists (select 1 from public.lh_leads l
                 join public.lh_projetos p on p.id = l.projeto_id
                 where l.id = lh_interacoes.lead_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lh_leads l
                 join public.lh_projetos p on p.id = l.projeto_id
                 where l.id = lh_interacoes.lead_id and p.user_id = (select auth.uid())));
