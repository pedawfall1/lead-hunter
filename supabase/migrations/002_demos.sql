-- =====================================================================
-- Lead Hunter — demos de site geradas por LLM
--
-- Autossuficiente de proposito: depende so de lh_projetos e lh_leads.
-- Rode em: Supabase -> SQL Editor -> New query -> Run
-- =====================================================================

-- html      = a pagina inteira, ja renderizada. Fica gravada porque a rota
--             publica /demo/<slug> responde sem sessao: ela le UMA linha e
--             serve, sem chegar perto de lh_leads.
-- conteudo  = o JSON que a LLM escreveu, guardado para re-renderizar depois
--             sem gastar token de novo.
-- tokens_*  = o custo real daquela demo, para voce medir em vez de estimar.
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

-- Dono via projeto, igual lh_leads: o Supabase e compartilhado com outros
-- sistemas, entao "qualquer autenticado" deixaria outro sistema ler as
-- propostas.
drop policy if exists "dono via projeto" on public.lh_demos;
create policy "dono via projeto" on public.lh_demos for all to authenticated
  using (exists (select 1 from public.lh_projetos p
                 where p.id = lh_demos.projeto_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lh_projetos p
                 where p.id = lh_demos.projeto_id and p.user_id = (select auth.uid())));

-- Leitura publica, e SO ela: o cliente abre o link sem login.
--
-- Isto e deliberado, nao descuido. O que expoe e apenas o HTML de uma
-- proposta que voce mesmo mandou pro cliente, e so enquanto publicado=true.
-- O slug tem 8 caracteres aleatorios justamente porque ele e a unica
-- fechadura: sem isso, /demo/<nome-do-negocio> seria adivinhavel.
--
-- Repare que a policy nao da select em lh_leads: a rota publica nunca toca
-- naquela tabela.
drop policy if exists "publicada e publica" on public.lh_demos;
create policy "publicada e publica" on public.lh_demos for select to anon
  using (publicado = true);
