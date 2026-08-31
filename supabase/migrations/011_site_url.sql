-- 011 — URL do site do lead.
--
-- A busca no mapa já lia bruto.website (mapas.ts), mas só usava para o
-- booleano temSite e jogava a URL fora. Sem ela salva, não tem como ler o
-- conteúdo do site depois. Cadastro manual e edição também passam a
-- preencher esta coluna.
alter table public.lh_leads
  add column if not exists site_url text;
