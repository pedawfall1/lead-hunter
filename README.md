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
   Isso cria `lh_projetos`, `lh_leads`, `lh_interacoes`, `lh_templates_mensagem`,
   os enums, o trigger de `atualizado_em` e as policies de RLS.

   As tabelas usam o prefixo `lh_` porque o projeto Supabase em uso é
   compartilhado com outros sistemas. Para mudar o prefixo, altere o objeto `T`
   no topo de [`src/lib/db.ts`](src/lib/db.ts) — é o único lugar que nomeia tabela.

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
| `/hoje` | Agenda de retornos: atrasados, hoje e próximos 7 dias, com WhatsApp direto e botões de adiar. |
| `/` | Painel: total de leads, qualificados, taxa de resposta, taxa de fechamento, gráfico por status e filtro por projeto. |
| `/projetos` | Lista de projetos com contagem de leads, criar / editar / excluir. |
| `/projetos/[id]` | Kanban de leads do projeto, com drag and drop, busca, filtro por sinal de qualificação, importação de CSV e cadastro manual. |
| `/templates` | CRUD de templates com prévia da mensagem preenchida. |

## Serviço e sinais de qualificação

Cada projeto guarda **o que você vende** (`servico`) e a lista de **sinais que
qualificam** um lead para aquilo (`criterios`). O lead marca quais sinais dispara
(`sinais`). Isso é o que faz o app servir para site, tráfego, social mídia e
aplicações — e não só para "quem não tem site".

Os sinais aparecem como etiqueta no card, viram filtro no quadro e alimentam a
variável `{motivo}` da mensagem. O catálogo de serviços e sinais está em
[`src/lib/servicos.ts`](src/lib/servicos.ts); os critérios são **copiados** para
dentro do projeto na criação, então dá pra editar por projeto sem mexer no código.

## Histórico e agenda

Cada lead tem uma linha do tempo de interações (WhatsApp, ligação, visita,
e-mail, nota). O botão de WhatsApp registra sozinho, promove quem estava em
"Novo" para "Contatado" e agenda o próximo retorno pela cadência
(3 → 7 → 14 → 30 dias, conforme o número de toques). Os retornos aparecem em
`/hoje` com um contador no menu.

### Métricas do dashboard

- **Leads qualificados** = leads que disparam ao menos um critério do projeto
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
- `{servico}` é o serviço do projeto ("social mídia", "tráfego pago"...).
- `{motivo}` é o primeiro sinal ativo virado frase: `sem_site` → "não encontrei o
  site de vocês", `parado_30d` → "o Instagram de vocês está parado faz um tempo".
  É o que faz o mesmo template servir para qualquer serviço.
- Ao abrir o WhatsApp, um lead que estava em **Novo** vira **Contatado** sozinho.
  Quem já respondeu/negociou/fechou não regride.

## Integração com n8n (opcional)

O Lead Hunter decide **quem** abordar, **com que texto** e **quando**. Quem envia
é o seu n8n, pela Evolution. Assim o timer, a fila e a conexão ficam onde já
funcionam, e o app ganha de volta o dado que o `wa.me` nunca dá: entrega,
leitura e resposta.

Sem `N8N_WEBHOOK_URL` configurada o botão nem aparece e o app segue no `wa.me`.

### Variáveis

| Variável | Para quê |
| --- | --- |
| `N8N_WEBHOOK_URL` | webhook do seu fluxo que recebe o disparo |
| `N8N_TOKEN` | vai no header `x-lh-token` quando o app chama o n8n |
| `LH_WEBHOOK_TOKEN` | exigido no header `x-lh-token` quando o n8n chama de volta |
| `SUPABASE_SERVICE_ROLE_KEY` | o callback chega sem sessão e grava pelo dono do lead |

Nenhuma tem `NEXT_PUBLIC_`: são segredos e ficam só no servidor. A
`service_role` ignora RLS — ela é usada apenas em `src/app/api/n8n/route.ts`.

### O que o app manda para o n8n

`POST` no `N8N_WEBHOOK_URL`, header `x-lh-token`:

```json
{
  "interacao_id": "5addd9cd-...",
  "lead_id": "1f728c5e-...",
  "projeto_id": "acce6fc9-...",
  "telefone": "5549998770033",
  "nome": "Cão & Cia",
  "mensagem": "Oi Cão & Cia, tudo bem? Vi que vocês atendem aqui no Berger...",
  "template_id": "42f61df4-...",
  "projeto": "Petshops - Caçador",
  "servico": "Social mídia"
}
```

O `telefone` já vem normalizado (DDI + DDD + número, só dígitos) e a `mensagem`
já vem com as variáveis preenchidas e a variação sorteada — o n8n não precisa
montar nada, só enviar.

Guarde o `interacao_id`: é por ele que os eventos voltam para a linha certa do
histórico. Se o fluxo responder `{"externo_id": "..."}`, o app guarda o id da
Evolution também.

### O que o n8n devolve

`POST` em `https://seu-app/api/n8n`, header `x-lh-token: LH_WEBHOOK_TOKEN`:

```json
{ "evento": "resposta", "interacao_id": "5addd9cd-...", "texto": "opa, me manda" }
```

| Evento | O que o app faz |
| --- | --- |
| `entregue` | marca a hora de entrega na interação |
| `lido` | marca a hora de leitura (aparece ✓✓ no histórico) |
| `resposta` | registra a fala do lead, muda o status para **respondeu** e joga o lead para hoje |
| `falha` | anota o erro na interação, sem mexer no status |
| `bloqueado` | põe o número no **não perturbe** e descarta o lead |

Para achar o lead ele tenta, nessa ordem: `interacao_id`, `externo_id`,
`telefone`. Lead não encontrado devolve `200` de propósito, para o n8n não ficar
retentando à toa.

Confira a configuração sem disparar nada:

```bash
curl https://seu-app/api/n8n
```

### Lista de não perturbe

Quem manda "para", "não quero" ou bloqueia entra na tabela `lh_nao_perturbe`,
que vale para **todos os projetos**. Antes de enfileirar qualquer disparo o app
consulta essa lista e recusa o envio. Mande o evento `bloqueado` do n8n quando
detectar esse tipo de resposta.

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
    api/n8n/route.ts          # callback do n8n (entregue, lido, resposta...)
  components/
    leads/                    # kanban, cards, modais, importação
    projetos/  templates/  dashboard/  ui/
  lib/
    supabase/                 # clients de server e middleware
    demo/dados.ts             # base fictícia do modo demo
    db.ts                     # camada de dados: demo ou Supabase
    servicos.ts               # catálogo de serviços e sinais de qualificação
    agenda.ts                 # cadência e baldes de retorno
    n8n.ts                    # contrato de ida e volta com o n8n
    supabase/admin.ts         # service_role, só para o webhook
    config.ts  csv.ts  format.ts  status.ts  types.ts
middleware.ts                 # renova a sessão e bloqueia rotas privadas
supabase/
  schema.sql                  # instalação nova
  migrations/001_*.sql        # a mesma criação, como registro do que foi aplicado
```

## Isolamento por conta

O RLS já é por dono: cada linha pertence a quem a criou (`user_id = auth.uid()`),
e `lh_leads` / `lh_interacoes` herdam o dono via projeto. Isso importa porque o
projeto Supabase é compartilhado — sem essas policies, um usuário de outro
sistema do mesmo projeto leria os leads.

Efeito colateral bom: multi-usuário já funciona. Adicionar uma segunda conta é
criar o usuário no painel do Supabase; nada muda no código.

## Próximos passos (quando estiver no PC)

1. Plugar a Google Places API no botão "Buscar no Google Maps" — ela devolve
   `website`, `rating` e `user_ratings_total`, que já preenchem os sinais sozinhos.
2. Fila de disparo do dia, valor por lead e desempenho por template.
3. Avaliar envio semi-automático via Evolution API, com limite diário por número.
