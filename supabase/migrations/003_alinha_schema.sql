-- =====================================================================
-- Lead Hunter — alinha o SQL versionado com o que o codigo ja usa
--
-- O 001 parou no app inicial. Depois vieram a busca no Google Maps, o
-- disparo pelo n8n e a lista de nao perturbe, e o SQL nao acompanhou: num
-- Supabase novo, `db.ts` quebrava ao tocar em qualquer um dos tres.
--
-- Tudo aqui e idempotente (if not exists / add column if not exists), entao
-- rodar num banco que ja recebeu essas mudancas na mao nao quebra nada.
-- Rode em: Supabase -> SQL Editor -> New query -> Run
-- =====================================================================

-- ---------- leads: contato e identidade do Google ----------
-- email    = vem do add-on de contatos do scraper
-- place_id = identidade da ficha do Google, usada para deduplicar busca
-- origem   = 'manual', 'csv' ou 'mapa'
alter table public.lh_leads add column if not exists email    text;
alter table public.lh_leads add column if not exists place_id text;
alter table public.lh_leads add column if not exists origem   text not null default 'manual';

create index if not exists lh_leads_telefone_idx
  on public.lh_leads (telefone)
  where telefone is not null;

-- Ultima linha de defesa contra duplicata: rodar a mesma busca duas vezes
-- nao pode gerar dois cards do mesmo lugar. Parcial porque lead digitado
-- na mao e lead de CSV nao tem place_id, e varios nulos colidiriam.
create unique index if not exists lh_leads_projeto_place_idx
  on public.lh_leads (projeto_id, place_id)
  where place_id is not null;

-- ---------- interacoes: o ciclo de vida do disparo ----------
-- direcao     = "saida" (voce mandou) ou "entrada" (o lead respondeu)
-- externo_id  = id da mensagem na Evolution, quando passa pelo n8n
-- entregue_em / lido_em = o que o wa.me nunca devolve
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lh_interacao_direcao') then
    create type lh_interacao_direcao as enum ('saida', 'entrada');
  end if;
end$$;

alter table public.lh_interacoes
  add column if not exists direcao     lh_interacao_direcao not null default 'saida';
alter table public.lh_interacoes
  add column if not exists externo_id  text;
alter table public.lh_interacoes
  add column if not exists entregue_em timestamptz;
alter table public.lh_interacoes
  add column if not exists lido_em     timestamptz;
alter table public.lh_interacoes
  add column if not exists erro        text;

-- O n8n devolve evento citando o id da Evolution: sem indice, cada callback
-- varre a tabela inteira.
create index if not exists lh_interacoes_externo_id_idx
  on public.lh_interacoes (externo_id)
  where externo_id is not null;

-- ---------- buscas no Google Maps ----------
-- Raspagem leva minutos e funcao serverless morre antes, entao a corrida
-- fica registrada aqui e a tela vai conferindo. Fechar a janela nao perde.
--
-- amostra = o primeiro item como veio do scraper. E o que responde depois
--           se um campo faltou porque o actor nao raspou ou porque o app
--           perdeu no caminho.
create table if not exists public.lh_buscas (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid not null references public.lh_projetos(id) on delete cascade,
  run_id        text not null,
  dataset_id    text,
  termo         text not null,
  local         text not null,
  limite        integer not null default 50,
  status        text not null default 'rodando'
                check (status in ('rodando', 'concluida', 'erro')),
  encontrados   integer not null default 0,
  inseridos     integer not null default 0,
  duplicados    integer not null default 0,
  qualificados  integer not null default 0,
  amostra       jsonb,
  erro          text,
  criado_em     timestamptz not null default now(),
  concluido_em  timestamptz
);

create index if not exists lh_buscas_projeto_idx
  on public.lh_buscas (projeto_id, criado_em desc);

-- ---------- lista de nao perturbe ----------
-- Vale para TODOS os projetos do dono: quem pediu para parar pediu para a
-- agencia, nao para uma campanha. Por isso a chave e (user_id, telefone) e
-- nao passa por projeto.
create table if not exists public.lh_nao_perturbe (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade default auth.uid(),
  telefone  text not null,
  motivo    text,
  criado_em timestamptz not null default now(),
  -- o upsert de db.ts usa onConflict "user_id,telefone": sem esta unique
  -- ele falha, e o mesmo numero entraria duas vezes na lista
  unique (user_id, telefone)
);

-- ---------- RLS ----------
alter table public.lh_buscas       enable row level security;
alter table public.lh_nao_perturbe enable row level security;

drop policy if exists "dono via projeto" on public.lh_buscas;
create policy "dono via projeto" on public.lh_buscas for all to authenticated
  using (exists (select 1 from public.lh_projetos p
                 where p.id = lh_buscas.projeto_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lh_projetos p
                 where p.id = lh_buscas.projeto_id and p.user_id = (select auth.uid())));

drop policy if exists "dono" on public.lh_nao_perturbe;
create policy "dono" on public.lh_nao_perturbe for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
