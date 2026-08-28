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

-- 007 — Equipe: mais de uma pessoa vendendo na mesma carteira.
--
-- Até aqui cada tabela era do "dono" (user_id = auth.uid()). Para dois
-- vendedores trabalharem os mesmos leads, a posse passa a ser da EQUIPE, e
-- user_id vira só o registro de quem criou.
--
-- Aplicada no banco em partes (lh_equipes, lh_equipe_nas_tabelas,
-- lh_rls_por_equipe, lh_policies_equipe_só_authenticated,
-- lh_equipe_id_default); aqui vai o resultado consolidado.

create table if not exists public.lh_equipes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

create table if not exists public.lh_membros (
  equipe_id uuid not null references public.lh_equipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 'dono' pode convidar e remover; 'vendedor' só trabalha os leads
  papel text not null default 'vendedor' check (papel in ('dono','vendedor')),
  criado_em timestamptz not null default now(),
  primary key (equipe_id, user_id)
);

create index if not exists lh_membros_user on public.lh_membros(user_id);

-- SECURITY DEFINER de propósito: sem isso a policy de lh_membros
-- consultaria lh_membros e o Postgres entraria em recursão de RLS.
create or replace function public.lh_minhas_equipes()
returns setof uuid
language sql stable security definer set search_path = public
as $fn$
  select equipe_id from public.lh_membros where user_id = auth.uid()
$fn$;

-- A equipe de quem está inserindo, para servir de DEFAULT.
create or replace function public.lh_minha_equipe()
returns uuid
language sql stable security definer set search_path = public
as $fn$
  select equipe_id from public.lh_membros
  where user_id = auth.uid() order by criado_em limit 1
$fn$;

revoke all     on function public.lh_minhas_equipes() from public;
revoke execute on function public.lh_minhas_equipes() from anon;
grant  execute on function public.lh_minhas_equipes() to authenticated;

revoke all     on function public.lh_minha_equipe() from public;
revoke execute on function public.lh_minha_equipe() from anon;
grant  execute on function public.lh_minha_equipe() to authenticated;

/* --------------------------- a posse muda --------------------------- */

alter table public.lh_projetos           add column if not exists equipe_id uuid references public.lh_equipes(id) on delete cascade;
alter table public.lh_templates_mensagem add column if not exists equipe_id uuid references public.lh_equipes(id) on delete cascade;
alter table public.lh_nao_perturbe       add column if not exists equipe_id uuid references public.lh_equipes(id) on delete cascade;

-- Uma equipe por dono existente, e todo o acervo dele vai para ela.
do $mig$
declare u uuid; e uuid;
begin
  for u in
    select user_id from public.lh_projetos                 where equipe_id is null
    union select user_id from public.lh_templates_mensagem where equipe_id is null
    union select user_id from public.lh_nao_perturbe       where equipe_id is null
  loop
    select equipe_id into e from public.lh_membros where user_id = u limit 1;
    if e is null then
      insert into public.lh_equipes (nome) values ('Minha equipe') returning id into e;
      insert into public.lh_membros (equipe_id, user_id, papel) values (e, u, 'dono');
    end if;
    update public.lh_projetos           set equipe_id = e where user_id = u and equipe_id is null;
    update public.lh_templates_mensagem set equipe_id = e where user_id = u and equipe_id is null;
    update public.lh_nao_perturbe       set equipe_id = e where user_id = u and equipe_id is null;
  end loop;
end $mig$;

alter table public.lh_projetos           alter column equipe_id set not null;
alter table public.lh_templates_mensagem alter column equipe_id set not null;
alter table public.lh_nao_perturbe       alter column equipe_id set not null;

-- `user_id` sempre teve `default auth.uid()`, e por isso os inserts do app
-- nunca precisaram mandar o dono. Sem um default equivalente, `equipe_id`
-- NOT NULL quebraria criar projeto e template.
alter table public.lh_projetos           alter column equipe_id set default public.lh_minha_equipe();
alter table public.lh_templates_mensagem alter column equipe_id set default public.lh_minha_equipe();
alter table public.lh_nao_perturbe       alter column equipe_id set default public.lh_minha_equipe();

create index if not exists lh_projetos_equipe    on public.lh_projetos(equipe_id);
create index if not exists lh_templates_equipe   on public.lh_templates_mensagem(equipe_id);
create index if not exists lh_naoperturbe_equipe on public.lh_nao_perturbe(equipe_id);

-- Quem cuida deste lead. Nulo = da equipe, ninguém pegou ainda.
alter table public.lh_leads add column if not exists responsavel_id uuid references auth.users(id) on delete set null;
alter table public.lh_leads alter column responsavel_id set default auth.uid();
create index if not exists lh_leads_responsavel on public.lh_leads(responsavel_id);

/* ------------------------------ policies ------------------------------
   Todas com `to authenticated`, e isso importa: com `to public` elas
   valeriam também para `anon`, que não pode executar lh_minhas_equipes() —
   o visitante que abrisse uma demo batia em "permission denied for
   function" e a página do cliente parava de abrir. Visitante só deve ser
   avaliado pela policy "publicada e pública".                          */

alter table public.lh_equipes enable row level security;
alter table public.lh_membros enable row level security;

drop policy if exists "minha equipe" on public.lh_equipes;
create policy "minha equipe" on public.lh_equipes for all to authenticated
  using      (id in (select public.lh_minhas_equipes()))
  with check (id in (select public.lh_minhas_equipes()));

drop policy if exists "colegas de equipe" on public.lh_membros;
create policy "colegas de equipe" on public.lh_membros for all to authenticated
  using      (equipe_id in (select public.lh_minhas_equipes()))
  with check (equipe_id in (select public.lh_minhas_equipes()));

drop policy if exists "dono"   on public.lh_projetos;
drop policy if exists "equipe" on public.lh_projetos;
create policy "equipe" on public.lh_projetos for all to authenticated
  using      (equipe_id in (select public.lh_minhas_equipes()))
  with check (equipe_id in (select public.lh_minhas_equipes()));

drop policy if exists "dono"   on public.lh_templates_mensagem;
drop policy if exists "equipe" on public.lh_templates_mensagem;
create policy "equipe" on public.lh_templates_mensagem for all to authenticated
  using      (equipe_id in (select public.lh_minhas_equipes()))
  with check (equipe_id in (select public.lh_minhas_equipes()));

-- Quem pediu para não receber não recebe de ninguém da equipe.
drop policy if exists "dono"   on public.lh_nao_perturbe;
drop policy if exists "equipe" on public.lh_nao_perturbe;
create policy "equipe" on public.lh_nao_perturbe for all to authenticated
  using      (equipe_id in (select public.lh_minhas_equipes()))
  with check (equipe_id in (select public.lh_minhas_equipes()));

drop policy if exists "dono via projeto"   on public.lh_leads;
drop policy if exists "equipe via projeto" on public.lh_leads;
create policy "equipe via projeto" on public.lh_leads for all to authenticated
  using      (exists (select 1 from public.lh_projetos p where p.id = lh_leads.projeto_id and p.equipe_id in (select public.lh_minhas_equipes())))
  with check (exists (select 1 from public.lh_projetos p where p.id = lh_leads.projeto_id and p.equipe_id in (select public.lh_minhas_equipes())));

drop policy if exists "dono via projeto"   on public.lh_demos;
drop policy if exists "equipe via projeto" on public.lh_demos;
create policy "equipe via projeto" on public.lh_demos for all to authenticated
  using      (exists (select 1 from public.lh_projetos p where p.id = lh_demos.projeto_id and p.equipe_id in (select public.lh_minhas_equipes())))
  with check (exists (select 1 from public.lh_projetos p where p.id = lh_demos.projeto_id and p.equipe_id in (select public.lh_minhas_equipes())));

drop policy if exists "dono via projeto"   on public.lh_buscas;
drop policy if exists "equipe via projeto" on public.lh_buscas;
create policy "equipe via projeto" on public.lh_buscas for all to authenticated
  using      (exists (select 1 from public.lh_projetos p where p.id = lh_buscas.projeto_id and p.equipe_id in (select public.lh_minhas_equipes())))
  with check (exists (select 1 from public.lh_projetos p where p.id = lh_buscas.projeto_id and p.equipe_id in (select public.lh_minhas_equipes())));

drop policy if exists "dono via lead"   on public.lh_interacoes;
drop policy if exists "equipe via lead" on public.lh_interacoes;
create policy "equipe via lead" on public.lh_interacoes for all to authenticated
  using      (exists (select 1 from public.lh_leads l join public.lh_projetos p on p.id = l.projeto_id where l.id = lh_interacoes.lead_id and p.equipe_id in (select public.lh_minhas_equipes())))
  with check (exists (select 1 from public.lh_leads l join public.lh_projetos p on p.id = l.projeto_id where l.id = lh_interacoes.lead_id and p.equipe_id in (select public.lh_minhas_equipes())));

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

-- 009 — Template volta a ser de cada um, e cada vendedor ganha o seu webhook.
--
-- Na 007 o template virou da equipe junto com o resto. Mas template é a voz
-- de quem escreve: um quer abordar do jeito dele e o outro do dele, e
-- compartilhado significaria um editando a copy que o outro está usando
-- naquele momento. Lead continua da equipe; a mensagem, não.
--
-- `equipe_id` fica na tabela: serve para saber de que equipe é o template
-- sem uma volta em auth.users, e é por ele que a cópia inicial se orienta.

drop policy if exists "equipe" on public.lh_templates_mensagem;
drop policy if exists "dono"   on public.lh_templates_mensagem;
create policy "dono" on public.lh_templates_mensagem for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Cada webhook aponta para um fluxo diferente do n8n, então o disparo de um
-- não cai na fila do outro.
--
-- Vive em lh_conexoes porque é a mesma pergunta que a instância responde:
-- "por onde a mensagem desta pessoa sai".
alter table public.lh_conexoes
  add column if not exists webhook_url text;

-- Quem entra na equipe começaria sem template nenhum, ou seja, sem nada
-- para trabalhar. Copia a copy do dono como ponto de partida; a partir daí
-- cada um edita a sua sem encostar na do outro.
--
-- Só para quem ainda não tem nenhum: rodar de novo não duplica.
insert into public.lh_templates_mensagem (nome, texto, user_id, equipe_id, ordem)
select t.nome, t.texto, m.user_id, t.equipe_id, t.ordem
from public.lh_templates_mensagem t
join public.lh_membros m
  on m.equipe_id = t.equipe_id and m.papel = 'vendedor'
join public.lh_membros dono
  on dono.equipe_id = t.equipe_id and dono.papel = 'dono' and dono.user_id = t.user_id
where not exists (
  select 1 from public.lh_templates_mensagem x where x.user_id = m.user_id
);
