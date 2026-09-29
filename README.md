# Brev.ly

Encurtador de URLs **Full Stack** — projeto avaliativo da **Fase 1** da Pós-Graduação Full-Stack com IA (Tech Developer 360º) da Faculdade de Tecnologia Rocketseat.

## Visão Geral

Aplicação que permite encurtar links, gerenciar (listar/deletar), acompanhar a quantidade de acessos de cada link e exportar relatórios em CSV via CDN. O projeto exercita três áreas: **Frontend**, **Backend** e **DevOps**.

- **Spec completo:** [`spec.md`](./spec.md)
- **Checklist de compliance (26 itens oficiais):** seção 2 do spec
- **Documentação técnica:** [`docs/`](./docs/README.md)
- **Padrões de desenvolvimento:** [`docs/workflow.md`](./docs/workflow.md) e [`AGENTS.md`](./AGENTS.md)

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 · Vite · TypeScript · TailwindCSS · TanStack Query · React Hook Form · Zod |
| Backend | Node.js · Fastify · Drizzle ORM · PostgreSQL · zod |
| DevOps | Docker · Docker Compose · Pulumi (AWS) · GitHub Actions |

## Estrutura do repositório

```
brev.ly/
├── web/      # Front-end: React + Vite + TS + Tailwind
├── server/   # Back-end: Fastify + Drizzle + Postgres (Dockerfile, db:migrate)
├── infra/    # Infraestrutura como código: Pulumi (AWS) — stack brevly-prod
├── docs/     # Documentação técnica (API, banco, docker, deploy, infra, decisões)
├── spec.md   # Spec do projeto (requisitos, arquitetura, checklist de compliance)
└── AGENTS.md # Instruções para agentes (convenções do repositório)
```

## Quickstart

Pré-requisitos: Node.js 22+ · pnpm 11 · Docker (para o Postgres) · Cloudflare CLI (`wrangler`) para o CSV via R2.

### Rodar a aplicação inteira localmente

Passo a passo completo (banco + API + web + exportação CSV via R2):

```bash
# 1. Banco de dados (Postgres via Docker)
cd server
docker compose up -d db          # sobe o Postgres na porta 5432
pnpm db:migrate                  # aplica as migrations (drizzle-kit roda no host)

# 2. Configurar o .env do server (ver seção "Variáveis de ambiente" abaixo)
cp .env.example .env
#    → preencha DATABASE_URL, FRONTEND_URL e o storage (R2 ou S3)

# 3. API
pnpm dev                         # http://localhost:3333  (teste: /health)

# 4. Web
cd ../web
cp .env.example .env             # ajuste VITE_BACKEND_URL=http://localhost:3333
pnpm dev                         # http://localhost:5173
```

A aplicação estará em **http://localhost:5173**, com a API em **http://localhost:3333**.

#### Exportação de CSV localmente (Cloudflare R2)

O botão "Baixar CSV" do front abre a URL pública do arquivo. Para o CSV funcionar local, o storage precisa de credenciais R2 (ou S3) reais no `server/.env`:

```env
STORAGE_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=<account-id>
CLOUDFLARE_ACCESS_KEY_ID=<access-key-id>
CLOUDFLARE_SECRET_ACCESS_KEY=<secret-access-key>
CLOUDFLARE_BUCKET=<bucket>
CLOUDFLARE_PUBLIC_URL=<r2.dev-url-ou-domínio>
```

**Onde obter cada valor (Cloudflare):**
1. **Account ID** — dash.cloudflare.com → R2 → Overview (painel da conta).
2. **Access Key ID + Secret Access Key** — R2 → **Manage R2 API Tokens** → **Create API Token** → permissão **Object Read & Write** (aplicado ao bucket). O dashboard exibe o par S3 (Access Key ID 32 chars + Secret 64 hex).
3. **Bucket** — criar via CLI: `wrangler r2 bucket create <nome>` (ou no dashboard).
4. **URL pública** — habilitar via CLI: `wrangler r2 bucket dev-url enable <bucket>` → retorna `https://pub-<hash>.r2.dev` (usado como `CLOUDFLARE_PUBLIC_URL`). Requer `wrangler login` e bucket com acesso público.

> **Importante:** o endpoint S3 do R2 é `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (o provider `cloudflare` monta automaticamente a partir do `accountId`). O fluxo local é idêntico ao de produção: o server faz upload do CSV para o bucket e o browser abre a URL pública.

### Back-end (apenas API)

```bash
cd server
pnpm install
cp .env.example .env   # ajuste as variáveis
pnpm dev               # http://localhost:3333
```

Scripts principais: `dev` · `build` · `start` · `typecheck` · `lint` · `test` · `db:migrate` · `db:generate`

### Front-end

```bash
cd web
pnpm install
cp .env.example .env   # ajuste VITE_BACKEND_URL
pnpm dev               # http://localhost:5173
```

Scripts principais: `dev` · `build` · `preview` · `typecheck` · `lint` · `format:check` · `test`

### Infraestrutura

```bash
cd infra
pnpm install
AWS_REGION=us-east-1 pulumi login s3://brevly-pulumi-state
AWS_REGION=us-east-1 pulumi up -s brevly-prod   # aplica/atualiza a infra (deploy real)
```

> A config da stack (`Pulumi.brevly-prod.yaml`) **não é versionada** (repo público) e se recria localmente com `pulumi config set brevly-infra:accountId <id>` e `pulumi config set --secret brevly-infra:dbPassword <senha>`. Ver [`docs/infra-pulumi.md`](./docs/infra-pulumi.md).

## Status

Fases do roadmap em [`spec.md`](./spec.md#10-roadmap):

- [x] **Fase 1 — Setup** (monorepo `web/` + `server/` + `infra/`, tooling, envs)
- [x] **Fase 2 — Back-end** (Drizzle + Postgres, migrations, CRUD)
- [x] **Fase 3 — CSV/CDN** (storage S3/R2, exportação CSV, nome único via CDN)
- [x] **Fase 4 — Front-end** (páginas `/`, `/:url-encurtada`, `*`; fluxos; UX; responsividade) — fidelidade Figma + revisão visual final validadas
- [x] **Fase 5 — Docker** (Dockerfile multi-stage + docker-compose local)
- [x] **Fase 6 — Infra (Pulumi)** (VPC/ECS/RDS/S3/CloudFront, stack `brevly-prod` — **deploy aplicado e funcional**)
- [x] **Fase 7 — CI/CD** (GitHub Actions + OIDC — **pipelines verdes, deploy automático em main**)
- [x] **Fase 8 — Testes** (server: 77 Vitest · web: Vitest + Testing Library)
- [x] **Fase 9 — Entrega** (checklist de compliance 26/26, README, docs)

## Deploy / Acesso

Aplicação em produção (deploy automático via GitHub Actions em `main`):

| Recurso | URL |
|---|---|
| Front-end (SPA + redirect via CloudFront) | <https://brev-ly.burndev.app> |
| API (Fastify via ALB) | <https://api.brev-ly.burndev.app> |
| CSV (via CDN) | `https://brev-ly.burndev.app/csv/<uuid>.csv` |

## Compliance (checklist de 26 itens)

Rastreabilidade dos itens oficiais de correção automática (seção 2 do [`spec.md`](./spec.md)). Todos os 26 itens estão cobertos pela implementação.

| # | Item (checklist oficial) | Implementação | Status |
|---|---|---|---|
| 1 | `[Back-end]` | API Fastify em `server/` | ✓ |
| 2 | Deve ser possível criar um link | `POST /links` | ✓ |
| 3 | Não deve ser possível criar link com URL encurtada mal formatada | Validação zod + regex `^[a-zA-Z0-9]{1,10}$` → `400` | ✓ |
| 4 | Não deve ser possível criar link com URL encurtada já existente | Unique index + conflito → `409` | ✓ |
| 5 | Deve ser possível deletar um link | `DELETE /links/:id` | ✓ |
| 6 | Deve ser possível obter a URL original por meio de uma URL encurtada | `GET /links/:shortCode` | ✓ |
| 7 | Deve ser possível listar todas as URLs cadastradas | `GET /links` (paginação) | ✓ |
| 8 | Deve ser possível incrementar a quantidade de acessos de um link | `PATCH /links/:id/access` | ✓ |
| 9 | Deve ser possível exportar os links criados em um CSV | `GET /reports/links.csv` | ✓ |
| 10 | Deve ser possível acessar o CSV por meio de uma CDN (S3, R2, etc.) | Upload para S3 + CloudFront (OAC) | ✓ |
| 11 | Deve ser gerado um nome aleatório e único para o arquivo | `crypto.randomUUID()` no nome do objeto | ✓ |
| 12 | Deve ser possível realizar a listagem de forma performática | Paginação + índice em `created_at`/`short_code` | ✓ |
| 13 | O CSV deve ter campos: URL original, URL encurtada, contagem de acessos e data de criação | Colunas do CSV | ✓ |
| 14 | `[Front-end]` | SPA em `web/` | ✓ |
| 15 | Deve ser possível criar um link | Formulário na rota `/` | ✓ |
| 16 | Não deve ser possível criar link com encurtamento mal formatado | Validação no cliente (zod) + `400` da API | ✓ |
| 17 | Não deve ser possível criar link com encurtamento já existente | `409` da API exibido no formulário | ✓ |
| 18 | Deve ser possível deletar um link | Ação de deletar na listagem | ✓ |
| 19 | Deve ser possível obter a URL original por meio do encurtamento | Página `/:url-encurtada` → `GET /links/:shortCode` | ✓ |
| 20 | Deve ser possível listar todas as URLs cadastradas | Listagem na rota `/` | ✓ |
| 21 | Deve ser possível incrementar a quantidade de acessos de um link | Contador atualizado via `PATCH /links/:id/access` | ✓ |
| 22 | Deve ser possível baixar um CSV com o relatório dos links criados | Botão de download (abre a URL do CSV via CDN) | ✓ |
| 23 | É obrigatória a criação de uma aplicação React SPA usando Vite como bundler | React 19 + Vite (sem framework) | ✓ |
| 24 | Siga o mais fielmente possível o layout do Figma | Desenvolvimento orientado ao Figma (`web/docs/design-spec.md` + `design-tokens.md`) | ✓ |
| 25 | Trabalhe com boa experiência do usuário (empty state, loading, bloqueio de ações) | Estados de UI em todos os fluxos | ✓ |
| 26 | Foco na responsividade (desktop e celular) | Mobile-first com Tailwind | ✓ |