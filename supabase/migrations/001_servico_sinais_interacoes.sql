-- =====================================================================
-- Migração 001 — de "vender site" para vender qualquer serviço
--
-- Só rode se você já tinha a v1 no ar. Instalação nova usa schema.sql.
-- Não apaga nada: tem_site vira o sinal "sem_site" e a coluna some no fim.
-- =====================================================================

begin;

-- ---------- 1. projeto passa a saber o que vende ----------
alter table public.projetos add column if not exists servico   text;
alter table public.projetos add column if not exists criterios jsonb not null default '[]'::jsonb;

-- Projetos que já existem viram projetos de site, que era o que a v1 fazia.
update public.projetos
set servico = coalesce(servico, 'site'),
    criterios = case when criterios = '[]'::jsonb then
      '[{"chave":"sem_site","label":"Não tem site"},
        {"chave":"site_desatualizado","label":"Site desatualizado"},
        {"chave":"site_sem_whats","label":"Site sem WhatsApp"},
        {"chave":"sem_google_negocio","label":"Sem Google Meu Negócio"}]'::jsonb
    else criterios end;

-- ---------- 2. lead ganha sinais e data de retorno ----------
alter table public.leads add column if not exists sinais          jsonb not null default '{}'::jsonb;
alter table public.leads add column if not exists proximo_contato date;

-- tem_site = false  ->  sinais.sem_site = true
update public.leads
set sinais = sinais || jsonb_build_object('sem_site', true)
where coalesce(tem_site, false) = false
  and not (sinais ? 'sem_site');

alter table public.leads drop column if exists tem_site;

create index if not exists leads_proximo_contato_idx on public.leads (proximo_contato);
create index if not exists leads_sinais_idx          on public.leads using gin (sinais);

-- ---------- 3. histórico de interações ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'interacao_tipo') then
    create type interacao_tipo as enum ('whatsapp', 'ligacao', 'visita', 'email', 'nota');
  end if;
end$$;

create table if not exists public.interacoes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  tipo        interacao_tipo not null default 'nota',
  texto       text,
  template_id uuid references public.templates_mensagem(id) on delete set null,
  criado_em   timestamptz not null default now()
);

create index if not exists interacoes_lead_id_idx on public.interacoes (lead_id, criado_em desc);

alter table public.interacoes enable row level security;
drop policy if exists "auth full access" on public.interacoes;
create policy "auth full access" on public.interacoes
  for all to authenticated using (true) with check (true);

commit;
