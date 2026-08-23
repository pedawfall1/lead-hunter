# 🎯 Lead Hunter

Ferramenta de prospecção de clientes para agências de marketing.
Projetos → leads em kanban → abordagem via WhatsApp com template pronto.

**Stack:** Next.js 14 (App Router) · Supabase (Postgres + Auth) · Tailwind CSS · Deploy na Vercel.

---

## 🚀 Rodar agora, sem configurar nada (modo demo)

```bash
npm install
npm run dev
```

Sem `.env.local`, o app entra em **modo demo**: login com qualquer email, três
projetos de exemplo (Advogados - Videira, Petshops - Caçador, Restaurantes -
Fraiburgo), 20 leads espalhados pelas colunas e três templates. Dá pra arrastar
card, importar CSV, editar lead e montar a mensagem do WhatsApp — tudo funciona.

Os dados vivem na memória do processo: reiniciar o servidor volta ao estado
inicial, e nada sai da sua máquina. Para forçar o demo mesmo com Supabase
configurado, use `NEXT_PUBLIC_DEMO=1`.

O único botão que continua parado é o "Buscar no Google Maps" — é o gancho da
Places API, ainda desabilitado de propósito.

---

## Rodar pra valer (com Supabase)

### 1. Subir o banco

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e rode.
   Isso cria `projetos`, `leads`, `templates_mensagem`, o enum de status, o trigger de
   `atualizado_em`, as policies de RLS e dois templates de exemplo.

### 2. Criar o usuário admin

**Authentication → Users → Add user** → email + senha → marque *Auto Confirm User*.
Não existe tela de cadastro no app: o acesso é só por esse usuário.

> Em **Authentication → Providers → Email**, deixe *Enable email provider* ligado e
> *Confirm email* desligado (ou confirme o usuário na mão) para o login funcionar de primeira.

### 3. Rodar local

```bash
npm install
cp .env.local.example .env.local   # preencha as duas chaves
npm run dev
```

As chaves estão em **Project Settings → API**:

| Variável | Onde achar |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |

### 4. Deploy na Vercel

1. Suba o repo no GitHub e importe na Vercel (framework detectado automaticamente).
2. Em **Settings → Environment Variables**, adicione as mesmas duas variáveis.
3. Deploy. Não precisa de mais nada — todo o backend é Supabase.

---

## Telas

| Rota | O que faz |
| --- | --- |
| `/login` | Email + senha (Supabase Auth). O middleware protege todo o resto. |
| `/` | Dashboard: total de leads, leads sem site, taxa de resposta, taxa de fechamento, gráfico por status e filtro por projeto. |
| `/projetos` | Lista de projetos com contagem de leads, criar / editar / excluir. |
| `/projetos/[id]` | Kanban de leads do projeto, com drag and drop, busca, filtro "sem site", importação de CSV e cadastro manual. |
| `/templates` | CRUD de templates com prévia da mensagem preenchida. |

### Métricas do dashboard

- **Taxa de resposta** = (respondeu + negociando + fechou) ÷ (contatado + respondeu + negociando + fechou)
- **Taxa de fechamento** = fechou ÷ total de leads

`descartado` fica fora do denominador da taxa de resposta: um lead pode ser descartado
antes de qualquer contato.

## Importação de CSV

Colunas esperadas (a ordem não importa, o cabeçalho é reconhecido por nome):

```csv
nome,telefone,endereco,tem_site,instagram
Advocacia Silva,49999887766,"Rua Brasil, 120 - Centro, Videira - SC",nao,@advocaciasilva
```

- Separador `,` ou `;` (Excel brasileiro) — detectado automaticamente.
- `tem_site` aceita `sim/nao`, `true/false`, `1/0` ou a própria URL do site.
- Sinônimos aceitos no cabeçalho: `empresa` (nome), `celular`/`whatsapp`/`fone` (telefone),
  `site`/`website` (tem_site), `insta`/`ig` (instagram).
- Todo lead importado entra como **Novo**. Há uma prévia antes de confirmar.

## WhatsApp

O botão **Enviar WhatsApp** monta um link `https://wa.me/<telefone>?text=<mensagem>`:
abre o WhatsApp com o texto pronto e **você** dá o último clique de enviar.

- Não existe envio em massa nem API de disparo — é justamente o que queima número.
- O telefone é normalizado para `55 + DDD + número`.
- `{nome}` usa o nome do lead sem sufixos de razão social (Ltda, ME, EPP...).
- `{bairro}` sai do endereço do lead (segundo trecho, ex.: `Rua Brasil, 120 - Centro` → `Centro`);
  se o endereço não tiver bairro, cai na **região do projeto**.
- Ao abrir o WhatsApp, um lead que estava em **Novo** vira **Contatado** sozinho.
  Quem já respondeu/negociou/fechou não regride.

## Google Maps

O botão **Buscar no Google Maps** na tela de leads está desabilitado, com tooltip
"Em breve" — é o ponto de entrada da futura integração com a Google Places API.

---

## Estrutura

```
src/
  app/
    (app)/                    # área logada (layout com sidebar + bottom nav)
      page.tsx                # dashboard
      projetos/page.tsx
      projetos/[id]/page.tsx  # kanban
      templates/page.tsx
    actions/                  # server actions (auth, projetos, leads, templates)
    login/
  components/
    leads/                    # kanban, cards, modais, importação
    projetos/  templates/  dashboard/  ui/
  lib/
    supabase/                 # clients de server e middleware
    demo/dados.ts             # base ficticia do modo demo
    db.ts                     # camada de dados: demo ou Supabase
    config.ts  csv.ts  format.ts  status.ts  types.ts
middleware.ts                 # renova a sessão e bloqueia rotas privadas
supabase/schema.sql
```

## Multi-usuário no futuro

As tabelas `projetos` e `templates_mensagem` já têm `user_id` com default `auth.uid()`.
Hoje as policies liberam tudo para qualquer usuário autenticado. Para isolar por conta,
rode o bloco comentado no fim de `supabase/schema.sql` — a aplicação não precisa mudar.

## Próximos passos (quando estiver no PC)

1. Plugar a Google Places API no botão "Buscar no Google Maps".
2. Avaliar envio semi-automático via Evolution API, com limite diário por número.
