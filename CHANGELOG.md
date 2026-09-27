# Changelog

Todas as mudanças notáveis do projeto serão documentadas neste arquivo, seguindo o estilo [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [0.7.0] - 2026-09-27

### Adicionado

- **Workflows GitHub Actions (Fase 7)**:
  - `pr.yml` — validação de PR: Server (lint/format/typecheck/test/build) + Web (lint/format/typecheck/build) + **Pulumi preview** (`brevly-prod`).
  - `deploy.yml` — deploy em `main`: build+push da imagem do server → **ECR** (tag `sha`) → **`pulumi up`** → **`db:migrate`** → sync do web → **S3** + invalidação **CloudFront**.
- **Autenticação AWS via OIDC** (`configure-aws-credentials` com `role-to-assume`), sem credenciais estáticas.
- **Export `cdnDistributionId`** no `infra/index.ts` (para a invalidação do CloudFront no deploy).
- **`docs/ci-cd.md`** com visão geral, pré-requisitos (role OIDC + secrets) e notas operacionais.

### Observações

- Para ativar os pipelines: criar o repositório público `brev.ly`, a role OIDC `GitHubActionsOIDCRole` (trust para o repo) e os secrets `AWS_OIDC_ROLE_ARN` + `DB_PASSWORD`.
- A config da stack Pulumi é recriada no CI (`accountId` + `dbPassword`) — não versionada (repo público).
- `VITE_BACKEND_URL`/`VITE_FRONTEND_URL` apontam para `api.brevly.com.br`/`cdn.brevly.com.br` no build de deploy.

## [0.6.0] - 2026-09-27

### Adicionado

- **Infraestrutura Pulumi (Fase 6)** em `infra/index.ts`: VPC (2 AZs + NAT), S3 front-end `brevly-frontend-web` + CSV `brevly-csv-reports`, CloudFront (CDN + ACM), RDS PostgreSQL `db.t4g.micro`, ECR `brevly-server` → ECS Fargate + ALB.
- **Stack `brevly-prod`** inicializada (região `us-east-1`, conta `488182246611`) com config versionada (`accountId`, `dbPassword` secreto).
- **Backend de estado exclusivo `s3://brevly-pulumi-state`** (versionado) — substitui o `burn-pulumi-state` do ADR-006, inacessível nesta conta (**ADR-009**).
- **`pulumi preview` validado**: 50 recursos a criar, sem erros nem warnings.
- **Pinagem de versões** `@pulumi/aws@7.35.0` + `@pulumi/awsx@3.6.0` via `overrides` no `pnpm-workspace.yaml` (compatíveis com plugins locais).
- **Docs**: `docs/infra-pulumi.md` e `docs/deploy.md` (novos).

### Observações

- Aplicar a infra (`pulumi up`) fica para o deploy real (Fase 7): emitir o certificado ACM (validação DNS), push da imagem ECR, migrations no RDS e sync do front. Ver [`docs/deploy.md`](./docs/deploy.md).
- O `preview` é lento (~5–8 min) por causa do `awsx.ec2.Vpc` e da rede — não interromper.

## [0.5.0] - 2026-09-27

### Adicionado

- **`server/Dockerfile`** multi-stage (padrão do spec): `base` (node:22-alpine + pnpm via corepack), `dependencies` (`pnpm install --frozen-lockfile`), `build` (`pnpm build` + `pnpm prune --prod`), `production_deployment` (imagem leve: `dist/` + `node_modules` prod, `USER node`).
- **`server/docker-compose.yaml`** (dev local): serviços `db` (postgres:15-alpine, healthcheck, volume `db-data`) e `app` (build local, `env_file: .env`, `DATABASE_URL` apontando para o `db` do compose, porta 3333).
- **`server/.dockerignore`** e `packageManager: pnpm@11.9.0` no `server/package.json`.
- **`docs/docker.md`** com instruções de build e uso do compose.

### Observações

- **Node 22** no Dockerfile: o pnpm 11.9 fixado exige Node ≥ 22 (no Node 20 falha com `ERR_UNKNOWN_BUILTIN_MODULE`). O spec citava "node 20", mas o runtime real do projeto é Node 22+.
- **Migrations fora do container:** `drizzle-kit` é devDependency (removido no `prune --prod`); `pnpm db:migrate` roda no host/CI (Fase 7), como documentado em `docs/docker.md`.
- Validado de ponta a ponta: `docker build` ok; compose sobe `db`+`app` e o fluxo create/list/access funciona dentro dos containers.

## [0.4.0] - 2026-09-27

### Adicionado

- **Páginas do Front-end (Fase 4)**, guiadas pelo `web/docs/design-spec.md` extraído do Figma:
  - **Home `/`** — formulário "Novo link" (React Hook Form + Zod: URL http/https obrigatória, short code opcional `^[a-zA-Z0-9]{1,10}$`, erros PT-BR), listagem "Meus links" (TanStack Query) com skeleton de loading, empty state ("ainda não existem links cadastrados"), erro com retry, ações de copiar (clipboard) e excluir (com confirmação), botão "Baixar CSV" (abre a URL pública da CDN), feedback via toasts.
  - **Redirect `/:url-encurtada`** — fluxo no front (ADR-002): busca o link (`GET /links/:shortCode`), incrementa acessos (`PATCH /links/:id/access`) e redireciona via `window.location`; fallback manual "Acesse aqui" (sublinhado `blue-base`); 404 → página Not Found.
  - **Not Found `*`** — ilustração `404.svg` + "Link não encontrado".
- **Componentes de UI**: `Button` (primary/secondary com estados hover/disabled), `IconButton` (32×32), `Input` (label uppercase `gray-500`, estados default/active/error com ícone Warning), `Logo`/`LogoIcon` (assets SVG), `Toast` (Provider + hook `useToast`, sucesso/erro).
- **Cliente de API** (`web/src/lib/api.ts`): `listLinks`, `createLink`, `getLinkByShortCode`, `deleteLink`, `incrementAccess`, `getCsvUrl`, `buildShortUrl`, `ApiError`.
- **Tokens de tipografia** no Tailwind com alturas de linha exatas do Figma (10/12/14/18/24px).

## [0.3.2] - 2026-09-27

### Alterado

- **`web/docs/design-spec.md` e `web/docs/design-tokens.md` reconciliados com o Figma** (análise de fidelidade): corrigidos o label do input (`gray-500`, não `gray-400`), o texto do empty state (`gray-500` + CAIXA ALTA) e as dimensões dos botões (primary full-width 316/318, secondary `hug` ~100–104px). Documentados itens ausentes: botões desabilitados no empty state, fallback links sublinhados em `blue-base` ("Acesse aqui" e "brev.ly"), gaps da listagem mobile, inputs preenchidos no desktop e a cor base `#000000` dos ícones Phosphor (via `currentColor`).

## [0.3.1] - 2026-09-27

### Adicionado

- **Índice `links_created_at_idx`** (descendente em `created_at`) para listagem performática — fecha o item 12 do checklist (migration `0001_outstanding_sway.sql`).

### Corrigido

- **Carregamento de `.env`** no server via `process.loadEnvFile()` (Node 20.12+, zero dependência — ADR-007): antes `pnpm dev`/`db:migrate` ignoravam o `.env` e `DATABASE_URL` ficava vazio.
- **`POST /links` com retry esgotado** passa a retornar `500` (`ShortCodeGenerationError`) em vez de `409` — `409` fica apenas para custom code informado pelo usuário (ADR-008, fiel ao spec).

### Alterado

- **Mensagens de erro de validação** das rotas padronizadas em **PT-BR** (antes em inglês nos erros de schema).
- **Testes de rota** passam a injetar ambos os serviços (stubs), evitando criar um `Pool` real de Postgres durante os testes.

### Observações

- Suíte de testes subiu para **76** (service + rota cobrindo o `500` do retry esgotado).

## [0.3.0] - 2026-09-27

### Adicionado

- **Provider de storage** (`src/storage/storage.ts`): abstração S3/R2 via `@aws-sdk/client-s3`, selecionada por `STORAGE_PROVIDER` (ADR-005). Configuração **lazy** (não quebra o app sem storage) e validação `buildS3ClientOptions`/`buildPublicUrl` testáveis. Client com `requestChecksumCalculation: "WHEN_REQUIRED"` para compatibilidade com provedores S3-compatíveis.
- **Serviço de relatório CSV** (`src/services/report-service.ts`): exporta todos os links em lotes (página de 1000), gera CSV com escaping correto (`csvEscape`/`buildLinksCsv`), faz upload com nome aleatório (`<uuid>.csv`) e retorna a URL pública.
- **Rota `GET /reports/links.csv`**: retorna `{ url }` do CSV na CDN.
- **Env `AWS_ENDPOINT`** (opcional) para endpoints S3-compatíveis custom.
- **Dependência** `@aws-sdk/client-s3`.
- **Testes**: suíte subiu de 49 → **75** (storage: 17, report-service: 7, report route: 2 + anteriores).
- **Design system (web/) extraído do Figma**: `web/docs/design-spec.md` com a especificação detalhada das 8 telas (Links/Empty/Redirect/Not Found × desktop/mobile) e componentes (Button primary/secondary, Icon Button, Input) e `web/docs/design-tokens.md` com os tokens oficiais do Style Guide (`blue-base`, `blue-dark`, `gray-100..600`, `danger`).
- **Tokens de cor renomeados** no Tailwind para os nomes oficiais do Figma (antes `brand`/`surface`, agora `blue.*`/`gray.*`/`danger`).
- **Assets vetoriais** exportados do Figma: `web/assets/Logo.svg`, `web/assets/Logo_Icon.svg`, `web/assets/404.svg` (com `<title>` acessível).

### Observações

- A validação da integração de rede (upload real para S3/R2) será feita no deploy (Fase 6/7). Em ambiente local, o `s3mock` é incompatível com o AWS SDK v3 (v3 falha no parse XML; v2 não persiste objetos) e o MinIO/LocalStack estão bloqueados no registro Docker desta máquina — isso não afeta o código, que usa o mesmo SDK comprovado contra R2 no projeto de referência.
- Checklist de compliance: itens 9–13 (CSV via CDN, nome único, listagem performática, campos do CSV) cobertos.
- Design/UI orientado ao Figma (item 24 do checklist): implementação das telas guiada por `web/docs/design-spec.md`.

## [0.2.1] - 2026-09-27

### Corrigido

- `GET /links/:shortCode` passa a retornar o **link completo** (inclui `id`), permitindo ao front-end incrementar acessos por `id` no fluxo de redirecionamento (ADR-002). Antes retornava apenas `{ originalUrl }`.
- Mensagens de erro dos endpoints não são mais vazias (`URL encurtada já existente`, `URL encurtada mal formatada`, `Link não encontrado`, `URL original inválida`).
- O pool do PostgreSQL é fechado no shutdown do app (hook `onClose` do Fastify), evitando vazamento de conexão em produção.

## [0.2.0] - 2026-09-27

### Adicionado

- **Modelo de dados** (`links`) e migrations Drizzle (`server/drizzle/`), com `db:migrate` funcional.
- **Camada de domínio do Back-end**: repositório (Drizzle/Postgres) + serviço de links com validação (zod), geração de short code (base62, retry de colisão), erros tipados (`InvalidUrlError`, `InvalidShortCodeError`, `ShortCodeAlreadyExistsError`, `LinkNotFoundError`).
- **Utilidades**: `short-code` (validação `^[a-zA-Z0-9]{1,10}$`, geração com `crypto.randomInt`).
- **Rotas da API**: `POST /links`, `GET /links` (paginado), `GET /links/:shortCode`, `DELETE /links/:id`, `PATCH /links/:id/access` (mapeamento 400/404/409).
- **Dependência** `uuidv7` para ids ordenáveis por tempo (ADR-001).
- **Testes**: 49 testes (utils, serviço com fake repository, rotas com stub, detecção de violação de unicidade).

### Observações

- Detecção de unicidade considera `DrizzleQueryError.cause.code === "23505"` (drizzle embrulha o erro do pg).
- `total` da listagem é convertido para `number` (pg retorna `count(*)` como bigint/string).
- Exportação CSV via CDN (Fase 3) e Docker (Fase 5) ainda pendentes.

## [0.1.0] - 2026-09-27

### Adicionado

- **Spec do projeto** (`spec.md`): requisitos, checklist de compliance (26 itens oficiais), arquitetura, API, modelo de dados, infra e roadmap.
- **Padrões de desenvolvimento** (`docs/workflow.md`): ciclo por tarefa, definição de "pronto", convenção de commits (Conventional Commits em inglês), documentação e changelog em PT-BR.
- **Registro de decisões** (`docs/decisions.md`): ADRs das decisões técnicas da Fase de planejamento.
- **Scaffold do Back-end** (`server/`): Fastify + TypeScript + zod, rota `/health`, configuração Drizzle (`db:migrate`), Vitest, Biome, `.env.example`.
- **Scaffold do Front-end** (`web/`): React 19 + Vite + TypeScript + TailwindCSS + TanStack Query + React Hook Form + Zod + React Router, Biome, `.env.example`.
- **Scaffold da Infraestrutura** (`infra/`): projeto Pulumi (stack `brevly-prod`), sem recursos AWS criados (Fase 6).

### Observações

- A stack do Pulumi (`brevly-prod`) e os recursos AWS (VPC, ECS/Fargate, RDS, S3, CloudFront) serão implementados na Fase 6.
- O banco de dados (schema `links`) e o CRUD serão implementados na Fase 2.