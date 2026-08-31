# Lead Hunter — regras para agentes

App de prospecção de clientes de uma agência do interior de Santa Catarina.
Quatro vendedores usam isto todo dia para achar negócios locais, gerar uma
demo de site e abordar pelo WhatsApp.

Não é protótipo. Está em produção, com dados reais de clientes reais.

## Idioma

**Tudo em português do Brasil**: código, nomes de variável, comentários,
mensagens de commit, textos de interface. `criarLeadDb`, não `createLead`.

Exceção única: termos que não têm tradução usada no dia a dia (`webhook`,
`commit`, `build`).

## Comentários

Comente o **porquê**, nunca o **o quê**. O código já diz o que faz.

```ts
// Ruim: incrementa o contador
// Bom: o Google devolve o link do Maps no lugar do site quando o negócio
// não tem página própria — guardar isso faria a demo raspar o Google.
```

Comentário bom explica uma decisão, um risco, ou algo que morderia quem
mexesse ali depois. Se não há nada disso, não comente.

## Antes de reportar que terminou

Rode os três, nessa ordem, e só reporte com os três limpos:

```bash
npx tsc --noEmit
npx next lint
npm run build
```

Falhou qualquer um, o trabalho não terminou.

## Você não commita

Este projeto trabalha em ondas paralelas. Implementadores **implementam e
reportam quais arquivos tocaram**. Quem commita é a orquestradora, em série.

Se você commitar por conta própria, cria conflito com os outros agentes
trabalhando ao mesmo tempo.

Também: **nunca toque num arquivo fora do seu escopo**. Se precisar,
pare e avise — não edite.

## Armadilhas deste repo

**`SEM_ENRIQUECIMENTO` (`src/lib/db.ts`) e `SEM_INSTAGRAM`
(`src/lib/demo/dados.ts`)** são espalhados com spread ao montar um `Lead`
no modo demo. Campo novo em `Lead` precisa entrar nos dois, ou o `tsc`
quebra. Pior: em `dados.ts` o spread vem **depois** dos campos literais e
sobrescreve o que você definir antes dele.

**Policies do Supabase precisam ser `to authenticated`.** Elas chamam
`lh_minhas_equipes()`, uma função `SECURITY DEFINER` que `anon` não pode
executar. Uma policy `to public` faz o visitante que abre uma demo bater em
`permission denied for function` — ou seja, a página que o cliente recebe
para de abrir.

**`COLUNAS_LEAD` em `src/lib/db.ts`** é uma string com a lista de colunas.
Coluna nova no banco que não entrar ali simplesmente não chega no app, sem
erro nenhum.

## A regra que não se quebra

A demo de site é mostrada **ao dono do negócio**. Ela nunca inventa:

- número ("+500 clientes", "15 anos de mercado")
- depoimento com nome de pessoa
- prêmio, certificação, prazo ou preço

Um dado errado destrói a proposta antes da conversa começar. Só entra o que
veio dos dados do lead. Isso está no prompt em `src/lib/site/gerar.ts` —
leia antes de mexer em qualquer coisa de demo.

Corolário: nota do Google abaixo de 4,0 ou com menos de 5 avaliações **não
aparece** na demo. Não é esconder defeito, é não usar como argumento de
venda um número que argumenta contra o cliente.

## Mapa rápido

| Onde | O quê |
| --- | --- |
| `src/lib/db.ts` | toda conversa com o Supabase; as telas só falam com ele |
| `src/lib/types.ts` | tipos compartilhados |
| `src/lib/site/` | geração da demo: `gerar.ts` (LLM), `render.ts` (HTML), `paletas.ts` (cores e tipografia) |
| `src/lib/n8n.ts` | disparo de WhatsApp, via n8n |
| `src/lib/evolution.ts` | conexão do WhatsApp de cada vendedor |
| `src/app/actions/` | server actions; toda escrita passa por aqui |
| `supabase/migrations/` | uma migração por mudança, numerada |

A LLM da demo escreve **só JSON de conteúdo**, nunca HTML — é isso que faz
cada demo custar frações de centavo. `render.ts` monta a página. Não peça
HTML para a LLM.

## Banco

Projeto Supabase compartilhado com outros sistemas. Todas as tabelas daqui
têm prefixo `lh_`. Nunca mexa em tabela sem esse prefixo.

Migração é sempre aditiva e numerada em `supabase/migrations/`, e o mesmo
SQL vai para o fim de `supabase/schema.sql`.
