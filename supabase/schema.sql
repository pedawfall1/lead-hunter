-- =====================================================================
-- Lead Hunter - schema completo (instalação nova)
-- Rode em: Supabase -> SQL Editor -> New query -> Run
--
-- Já tem a v1 rodando? Não use este arquivo: rode
-- supabase/migrations/001_servico_sinais_interacoes.sql
-- =====================================================================

-- ---------- enums ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type lead_status as enum (
      'novo', 'contatado', 'respondeu', 'negociando', 'fechou', 'descartado'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'interacao_tipo') then
    create type interacao_tipo as enum (
      'whatsapp', 'ligacao', 'visita', 'email', 'nota'
    );
  end if;
end$$;

-- ---------- projetos ----------
-- servico  = o que este projeto está vendendo
-- criterios = os sinais que qualificam um lead para esse serviço,
--             copiados do catálogo na criação e editáveis por projeto:
--             [{"chave":"sem_site","label":"Não tem site"}, ...]
create table if not exists public.projetos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  nicho      text,
  regiao     text,
  servico    text,
  criterios  jsonb not null default '[]'::jsonb,
  criado_em  timestamptz not null default now(),
  -- Preparado para multi-usuario: hoje fica preenchido mas nao e usado para isolar.
  user_id    uuid references auth.users(id) on delete cascade default auth.uid()
);

-- ---------- leads ----------
-- sinais = quais critérios do projeto este lead dispara: {"sem_site": true}
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  projeto_id      uuid not null references public.projetos(id) on delete cascade,
  nome            text not null,
  telefone        text,
  endereco        text,
  instagram       text,
  sinais          jsonb not null default '{}'::jsonb,
  status          lead_status not null default 'novo',
  nota            text,
  proximo_contato date,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create index if not exists leads_projeto_id_idx      on public.leads (projeto_id);
create index if not exists leads_status_idx          on public.leads (status);
create index if not exists leads_proximo_contato_idx on public.leads (proximo_contato);
create index if not exists leads_sinais_idx          on public.leads using gin (sinais);

-- ---------- templates de mensagem ----------
create table if not exists public.templates_mensagem (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  texto     text not null,
  criado_em timestamptz not null default now(),
  user_id   uuid references auth.users(id) on delete cascade default auth.uid()
);

-- ---------- interações ----------
-- A história da negociação. O botão de WhatsApp registra sozinho.
create table if not exists public.interacoes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  tipo        interacao_tipo not null default 'nota',
  texto       text,
  template_id uuid references public.templates_mensagem(id) on delete set null,
  criado_em   timestamptz not null default now()
);

create index if not exists interacoes_lead_id_idx on public.interacoes (lead_id, criado_em desc);

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
alter table public.interacoes         enable row level security;
alter table public.templates_mensagem enable row level security;

drop policy if exists "auth full access" on public.projetos;
create policy "auth full access" on public.projetos
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access" on public.leads;
create policy "auth full access" on public.leads
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access" on public.interacoes;
create policy "auth full access" on public.interacoes
  for all to authenticated using (true) with check (true);

drop policy if exists "auth full access" on public.templates_mensagem;
create policy "auth full access" on public.templates_mensagem
  for all to authenticated using (true) with check (true);

-- ---------- seed opcional de templates ----------
insert into public.templates_mensagem (nome, texto)
select 'Primeira abordagem',
       'Oi {nome}, tudo bem? Vi que vocês atendem aqui no {bairro} e reparei que não encontrei o site de vocês. Trabalho ajudando negócios da região a aparecer no Google. Posso te mostrar rapidinho como ficaria?'
where not exists (select 1 from public.templates_mensagem);

insert into public.templates_mensagem (nome, texto)
select 'Follow-up 3 dias',
       'Oi {nome}, passando aqui de novo. Chegou a ver minha mensagem sobre a divulgação de vocês no {bairro}? Se fizer sentido eu te mando uma prévia sem compromisso.'
where not exists (select 1 from public.templates_mensagem where nome = 'Follow-up 3 dias');

-- =====================================================================
-- FUTURO: multi-usuario. Nao rode agora.
-- =====================================================================
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
--
-- drop policy if exists "auth full access" on public.interacoes;
-- create policy "dono via lead" on public.interacoes for all to authenticated
--   using (exists (select 1 from public.leads l join public.projetos p on p.id = l.projeto_id
--                  where l.id = interacoes.lead_id and p.user_id = auth.uid()))
--   with check (exists (select 1 from public.leads l join public.projetos p on p.id = l.projeto_id
--                  where l.id = interacoes.lead_id and p.user_id = auth.uid()));
