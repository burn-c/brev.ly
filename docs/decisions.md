# Decisões Técnicas (ADRs)

Registro das decisões técnicas do projeto, no formato de Architecture Decision Records (ADRs). Cada ADR documenta o contexto, as alternativas consideradas, a decisão e o **porquê**. Decisões novas devem ser adicionadas aqui quando forem tomadas.

## ADR-001 — Identificador para deletar e incrementar acessos

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

O enunciado não especifica se as operações de **deletar** e **incrementar acessos** usam `id` ou URL encurtada, mas pede consistência: *"se escolher `id`, que seja em ambas"*. A escolha impacta o front-end (que precisa do identificador nas ações da listagem).

### Alternativas consideradas

- **`id` (uuid v7)** para delete e incremento, com `shortCode` apenas no lookup de redirect.
- **`shortCode`** para delete e incremento.
- Incremento **embutido** no `GET /links/:shortCode` (sem endpoint dedicado).

### Decisão

Usar **`id` (uuid v7)** para `DELETE /links/:id` e `PATCH /links/:id/access`. O `shortCode` é usado apenas no lookup de redirecionamento (`GET /links/:shortCode`), que permanece idempotente. Endpoint dedicado de incremento por `id`.

### Por quê

- O redirect é **naturalmente por `shortCode`** (o usuário acessa `brev.ly/abc123` sem saber o `id`); usar `shortCode` para delete/incremento misturaria dois domínios e permitiria enumerar/deletar por alias adivinhável.
- `id` mantém o `GET` de redirect **puro e cacheável** (idempotente), atendendo a regra de consistência do enunciado.
- **uuid v7** é ordenável por tempo (não precisa de timestamp separado) e é padrão em projetos Drizzle.
- O fluxo de redirecionamento (ADR-002) precisa do `id` para incrementar — por isso o `GET /links/:shortCode` retorna o link completo.

### Consequências

- Delete e incremento consistentes por `id`, conforme recomendação do enunciado.
- O `GET` de redirect é idempotente e sem efeito colateral.
- `GET /links/:shortCode` retorna o link completo (inclui `id`) para viabilizar o incremento.

---

## ADR-002 — Status do redirecionamento

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

O redirecionamento de `/:url-encurtada` para a URL original pode usar status `301 Moved Permanently` (cacheável) ou `302 Found` (temporário). O enunciado descreve a página `/:url-encurtada` como *"busca o valor dinâmico da URL e faz a pesquisa na API"*.

### Alternativas consideradas

- **`302 Found`** com redirect no front-end (SPA).
- **`301 Moved Permanently`**.
- Redirect **no servidor** (rota `/:code` no Fastify respondendo `302` com `Location`).

### Decisão

Usar **`302 Found`**, com redirecionamento realizado **no front-end** (SPA). Fluxo de 2 chamadas: `GET /links/:shortCode` → `PATCH /links/:id/access` → `window.location`.

### Por quê

- **Contagem de acessos:** o requisito central é incrementar acessos; `301` faz o browser/Google cachear o destino e **pular** o app nos cliques seguintes (subcontagem).
- **Edição futura:** com `302`, o destino é reconsultado a cada clique; editar/remover o link reflete na hora.
- O enunciado coloca o redirect como **página do front** ("faz a pesquisa na API"), então o redirect no servidor não é exigido e não foi implementado (mantém a API como API de dados).

### Consequências

- Todo clique passa pelo app e contabiliza o acesso corretamente.
- Edições futuras no destino refletem imediatamente.
- Fluxo de 2 chamadas no front (GET idempotente + PATCH de incremento).

---

## ADR-003 — Geração do short code

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

As regras *"URL encurtada mal formatada"* e *"URL encurtada já existente"* só fazem sentido se o usuário **pode informar** o código — além disso, o sistema deve cobrir o caso de alias vazio (auto-geração).

### Alternativas consideradas

- **Alias custom opcional + auto-geração base62** com retry em colisão.
- Somente auto-geração (as validações do enunciado não fariam sentido).
- Alias custom obrigatório (UX ruim e não exigido).
- Base64url / caracteres especiais no alias.

### Decisão

Alias customizado **opcional** (regex `^[a-zA-Z0-9]{1,10}$`, **case-sensitive**) + **auto-geração** em **base62** de **7 caracteres** com **retry de até 5 tentativas** em caso de colisão.

### Por quê

- **Formato alfanumérico simples** evita ambiguidade visual e problemas de URL (espaços, caracteres especiais).
- **Case-sensitive** aumenta o espaço de combinações (~3,5 trilhões com 7 chars).
- **7 caracteres** equilibra tamanho curto e baixíssima chance de colisão.
- **Retry 5x** cobre colisões do auto-gerado sem escalar o comprimento (complexidade extra não vale para este desafio).
- Unicidade garantida por **unique index** no Postgres (fonte de verdade da regra "já existente").

### Consequências

- `400` para formato inválido; `409` para código existente (mapeado do `23505` do pg — ver `isUniqueViolation`).
- Auto-geração cobre o caso de alias vazio (decisão de produto, permitida pelo enunciado).

---

## ADR-004 — Deploy e infraestrutura (AWS + Pulumi)

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

A parte DevOps exige `Dockerfile`, script `db:migrate`, `.env.example`, CORS e CSV via CDN (S3 **ou** R2 são explicitamente válidos). O tipo de computação do back é livre. Foi decidido **100% AWS** (o módulo tem conteúdo de deploy AWS e o usuário tem saldos na conta).

### Alternativas consideradas

- **Cloudflare**: Pages (front) + Workers (back) + R2 (CSV). Exige adaptação para Postgres (Hyperdrive) e o `Dockerfile` obrigatório ficaria sem papel real no deploy.
- **AWS**: S3 + CloudFront (web/CSV), ECR → **ECS Fargate** (back, usa o Dockerfile), **RDS PostgreSQL** (banco).
- **Híbrido** (Cloudflare no front/CDN + AWS no back).
- Postgres como **container no Fargate + EFS** (mais barato marginalmente, porém frágil: WAL em NFS, backup manual).

### Decisão

Infraestrutura **100% AWS** provisionada com **Pulumi**:

- Front-end → S3 + CloudFront;
- Back-end → ECR → **ECS Fargate** (usa o Dockerfile avaliado);
- Banco → **RDS PostgreSQL** (`db.t4g.micro`);
- CSV → S3 + CloudFront (CDN);
- Estado do Pulumi → backend S3 centralizado `s3://burn-pulumi-state`;
- CI/CD → GitHub Actions com autenticação **OIDC**.

### Por quê

- **S3 é explicitamente citado como CDN válida** no enunciado → atende todos os requisitos DevOps sem conflito.
- **ECS Fargate** é a forma canônica de usar o `Dockerfile` avaliado (imagem no ECR).
- **RDS micro** é a opção Postgres mais barata **confiável** (comparável ao Fargate+EFS em custo, mas gerenciado, com backups), e o requisito é o *engine* Postgres, não "Postgres em container".
- **Pulumi** (preferência do usuário, já usado em `burndev.iac`) automatiza a infra com TypeScript.

### Consequências

- Atende todos os requisitos DevOps da avaliação.
- Custo mensal estimado: ~US$ 15–20 (derrubável com `pulumi destroy`).
- Fase 6 implementa a infra; Fase 7 o CI/CD.

---

## ADR-005 — Camada de storage com dois providers

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

O `.env.example` **mostrado no enunciado** usa chaves `CLOUDFLARE_*`. O deploy real é **AWS (S3)**. R2 e S3 são compatíveis com o mesmo SDK (`@aws-sdk/client-s3`) — R2 é S3-compatível.

### Alternativas consideradas

- **Ir 100% AWS** com chaves `AWS_*` apenas (diverge do template do enunciado — risco com corretor automatizado que compare o arquivo).
- **Camada de storage com dois providers** atrás da mesma interface, mantendo as chaves `CLOUDFLARE_*` no `.env.example`.

### Decisão

Camada de storage com **abstração de provider** (`STORAGE_PROVIDER=cloudflare | aws`). O `.env.example` mantém as chaves `CLOUDFLARE_*` exatamente como o enunciado e adiciona as `AWS_*` (incluindo `AWS_ENDPOINT` para S3-compatíveis custom).

### Por quê

- **Fidelidade ao enunciado** sem sacrificar o deploy em AWS (S3).
- A troca de provider é **configuração pura** (mesmo SDK, endpoint/região diferentes) — zero mudança no código de negócio.
- O client usa `requestChecksumCalculation: "WHEN_REQUIRED"` para compatibilidade ampla com provedores S3-compatíveis (R2, MinIO, gateways).

### Consequências

- `.env.example` fiel ao template + suporte a S3.
- Troca de provider via env, sem mudança de código.
- Ver `src/storage/storage.ts` (`createStorageProvider`, `buildS3ClientOptions`, `buildPublicUrl`).

---

## ADR-006 — Backend de estado do Pulumi

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

Centralizar o estado do IaC do curso e evitar dependência de Pulumi Cloud. O projeto `burndev.iac` já usa backend S3.

### Alternativas consideradas

- **Pulumi Cloud** (grátis, mas serviço externo + token no CI).
- **S3 bucket centralizado** `s3://burn-pulumi-state` (padrão já estabelecido no curso).

### Decisão

Reutilizar o bucket **`s3://burn-pulumi-state`** como `cloud-url` do stack `brevly-prod`, na conta AWS `488182246611`, região `us-east-1`.

### Por quê

- **Todo o estado de infra do curso fica num único backend** (centralização).
- **Consistência** com o padrão já usado em `burndev.iac` (workflows `pulumi/actions` com `cloud-url` S3).
- Evita token de Pulumi Cloud no CI.

### Consequências

- Um único local de estado para todos os stacks do curso.
- Stack `brevly-prod` inicializado na Fase 6 com `cloud-url: s3://burn-pulumi-state`.

---

## ADR-007 — Carregamento de variáveis de ambiente

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

O quickstart do README manda `cp .env.example .env && pnpm dev`, mas o server não carregava o `.env`: `env.ts` lia `process.env` diretamente e nenhum módulo importava `dotenv`, então `DATABASE_URL` ficava vazio e o primeiro query falhava.

### Alternativas consideradas

- **`dotenv`** (dependência extra, bastante usada).
- **`process.loadEnvFile(".env")`** (API nativa do Node 20.12+ — zero dependência).

### Decisão

Usar `process.loadEnvFile()` no topo de `server/src/env.ts`, com try/catch para o caso de `.env` ausente (CI/deploy usam variáveis do ambiente do processo).

### Por quê

- **Zero dependência** — o runtime já oferece a API nativa.
- Mantém o quickstart do README funcionando (`cp .env.example .env && pnpm dev`).
- Sem comportamento quebrado em produção (variáveis injetadas pelo container continuam priorizadas — `.env` só é lido se existir).

### Consequências

- `pnpm dev`/`pnpm db:migrate` local carregam `.env` automaticamente.
- Nenhuma nova dependência no `package.json`.

---

## ADR-008 — Erro 500 na exaustão do retry de short code

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

O `spec.md` exige: auto-gerar short code em base62 (7 chars) com retry de até 5 tentativas em colisão; **esgotadas as tentativas, `500`**. Antes, a exaustão relançava `ShortCodeAlreadyExistsError`, que a rota mapeava para `409`.

### Alternativas consideradas

- **Manter `409`** (viola o spec; além disso, "URL encurtada já existente" é confuso no front, pois o usuário não escolheu o código).
- **Novo erro `ShortCodeGenerationError` → `500`** (fiel ao spec e semanticamente correto).

### Decisão

Adicionar `ShortCodeGenerationError` (`server/src/errors/links-errors.ts`), lançado quando os 5 retries esgotam; a rota o deixa propagar como `500`. `ShortCodeAlreadyExistsError`/`409` fica reservado ao custom code informado pelo usuário.

### Por quê

- Fidelidade ao `spec.md` (item 3.1) e ao contrato da API.
- Semântica correta: exaustão de geração não é "URL já existente".

### Consequências

- `POST /links` pode retornar `500` em caso raro de colisão contínua.
- Testes cobrem o mapeamento (service + rota).