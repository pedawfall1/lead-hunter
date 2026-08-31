-- 010 — Estrutura para três frentes: fila de disparo, mapa e conteúdo do site.
--
-- Só colunas. A lógica de cada frente entra depois, em paralelo, sem as três
-- brigarem pelos mesmos arquivos.

-- Fila de disparo: quantas mensagens por dia e em que janela de horário.
-- Não existe tabela de log — lh_interacoes já registra cada disparo com
-- criado_em, e dá para contar o dia a partir dela. Falta só o teto de cada
-- pessoa: número banido pelo WhatsApp é o risco real da operação.
alter table public.lh_conexoes
  add column if not exists teto_diario integer not null default 40,
  add column if not exists janela_inicio time not null default '09:00',
  add column if not exists janela_fim time not null default '20:00';

-- Coordenadas do lead, para o mapa. Geocodificar por nome+endereço erra
-- quando o endereço traz "Edifício X, sala Y" — vale gravar mesmo sem o
-- scraper próprio de coordenadas.
alter table public.lh_leads
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Conteúdo do site do lead, lido para alimentar a demo e a abordagem.
alter table public.lh_leads
  add column if not exists site_conteudo jsonb,
  add column if not exists site_em timestamptz,
  add column if not exists site_erro text;
