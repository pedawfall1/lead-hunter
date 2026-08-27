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
   `lh_buscas`, `lh_nao_perturbe` e `lh_demos`, os enums, o trigger de
   `atualizado_em` e as policies de RLS. Instalação nova só precisa deste
   arquivo; banco antigo, ver as migrações em `supabase/migrations/`.

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
| `/` | Painel: funil de conversão, atividade no tempo, taxa de resposta por nicho e por template, mapa de ritmo e sinais mais frequentes. Filtro por período e projeto. |
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

### Métricas do painel

- **Leads qualificados** = leads que disparam ao menos um critério do projeto
- **Taxa de resposta** = (respondeu + negociando + fechou) ÷ (contatado + respondeu + negociando + fechou)
- **Taxa de fechamento** = fechou ÷ total de leads
- **Funil** é cumulativo: quem está em "fechou" também contou em todas as etapas anteriores
- **Desempenho por template** conta **por lead**, não por mensagem: dos leads que
  receberam aquele texto, quantos responderam. Atribuir só ao último disparo antes
  da resposta parece justo mas mede cadência, não texto — quem sempre faz follow-up
  deixaria o template de abertura eternamente em 0%.
- **Ritmo de prospecção** sempre mostra 12 semanas, ignorando o filtro de período

`descartado` fica fora do denominador da taxa de resposta: um lead pode ser descartado
antes de qualquer contato.

As cores dos gráficos foram validadas para daltonismo sobre a superfície escura
(`#111823`): o par laranja/azul da série temporal tem ΔE 23,4 em protanopia e 34,4
em tritanopia. Categorias nominais (projeto, template) usam **uma cor só** — colorir
por valor gastaria o canal de identidade repetindo o que o comprimento da barra
já diz.

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
- `{demo}` vira o link da demo de site publicada mais recente do lead. Demo
  fora do ar não entra — o link levaria a uma página que não existe mais. A
  tela avisa se o template usa a variável e o lead ainda não tem demo, para
  o cliente não receber um `{demo}` cru.
- Ao abrir o WhatsApp, um lead que estava em **Novo** vira **Contatado** sozinho.
  Quem já respondeu/negociou/fechou não regride.

## Copy de prospecção

Os textos de abordagem vivem em [`src/lib/copy.ts`](src/lib/copy.ts) e são
semeados no modo demo. No Supabase eles ficam em `lh_templates_mensagem` e
são editáveis na tela de Templates — o arquivo é o ponto de partida, não a
fonte da verdade.

São onze: primeira abordagem, duas respostas (positiva e desconfiança),
quatro objeções (preço, já tem quem cuida, só usa Instagram, é golpe?) e a
cadência de silêncio em 3 → 7 → 14 → 30 dias, que é a mesma cadência que
`agenda.ts` agenda sozinha.

A lógica da abordagem: **não é pergunta, é entrega**. Em vez de "tem
interesse em um site?", vai o link de um site que já existe, com o nome e os
dados do negócio. Por isso a primeira mensagem usa `{demo}` — e a aba
WhatsApp avisa quando o template pede a variável e o lead ainda não tem demo
publicada.

Os números que aparecem nas objeções (R$ 90/mês, 7 dias de prazo, 7 dias de
garantia) são promessas comerciais, não algo que o sistema calcula. Se
mudarem, mude no arquivo e nos templates já salvos.

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

## Google Maps via Apify

O botão **Buscar no Google Maps** chama o Apify direto do servidor do app —
não passa pelo n8n. A chave fica só no servidor.

```
APIFY_TOKEN=apify_api_...
# APIFY_ACTOR=compass~crawler-google-places   (padrão)
```

Sem `APIFY_TOKEN` o botão fica desabilitado.

### Por que em duas etapas

Raspagem leva de um a cinco minutos e função serverless morre antes disso. Por
isso o app **inicia a corrida e guarda o `run_id`** na tabela `lh_buscas`; a
tela vai conferindo de cinco em cinco segundos. Você pode fechar a janela, sair
do projeto e voltar depois — a corrida continua no Apify e o quadro mostra um
aviso de "buscando..." enquanto ela não termina.

Quando o Apify conclui, o app baixa o dataset, normaliza, importa e fecha o
registro. Conferir de novo depois disso é barato: não reimporta nada.

### O que a busca preenche sozinha

| Achado | Vira o sinal |
| --- | --- |
| sem `website` | `sem_site` |
| sem `website` mas com Instagram | `so_linktree` |
| e-mail encontrado | preenche o campo de e-mail do lead |
| sem Instagram | `sem_instagram` |
| sem `placeId` | `sem_google_negocio` |
| `imagesCount` igual a zero | `gmn_sem_foto` |
| nota abaixo de 4 | `nota_baixa` |
| menos de 10 avaliações | `poucas_avaliacoes` |

Só é marcado o critério que o **projeto** usa: um projeto de site não ganha
"sem Instagram" só porque o dado veio na resposta. Um link do próprio Google
Maps no campo `website` não conta como ter site.

### As opções do actor

O actor de Google Maps tem uma dezena de add-ons. Para prospecção só dois
mudam alguma coisa, e são os dois que estão na tela:

| Opção na tela | Vira na entrada do actor | Por quê |
| --- | --- | --- |
| Só quem não tem site | `website: "withoutWebsite"` | filtra no Google, antes de gastar crédito com quem já tem |
| Buscar e-mail e redes | `scrapeContacts: true` | abre o site de cada lugar atrás de contato; custa e demora mais |

Os outros ficam de fora de propósito: **Reviews** e **Images** trazem volume
que não ajuda a abordar e pesam no crédito; **Competitor analysis** é cobrado
à parte; **Geolocation** e **place IDs** são outras formas de dizer onde
procurar, que o campo "Onde" já resolve.

Campo opcional só é enviado quando está ligado — actor valida a entrada, e
mandar chave que ele não conhece é o jeito mais fácil de a corrida falhar na
largada. Se falhar, a tela mostra o recado do próprio Apify.

Trocar de actor é trocar `APIFY_ACTOR`. O normalizador em
[`src/lib/mapas.ts`](src/lib/mapas.ts) aceita apelidos de campo
(`title`/`name`, `phoneUnformatted`/`phone`, `totalScore`/`rating`,
`reviewsCount`/`userRatingsTotal`), então a maioria dos scrapers de mapa
funciona sem ajuste. A entrada do actor é montada em
[`src/lib/apify.ts`](src/lib/apify.ts).

### Quando um campo não vem

Cada actor devolve os "Perfis" da ficha do Google num campo diferente, e
alguns só trazem isso com o add-on de contatos ligado. Em vez de apostar num
nome, o normalizador varre as listas conhecidas (`instagrams`, `socialMedias`,
`profiles`, `socialProfiles`) atrás de um link do Instagram.

Se mesmo assim faltar, a tela de resultado tem **"Ver o que o scraper
devolveu"**: o primeiro item da corrida fica salvo em `lh_buscas.amostra`
exatamente como veio. Isso responde na hora se o campo não foi raspado ou se
o app perdeu no caminho — sem depender de abrir o painel do Apify.

### Duplicata

Antes de gravar, o app compara `place_id` e os 8 últimos dígitos do telefone
com quem já está no projeto. Rodar a mesma busca duas vezes não duplica, e a
tela diz quantos foram pulados. Há também um índice único
`(projeto_id, place_id)` no banco, como última linha de defesa.

### Custo

Os créditos do Apify são consumidos por resultado, então o campo **máximo de
resultados** existe para você medir antes de soltar volume. O padrão é 50 e o
teto é 300 por busca.

## Análise de Instagram

A aba **Insta** no modal do lead lê o perfil pelo Apify — mesmo
`APIFY_TOKEN` da busca no Maps, sem chave nova.

```
# APIFY_ACTOR_IG=apify~instagram-profile-scraper   (padrão)
```

Isso fecha um buraco antigo: o catálogo em [`servicos.ts`](src/lib/servicos.ts)
já declarava `parado_30d`, `poucos_seguidores` e `so_linktree`, mas **ninguém
preenchia** — o Google Maps não sabe nada disso.

| O que o perfil mostra | Vira |
| --- | --- |
| último post há 30 dias ou mais | `parado_30d` |
| menos de 500 seguidores | `poucos_seguidores` |
| link da bio é linktree/beacons e não há site | `so_linktree` |
| perfil não existe ou está fora do ar | `sem_instagram` |

O relatório traz seguidores, dias sem postar, engajamento
`(curtidas + comentários) ÷ seguidores` e ritmo de publicação.

### Detalhes que importam

- **A análise também DESMARCA.** Reanalisar um perfil que voltou a postar
  apaga o `parado_30d` de antes — senão a etiqueta mente e você aborda o
  cliente com um motivo que não existe mais. Os sinais são mesclados, não
  sobrescritos: o que veio do Maps ou o que você marcou na mão fica.
- **Ritmo pela janela real** entre o primeiro e o último post lido, não pela
  contagem total dividida pela idade da conta: quem postava muito em 2019 e
  parou continuaria com média alta.
- **Perfil privado** ainda entrega seguidores e link da bio, então esses dois
  sinais valem. O feed não, então ritmo e engajamento ficam de fora — chutar
  viraria etiqueta errada no card.
- **Mesmo vaivém da busca no Maps**: a corrida leva de 15 a 40 segundos,
  função serverless morre antes. O `ig_run_id` fica no próprio lead e a tela
  vai conferindo; fechar a janela não perde nada.

A **bio entra no briefing da demo de site** — é o negócio se descrevendo com
as próprias palavras, e vale mais que qualquer palpite da LLM. As palavras
mais frequentes nas legendas vão junto, como assunto.

As fotos do Instagram **não** entram na demo: as URLs são assinadas e expiram
em dias, e a página quebraria justo quando o cliente abrisse o link. Para
isso existe o Pexels.

## Demo de site (OpenAI)

A aba **Demo** no modal do lead gera uma landing page institucional com os
dados daquele lead e devolve um link pronto pra mandar junto da abordagem:
em vez de "posso fazer o site de vocês?", você manda "fiz um rascunho, dá uma
olhada".

```
OPENAI_API_KEY=sk-...
PEXELS_API_KEY=...          # fotos; gratuito em pexels.com/api
# OPENAI_MODEL=gpt-4o-mini   (padrão)
```

### Por que sai barato

**A LLM não escreve o HTML.** Ela devolve só o conteúdo em JSON — chamada,
sobre, serviços, diferenciais, mais um nome de paleta e um de estilo. Quem
monta a página é [`src/lib/site/render.ts`](src/lib/site/render.ts), escrito
uma vez.

|  | HTML pela LLM | JSON + template |
| --- | --- | --- |
| Tokens de saída | ~20.000 | ~1.500 |
| Qualidade | varia a cada geração | constante |
| Mobile | às vezes quebra | resolvido de uma vez |

São seis paletas × três estilos, escolhidos pelo ramo — dezoito caras
diferentes sem dezoito templates pra manter. As cores são nossas, não da
LLM: pedir hex pra ela é como ganhar cinza sobre cinza uma vez a cada três.

Telefone, endereço, Instagram e e-mail **não passam pela LLM**: vão do lead
direto pro template. Gastar token pra ela copiar um telefone é pagar pra ela
errar um dígito.

O modelo fica em variável de ambiente porque nome de modelo muda de
temporada, e trocar de modelo não pode virar deploy de código.

### As fotos

Página institucional sem imagem fica com cara de rascunho, e rascunho não
vende. A LLM não escolhe foto — ela escreve **2 ou 3 buscas em inglês**
(`busca_imagens`), o servidor consulta o Pexels e usa o que voltar: uma no
topo, uma na seção "sobre", o resto vira galeria.

- **Em inglês** porque o acervo é indexado assim: "barbearia" traz muito
  menos e pior que "barber shop".
- As buscas são **intercaladas**, não enfileiradas — senão a página inteira
  ficaria com três fotos quase iguais da primeira consulta.
- Por que Pexels e não as fotos do Instagram do lead: as URLs do Instagram
  são assinadas e **expiram em dias**. A demo quebraria justo quando o
  cliente resolvesse abrir o link. As do Pexels são CDN estável, então a
  página aponta direto — nada é baixado nem guardado.
- **Falha em silêncio**: sem chave, sem resultado ou com a API fora do ar, a
  página sai com gradiente e tipografia. Imagem é melhoria, não requisito.
- No topo a foto leva um véu escuro por cima. Sem ele, foto clara com texto
  branco é o jeito mais fácil de a demo chegar ilegível no celular.

O Pexels não exige atribuição, mas pede — o rodapé traz o crédito dos
fotógrafos, discreto.

Para mexer no template sem gastar chamada nenhuma, rode `npm run dev` e abra
`/demo/teste-render`. Os parâmetros trocam o que quiser sem gerar nada:
`?semfoto`, `?layout=dividido|centrado`, `?estilo=claro|elegante`,
`?paleta=verde_natural`, `?tom=robusto|caloroso|sobrio`. A rota só existe em
desenvolvimento, e corta as fotos como a geração de verdade cortaria — senão
a prévia mostraria galeria num tom que não tem galeria.

### Prova social do Google

Nota e número de avaliações vêm da busca no Maps, ficam guardados no lead
(`google_nota`, `google_avaliacoes`) e viram uma faixa de estrelas no topo e
no fechamento da página: **4,7 · 63 avaliações no Google**.

É o único número da página que não é chute. O prompt proíbe a LLM de
escrever qualquer número — anos de mercado, clientes atendidos, nota — e é
justamente por isso que este, sendo real, vale tanto. Quem estampa é o
template, com o dado que veio da ficha do Google.

**Nota baixa não aparece.** Abaixo de 4,0, ou com menos de 5 avaliações, a
faixa simplesmente não é renderizada. Não é esconder defeito: é não usar
como argumento de venda um número que argumenta contra o cliente. No app o
chip aparece sempre — verde quando serve de prova social, cinza quando é só
informação para você qualificar o lead.

Os dois campos também são **editáveis na aba Detalhes**. A busca do Maps só
preenche isto em lead importado depois que as colunas existiram; sem o campo,
todo lead antigo ficaria sem prova social para sempre. Olhe o Google do
cliente e digite.

### O que a página tem

Topo, sobre, serviços, galeria, diferenciais, **como funciona** (3 passos),
**perguntas frequentes** e contato — com menu de âncoras no topo, que some no
celular.

O FAQ usa `<details>` nativo: abre e fecha sem uma linha de JavaScript, e
continua funcionando se o script da animação não rodar.

**Tipografia de verdade**, uma família por estilo (Sora, Plus Jakarta Sans,
Fraunces) com Inter no corpo. A versão anterior usava só fonte de sistema por
medo de atrasar a página no 4G — o medo estava mal calibrado: com
`display=swap` o texto aparece na hora na fonte de sistema e troca quando a
outra chega, sem momento em branco. E fonte é o que mais denuncia template:
Arial no título entrega o jogo antes de a pessoa ler a primeira palavra.

O FAQ é onde a regra de não inventar mais aperta. As **perguntas** podem ser
específicas do ramo; as **respostas** não podem afirmar preço, prazo, horário
ou forma de pagamento — nada disso está nos dados. O prompt manda responder
pelo procedimento ("chame no WhatsApp que a gente confirma"), não pelo dado
que a LLM não tem.

### Corrigir o texto

O botão **Texto**, ao lado de Aparência, abre os campos da página: chamada,
sobre, serviços, fechamento. Salvar re-renderiza em cima do JSON salvo —
**não gasta token**.

Existe porque a LLM acerta o tom mas erra o negócio às vezes: chama de
"clínica" o que é consultório, lista um serviço que eles não fazem. Sem
isso a única saída era gerar de novo e torcer, e o erro costuma aparecer
justo na frente do cliente. Apagar o nome de um serviço tira ele da página.

O texto editado passa pelo mesmo `saneiarConteudo` que apara a saída da
LLM: os limites que protegem o layout dela protegem dele.

### Layout, cor e prévia

Cada demo tem um botão **Aparência**: paleta, estilo, **layout do topo** e a
cor da marca do cliente. Aplicar re-renderiza em cima do JSON já salvo, então
**não gasta token** — e a prévia ao lado, num aparelho de mentira, é um
iframe da própria rota pública: o que você vê é exatamente o que o cliente
abre, não uma reconstrução.

### Temperamento do ramo

O eixo que faz mecânica não parecer clínica de estética. Paleta, estilo e
layout mudavam cor, letra e o topo — mas a **planta** era a mesma para todo
mundo, e duas demos de ramos opostos saíam irmãs.

| Tom | Ramos | Forma | Ordem das seções |
| --- | --- | --- | --- |
| `sobrio` | advocacia, contabilidade, consultoria | cantos discretos, mais respiro, **2 fotos** | sobre → serviços → FAQ |
| `caloroso` | estética, salão, restaurante, pet | cantos 22px, **5 fotos** | **galeria** → serviços → sobre |
| `robusto` | mecânica, obra, oficina, transporte | cantos retos, borda 2px, sem sombra, **CAIXA ALTA** | serviços → como funciona |
| `tecnico` | clínica, odonto, laboratório, TI | grade limpa, cantos médios | sobre → serviços → galeria |

A **ordem** é o que mais diferencia, mais que cor: cada ramo vende por um
argumento, e o argumento tem que vir primeiro. Advocacia vende confiança na
pessoa, então listar serviço antes de dizer quem você é soa a balcão.
Estética vende pelo olho, e esperar a terceira rolagem para mostrar foto é
perder. Oficina vende competência: quem procura quer saber se você faz
aquilo, não a sua história.

A alternância de faixas claras é **calculada**, não escrita à mão em cada
seção — com a ordem variando, `alt` fixo deixaria duas faixas iguais coladas
em alguns tons.

São 3 layouts × 3 estilos × 6 paletas × 4 tons. O layout muda a estrutura do
topo:

| Layout | Topo | Bom para |
| --- | --- | --- |
| `classico` | foto ao fundo, texto por cima | quando o ambiente impressiona |
| `dividido` | texto de um lado, foto do outro | serviço técnico ou profissional |
| `centrado` | texto no meio, foto numa faixa abaixo | marca forte, mensagem curta |

As seções entram com um fade ao rolar. Se o `IntersectionObserver` não
entregar (webview de rede social, aba em segundo plano), uma rede de
segurança revela tudo em 2,5s — página de venda não pode ficar em branco.

### O link

A página fica em `/s/<slug>` — por exemplo
`sites.arium-ia.cloud/s/gabriela-fachini`. Fora da área logada: o cliente
abre sem ter conta aqui.

O slug sai do nome do negócio, cortado nas primeiras palavras até caber em
18 caracteres. Cortar por comprimento e não por contagem evita os dois
extremos: "Odonto Sorriso" fica inteiro, e "AgroPet Bom Amigo" não vira
"agropet-bom". Homônimo ganha `-2`.

**A versão anterior colava 8 caracteres aleatórios no fim**, e eles eram a
fechadura da página. Saíram por escolha: endereço curto e apresentável vale
mais que obscuridade num link que vai por WhatsApp. O custo é real — quem
souber o nome de um negócio consegue adivinhar o endereço da proposta dele.
O que ainda protege é o `publicado` (despublicar tira do ar na hora) e o
`noindex`. Voltar o sufixo é mexer só em `src/lib/site/slug.ts`.

`/demo/<slug>`, o endereço antigo, redireciona com 308 e não tem prazo para
sair: link de proposta fica no histórico da conversa para sempre.

**Domínio.** `NEXT_PUBLIC_URL_DEMOS` fixa o domínio dos links copiados e da
variável `{demo}`. O app atende em mais de um endereço — você trabalha no da
Vercel e o cliente recebe o bonito. Sem ela, o link sai com o domínio de
onde você está navegando.

- O HTML fica **gravado** na linha da demo. A rota pública lê uma linha e
  serve, sem chegar perto de `lh_leads`. Efeito colateral bom: mexer no
  template não muda uma demo que o cliente já recebeu.
- **Tirar do ar** despublica sem apagar. A rota só serve `publicado = true`,
  e responde com `no-store` pra CDN não continuar entregando depois.
- A página sai com `noindex`: indexada, competiria no Google com o site real
  do cliente.
- Tem uma fita no topo dizendo que é demonstração. Ela some na impressão,
  pra não sujar um PDF da proposta.
- A demo tem **favicon próprio**: a inicial do negócio na cor da marca, como
  data URI — sem requisição extra.
- O link chega no WhatsApp com **título, descrição e miniatura** em vez de
  pelado. A miniatura é desenhada por `/demo/<slug>/og`, e as metatags são
  montadas na hora de servir porque `og:image` precisa de URL absoluta e o
  domínio muda entre localhost, preview e produção.

> ⚠️ A **miniatura** não foi testada nesta máquina: o `@vercel/og` carrega a
> fonte dele por URL de arquivo e quebra quando o caminho do projeto tem
> espaço no nome (`Backup PC`). Em Linux, como na Vercel, isso não acontece.
> Se falhar mesmo assim, nada quebra — o card cai para título e descrição.
> Confira depois do deploy em developers.facebook.com/tools/debug.
- O link chega no WhatsApp com **título, descrição e miniatura** em vez de
  pelado. A miniatura é desenhada por ; se ela falhar, o
  card cai para título e descrição sem quebrar nada.
- A demo tem **favicon próprio**: a inicial do negócio na cor da marca.
- Nos templates de WhatsApp,  vira o link da demo publicada mais
  recente. A aba avisa se o template usa a variável e o lead ainda não tem
  demo no ar — melhor do que o cliente receber um `{demo}` cru.

### O que a LLM é proibida de fazer

O prompt gasta mais linha proibindo do que pedindo, e por um motivo só: a
página vai ser mostrada ao dono do negócio, que sabe a verdade sobre ele.
"15 anos de mercado" chutado num negócio de 2 anos não é deslize estético, é
a proposta indo pro lixo. Nada de número inventado, prêmio, certificação ou
depoimento com nome de pessoa.

Como `strict: true` do Structured Outputs garante o formato mas não o
tamanho, `saneiarConteudo` apara na entrada do template — h1 de 300
caracteres estoura o hero no celular.

### Sem chave

O botão **Copiar prompt** funciona sempre e não custa nada: monta o mesmo
briefing como texto pedindo o HTML, pra colar no v0, Lovable ou Claude. É o
caminho manual e também o escape pra quando a geração automática não agradar.

No modo demo a geração roda sem chave nenhuma, com conteúdo de
[`exemplo.ts`](src/lib/site/exemplo.ts) — o resto do app roda inteiro sem
configurar nada, e essa aba não ia ser a única a exigir cartão.

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
    demo/[slug]/route.ts      # a demo de site, pública, servida como HTML puro
  components/
    relatorios/               # funil, série temporal, ranking, mapa de ritmo
    leads/                    # kanban, cards, modais, importação
    projetos/  templates/  dashboard/  ui/
  lib/
    supabase/                 # clients de server e middleware
    demo/dados.ts             # base fictícia do modo demo
    db.ts                     # camada de dados: demo ou Supabase
    servicos.ts               # catálogo de serviços e sinais de qualificação
    agenda.ts                 # cadência e baldes de retorno
    relatorios.ts             # cálculo do painel, sem ida extra ao banco
    n8n.ts                    # contrato de ida e volta com o n8n
    mapas.ts                  # normaliza o resultado do scraper e infere sinais
    apify.ts                  # inicia a corrida e busca o dataset
    instagram.ts              # normaliza o perfil e infere sinais de social
    site/                     # a demo de site do lead
      briefing.ts             #   o que o app sabe do lead, num objeto só
      gerar.ts                #   chamada da OpenAI (JSON, nunca HTML)
      render.ts               #   o conteúdo vira página; o layout mora aqui
      pexels.ts               #   busca as fotos; falha em silencio
      paletas.ts  tipos.ts  slug.ts  exemplo.ts
    supabase/admin.ts         # service_role, só para o webhook
    config.ts  csv.ts  format.ts  status.ts  types.ts
middleware.ts                 # renova a sessão e bloqueia rotas privadas
supabase/
  schema.sql                  # instalação nova
  migrations/001_*.sql        # o app inicial
  migrations/002_demos.sql    # lh_demos: as demos de site geradas
  migrations/003_*.sql        # buscas, não perturbe e as colunas do disparo
  migrations/004_instagram.sql # ig_dados e a corrida no proprio lead
  migrations/005_*.sql        # nota e avaliacoes do Google no lead
```

**Instalação nova:** rode só o `schema.sql` — ele já contém tudo.

**Banco que já existe:** rode as migrações que faltarem. A `003` alinha o
SQL versionado com o que o código passou a usar depois do 001 (a busca no
Maps, o disparo pelo n8n e a lista de não perturbe); é toda idempotente
(`if not exists`), então rodar num banco que já recebeu essas mudanças na
mão não quebra nada.

## Isolamento por conta

O RLS já é por dono: cada linha pertence a quem a criou (`user_id = auth.uid()`),
e `lh_leads` / `lh_interacoes` herdam o dono via projeto. Isso importa porque o
projeto Supabase é compartilhado — sem essas policies, um usuário de outro
sistema do mesmo projeto leria os leads.

Efeito colateral bom: multi-usuário já funciona. Adicionar uma segunda conta é
criar o usuário no painel do Supabase; nada muda no código.

## Próximos passos (quando estiver no PC)

1. Rodar a `003_alinha_schema.sql` no Supabase de produção (o schema estava
   atrasado em relação ao código).
2. Fotos reais do Instagram na demo, baixadas pro Supabase Storage (as URLs
   do Instagram expiram, entao apontar direto nao serve).
3. Variável `{demo}` nos templates de WhatsApp, para a abordagem já sair com
   o link da proposta.
4. Fila de disparo do dia, com intervalo aleatório e janela de horário.
5. Valor por lead, para o kanban virar previsão de faturamento.
6. Lista de não perturbe na interface (a tabela já existe).
