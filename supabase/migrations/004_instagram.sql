-- =====================================================================
-- Lead Hunter — analise de perfil do Instagram
--
-- Fecha um buraco antigo: o catalogo em servicos.ts ja declarava
-- parado_30d, poucos_seguidores e so_linktree, mas ninguem preenchia —
-- o Google Maps nao sabe nada disso.
--
-- Fica no proprio lead, sem tabela nova: e um perfil por lead, lido de
-- vez em quando, e uma tabela 1:1 so acrescentaria um join.
-- Rode em: Supabase -> SQL Editor -> New query -> Run
-- =====================================================================

-- ig_dados  = o perfil normalizado (seguidores, bio, posts, engajamento),
--             como `PerfilInstagram` em src/lib/instagram.ts
-- ig_run_id = corrida do Apify em andamento. Raspagem leva mais que uma
--             funcao serverless vive, entao a tela vai conferindo — mesmo
--             vaivem de lh_buscas. Volta a null quando termina.
-- ig_bruto  = o primeiro item como veio do scraper. E a unica forma de
--             saber depois se um campo faltou porque o actor nao trouxe ou
--             porque o normalizador perdeu no caminho.
-- ig_erro   = o recado do Apify quando a corrida falha, para a tela poder
--             dizer o que houve em vez de so nao acontecer nada
alter table public.lh_leads add column if not exists ig_dados  jsonb;
alter table public.lh_leads add column if not exists ig_run_id text;
alter table public.lh_leads add column if not exists ig_em     timestamptz;
alter table public.lh_leads add column if not exists ig_erro   text;
alter table public.lh_leads add column if not exists ig_bruto  jsonb;

-- Quem ainda tem corrida aberta: a tela consulta isso ao abrir o lead.
create index if not exists lh_leads_ig_run_idx
  on public.lh_leads (ig_run_id)
  where ig_run_id is not null;
