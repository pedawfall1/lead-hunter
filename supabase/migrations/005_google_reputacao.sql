-- =====================================================================
-- Lead Hunter — nota e avaliacoes do Google no lead
--
-- Esses dois numeros ja chegavam na busca do Maps, viravam os sinais
-- nota_baixa / poucas_avaliacoes e eram jogados fora. Guardando, a demo
-- de site ganha prova social DE VERDADE ("4,8 no Google, 127 avaliacoes")
-- em vez de numero inventado — que e justamente o que o prompt proibe a
-- LLM de escrever.
--
-- Rode em: Supabase -> SQL Editor -> New query -> Run
-- =====================================================================

alter table public.lh_leads add column if not exists google_nota        numeric(2,1);
alter table public.lh_leads add column if not exists google_avaliacoes  integer;
