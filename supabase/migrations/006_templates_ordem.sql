-- =====================================================================
-- Lead Hunter — ordem dos templates de mensagem
--
-- O primeiro template da lista e o que abre selecionado na aba WhatsApp
-- do lead. Ordenando por criacao, o follow-up mais recente aparecia na
-- frente da primeira abordagem.
-- =====================================================================

alter table public.lh_templates_mensagem
  add column if not exists ordem integer not null default 0;

-- Numera os que ja existem pela ordem atual (criacao), para ninguem
-- comecar empatado em zero. O passo de 10 deixa espaco pra inserir no
-- meio sem renumerar tudo.
with numerados as (
  select id, row_number() over (order by criado_em) * 10 as n
  from public.lh_templates_mensagem
)
update public.lh_templates_mensagem t
   set ordem = numerados.n
  from numerados
 where numerados.id = t.id
   and t.ordem = 0;

create index if not exists lh_templates_ordem_idx
  on public.lh_templates_mensagem (user_id, ordem);
