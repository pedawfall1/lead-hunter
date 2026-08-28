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
