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
