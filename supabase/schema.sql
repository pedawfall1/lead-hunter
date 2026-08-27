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

  if not exists (select 1 from pg_type where typname = 'lh_interacao_direcao') then
    create type lh_interacao_direcao as enum ('saida', 'entrada');
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
  email           text,
  -- identidade da ficha do Google, usada para deduplicar a busca no Maps
  place_id        text,
  -- de onde o lead veio: 'manual', 'csv' ou 'mapa'
  origem          text not null default 'manual',
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
-- direcao    = "saida" (voce mandou) ou "entrada" (o lead respondeu)
-- externo_id = id da mensagem na Evolution, quando o disparo passa pelo n8n
-- entregue_em / lido_em = o que o link wa.me nunca devolve
create table if not exists public.lh_interacoes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.lh_leads(id) on delete cascade,
  tipo        lh_interacao_tipo not null default 'nota',
  direcao     lh_interacao_direcao not null default 'saida',
  texto       text,
  template_id uuid references public.lh_templates_mensagem(id) on delete set null,
  externo_id  text,
  entregue_em timestamptz,
  lido_em     timestamptz,
  erro        text,
  criado_em   timestamptz not null default now()
);

-- ---------- buscas no Google Maps ----------
-- Raspagem leva minutos e funcao serverless morre antes, entao a corrida
-- fica registrada aqui e a tela vai conferindo de tempos em tempos. Fechar
-- a janela nao perde a corrida.
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

-- ---------- lista de nao perturbe ----------
-- Vale para TODOS os projetos do dono: quem pediu para parar pediu para a
-- agencia, nao para uma campanha. Por isso a unicidade e (user_id, telefone)
-- e nao passa por projeto.
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

create index if not exists lh_leads_projeto_id_idx      on public.lh_leads (projeto_id);
create index if not exists lh_leads_status_idx          on public.lh_leads (status);
create index if not exists lh_leads_proximo_contato_idx on public.lh_leads (proximo_contato);
create index if not exists lh_leads_sinais_idx          on public.lh_leads using gin (sinais);
create index if not exists lh_leads_telefone_idx        on public.lh_leads (telefone) where telefone is not null;
create index if not exists lh_interacoes_lead_id_idx    on public.lh_interacoes (lead_id, criado_em desc);
create index if not exists lh_projetos_user_id_idx      on public.lh_projetos (user_id);
create index if not exists lh_buscas_projeto_idx        on public.lh_buscas (projeto_id, criado_em desc);

-- O n8n devolve evento citando o id da Evolution: sem indice, cada callback
-- varre a tabela de interacoes inteira.
create index if not exists lh_interacoes_externo_id_idx
  on public.lh_interacoes (externo_id)
  where externo_id is not null;

-- Ultima linha de defesa contra duplicata: rodar a mesma busca duas vezes
-- nao pode gerar dois cards do mesmo lugar. Parcial porque lead digitado na
-- mao e lead de CSV nao tem place_id, e varios nulos colidiriam.
create unique index if not exists lh_leads_projeto_place_idx
  on public.lh_leads (projeto_id, place_id)
  where place_id is not null;

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
alter table public.lh_buscas             enable row level security;
alter table public.lh_nao_perturbe       enable row level security;

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

-- =====================================================================
-- Demos de site geradas por LLM. Ver migrations/002_demos.sql para o
-- porque de cada decisao; aqui fica so a criacao.
-- =====================================================================
create table if not exists public.lh_demos (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.lh_leads(id) on delete cascade,
  projeto_id      uuid not null references public.lh_projetos(id) on delete cascade,
  slug            text not null unique,
  titulo          text not null,
  conteudo        jsonb not null default '{}'::jsonb,
  html            text not null,
  modelo          text,
  tokens_entrada  integer not null default 0,
  tokens_saida    integer not null default 0,
  publicado       boolean not null default true,
  criado_em       timestamptz not null default now()
);

create index if not exists lh_demos_lead_idx on public.lh_demos (lead_id);

alter table public.lh_demos enable row level security;

drop policy if exists "dono via projeto" on public.lh_demos;
create policy "dono via projeto" on public.lh_demos for all to authenticated
  using (exists (select 1 from public.lh_projetos p
                 where p.id = lh_demos.projeto_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lh_projetos p
                 where p.id = lh_demos.projeto_id and p.user_id = (select auth.uid())));

-- Leitura publica, e SO ela: o cliente abre o link da proposta sem login.
-- Deliberado. Expoe apenas o HTML de uma demo que voce mesmo mandou, e so
-- enquanto publicado = true. O slug aleatorio e a fechadura.
drop policy if exists "publicada e publica" on public.lh_demos;
create policy "publicada e publica" on public.lh_demos for select to anon
  using (publicado = true);

-- ---------- analise de Instagram no lead ----------
-- ig_dados  = o perfil normalizado (seguidores, bio, posts, engajamento),
--             como `PerfilInstagram` em src/lib/instagram.ts
-- ig_run_id = corrida do Apify em andamento; volta a null quando termina
alter table public.lh_leads add column if not exists ig_dados  jsonb;
alter table public.lh_leads add column if not exists ig_run_id text;
alter table public.lh_leads add column if not exists ig_em     timestamptz;
alter table public.lh_leads add column if not exists ig_erro   text;
alter table public.lh_leads add column if not exists ig_bruto  jsonb;

create index if not exists lh_leads_ig_run_idx
  on public.lh_leads (ig_run_id)
  where ig_run_id is not null;

-- ---------- reputacao no Google ----------
-- Chegam na busca do Maps, viram os sinais nota_baixa / poucas_avaliacoes e
-- agora ficam guardados: e a unica prova social VERDADEIRA que a demo de
-- site tem, num template onde a LLM e proibida de escrever numero.
alter table public.lh_leads add column if not exists google_nota        numeric(2,1);
alter table public.lh_leads add column if not exists google_avaliacoes  integer;

-- ---------- ordem dos templates ----------
-- Decide qual template abre selecionado na aba WhatsApp do lead. Antes a
-- ordem era a de criacao, o que colocava o follow-up mais novo na frente
-- da primeira abordagem.
alter table public.lh_templates_mensagem
  add column if not exists ordem integer not null default 0;

create index if not exists lh_templates_ordem_idx
  on public.lh_templates_mensagem (user_id, ordem);
