# Status do Projeto — Memória de Execução

> **Leia antes de implementar.** Este documento é a memória operacional do Brev.ly: estado atual de cada subprojeto, armadilhas descobertas e próximos passos. Deve ser atualizado no ciclo por tarefa (ver [`workflow.md`](./workflow.md)). Mantenha em PT-BR.
>
> Atualizado: 2026-09-27

## Mapa rápido

- **Repositório:** `brev.ly/` · branch `main` · commits diretos em `main`
- **Contexto:** projeto avaliativo Pós-Graduação TD 360 (FTR Rocketseat) — [`spec.md`](../spec.md)
- **Docs:** [`workflow.md`](./workflow.md) (padrões) · [`decisions.md`](./decisions.md) (ADRs) · [`api.md`](./api.md) · [`database.md`](./database.md)
- **Instruções p/ agentes:** [`AGENTS.md`](../AGENTS.md)

### Progresso do roadmap

- [x] Fase 1 — Setup (monorepo `web/` + `server/` + `infra/`, tooling, envs)
- [x] Fase 2 — Back-end (Drizzle + Postgres, migrations, CRUD)
- [x] Fase 3 — CSV/CDN (storage S3/R2, exportação CSV)
- [~] Fase 4 — Front-end (páginas `/`, `/:url-encurtada`, `*`; fluxos; UX; responsividade) — implementado, falta revisão visual final
- [x] Fase 5 — Docker (Dockerfile multi-stage + docker-compose local)
- [x] Fase 6 — Infra (Pulumi: VPC/ECS/RDS/S3/CloudFront, stack `brevly-prod` — `preview` validado, 50 recursos)
- [~] Fase 7 — CI/CD (GitHub Actions + OIDC) — workflows criados, falta criar repo público + role OIDC + secrets
- [ ] Fase 8 — Testes (suíte completa)
- [ ] Fase 9 — Entrega (checklist 26 itens, README, submissão)

## Estado dos subprojetos

### `server/` — Back-end (Fastify + Drizzle + Postgres) ✅ em execução

- **Rotas:** `POST /links`, `GET /links` (paginado), `GET /links/:shortCode` (retorna link completo), `DELETE /links/:id`, `PATCH /links/:id/access`, `GET /reports/links.csv`, `GET /health`.
- **Camadas:** `src/db/` (schema + client) · `src/repositories/` · `src/services/` (links + report) · `src/routes/` · `src/storage/` (S3/R2) · `src/utils/short-code.ts`.
- **Testes:** 76 passando (Vitest). Scripts: `typecheck`, `lint`, `format:check`, `test`, `build`, `db:migrate`, `db:generate`.
- **Ids:** uuid v7 via `uuidv7` (ADR-001).
- **Docker ✅ (Fase 5):** `Dockerfile` multi-stage (base/dependencies/build/production_deployment) + `docker-compose.yaml` (db postgres:15-alpine + app), validados de ponta a ponta (health, create/list/access dentro dos containers). Ver [`docker.md`](./docker.md).
- **Pendências:** storage em produção real (F6/7).

### `web/` — Front-end (React + Vite + TS + Tailwind) 🎨 design system pronto · 🔨 Fase 4 em andamento

- **Scaffold pronto** (React 19, Vite, TanStack Query, RHF, Zod, React Router, Biome).
- **Design system extraído do Figma ✅ concluído**: tokens, spec das 8 telas e assets commitados.
  - [`web/docs/design-tokens.md`](../web/docs/design-tokens.md) — tokens oficiais do Style Guide (`blue-base`, `blue-dark`, `gray-100..600`, `danger`), já aplicados no `tailwind.config.js`.
  - [`web/docs/design-spec.md`](../web/docs/design-spec.md) — spec detalhada das telas (Links/Empty/Redirect/Not Found × desktop/mobile) e componentes (Button primary/secondary, Icon Button, Input).
  - **Revisão de fidelidade (2026-09-27):** spec reconciliada com o canvas do Figma — corrigidos label do input (`gray-500`), empty state (`gray-500`/CAIXA ALTA), dimensões dos botões (primary full-width, secondary `hug`); documentados botões disabled no empty state, fallback links sublinhados (`blue-base`), gaps da listagem mobile, inputs preenchidos no desktop e cor base `#000000` dos ícones Phosphor (usar `currentColor`).
  - [`web/assets/`](../web/assets/) — `Logo.svg`, `Logo_Icon.svg`, `404.svg` (com `<title>` acessível).
- **Fase 4 em andamento (2026-09-27):** páginas implementadas — `/` (HomePage: formulário RHF+Zod, listagem TanStack Query, delete, CSV, empty/loading/skeleton, copy), `/:url-encurtada` (RedirectPage: GET → PATCH access → `window.location`, fallback "Acesse aqui", 404 → NotFoundPage), `*` (NotFoundPage com 404.svg). Componentes: `Button` (primary/secondary), `IconButton`, `Input` (default/active/error + Warning), `Logo`/`LogoIcon`, `Toast` (Provider + `useToast`). Cliente API em `src/lib/api.ts`. Verificação (lint/typecheck/build) verde.
- **Regra:** agentes de layout devem atualizar esta seção e os docs de `web/docs/` a cada avanço.

### `infra/` — Infraestrutura (Pulumi) ✅ Fase 6 concluída (preview validado)

- Projeto Pulumi `brevly-infra` com **programa completo** em `index.ts`: VPC (2 AZs + NAT), S3 front-end + CSV, CloudFront (CDN), ACM, RDS PostgreSQL `db.t4g.micro`, ECR + ECS Fargate + ALB.
- **Stack `brevly-prod` inicializada** (região `us-east-1`, conta `488182246611`) com config local `accountId` + `dbPassword` secreto. **A config da stack (`Pulumi.brevly-prod.yaml`) não é versionada** (`.gitignore` do infra — repo público) e foi criada com passphrase vazio (`PULUMI_CONFIG_PASSPHRASE=""`). Recriar com `pulumi config set` após clone (ver [`infra-pulumi.md`](./infra-pulumi.md)).
- **Backend de estado:** `s3://brevly-pulumi-state` (**bucket exclusivo do Brev.ly**, versionado — substitui o `burn-pulumi-state` do ADR-006, inacessível desta conta; **ADR-009**).
- **`pulumi preview` validado**: 50 recursos a criar, **zero erros/warnings**. Logs de `up` pendentes de aplicar (só aplicar quando for fazer o deploy real, Fase 7).
- Versões pinadas `@pulumi/aws@7.35.0` + `@pulumi/awsx@3.6.0` (compatíveis com os plugins já instalados localmente).
- Ver [`infra-pulumi.md`](./infra-pulumi.md) e [`deploy.md`](./deploy.md).

## Acesso ao Figma

**Registrado em um único lugar (aqui).** Demais documentos apenas referenciam esta seção.

- **MCP:** servidor `figma` via `figma-developer-mcp` (`--stdio`), configurado **globalmente** no opencode (`~/.config/opencode/opencode.json`) com o token no `environment` — **não versionado no repo**.
- **Arquivo:** `https://www.figma.com/design/WV2Kpt6RdFhUJHV9lCfMGU/` — **"Encurtador de Links (Community)"** (duplicado nos Drafts do usuário).
- **Uso:** antes de implementar/refinar a UI (Fase 4), consultar o Figma (Style Guide + páginas do Projeto) e conferir com [`web/docs/design-tokens.md`](../web/docs/design-tokens.md) e [`web/docs/design-spec.md`](../web/docs/design-spec.md).
- **Nota:** o endpoint remoto `mcp.figma.com` **não aceita** clientes fora da Figma MCP Catalog — usar o `figma-developer-mcp` local (REST API) via o MCP `figma` acima.

## Gotchas operacionais (armadilhas já descobertas)

- **`.env`:** o server carrega `.env` automaticamente via `process.loadEnvFile()` (Node 20.12+) no topo de `src/env.ts` — **zero dependência** de `dotenv` (ADR-007). Se o arquivo não existir (CI/deploy), usa apenas o ambiente do processo.
- **Índice de listagem:** `created_at` tem índice descendente `links_created_at_idx` (item 12 do checklist). Migration `0001_outstanding_sway.sql`.
- **Exaustão de retry de short code:** após 5 colisões na auto-geração, `POST /links` retorna `500` (`ShortCodeGenerationError`), não `409` — `409` só para custom code (ADR-008).
- **Mensagens de erro:** validações de rota e de serviço padronizadas em **PT-BR**.
- **drizzle 0.45:** violação de unicidade vem em `err.cause.code === "23505"` (`DrizzleQueryError`), não em `err.code`. Usar `isUniqueViolation()` (`src/repositories/links-repository.ts`).
- **pg `count(*)`:** retorna `bigint`/string → converter com `Number(...)` no `total`.
- **Biome 2.5:** `recommended` deprecado (usar `preset: "recommended"`); `biome format` sem `--check` já é modo check; `vcs.root: "../"` necessário para achar o `.gitignore` da raiz; schema do biome.json fixado na versão exata do CLI.
- **pnpm 11:** exige `onlyBuiltDependencies` (esbuild/pulumi) → `pnpm-workspace.yaml` em `server/` e `infra/`. **pnpm 11.9 exige Node ≥ 22** — o Dockerfile usa `node:22-alpine` (o "node 20" do spec não roda pnpm 11: `ERR_UNKNOWN_BUILTIN_MODULE`).
- **tsup:** `build` usa entrada `src/server.ts` (evita empacotar testes no `dist/`); `outExtension: ".mjs"`.
- **AWS SDK v3:** `requestChecksumCalculation: "WHEN_REQUIRED"` + `responseChecksumValidation: "WHEN_REQUIRED"` no client (compatibilidade com provedores S3-compatíveis).
- **Ambiente (Docker):** MinIO e LocalStack bloqueados no registro; `s3mock` v3 incompatível (parse XML) e v2 não persiste uploads do SDK v3. **Validação de rede S3/R2 fica para o deploy (F6/7).** O mesmo SDK é comprovado contra R2 no projeto de referência.
- **Storage lazy:** `createStorageProvider` valida na hora do upload (não quebra o `buildApp` sem config).
- **CORS:** origin = `FRONTEND_URL` (default `http://localhost:5173`).
- **Pulumi — namespace de config:** é o **nome do projeto** (`brevly-infra:accountId`), não um nome livre (`brevly:accountId` gera erro "Missing required configuration variable").
- **Pulumi — versões de plugin:** o CLI usa a versão do SDK que o programa importa; se houver resíduo de versões antigas no store pnpm (`node_modules/.pnpm/@pulumi+aws@*`), ele tenta baixar o plugin correspondente e trava em rede lenta. Fixar `@pulumi/aws`/`@pulumi/awsx` via `overrides` no `pnpm-workspace.yaml` + `rm -rf node_modules && pnpm install` resolve. Plugins já instalados ficam em `~/.pulumi/plugins`.
- **Pulumi — login/região:** o bucket de estado `brevly-pulumi-state` está em `us-east-1`; rodar `AWS_REGION=us-east-1` junto com `pulumi` (o `~/.aws/config` usa `us-east-2`, causando `PermanentRedirect`).
- **Pulumi — preview lento:** o `awsx.ec2.Vpc` gera ~30 recursos e o preview faz muitas chamadas AWS; pode levar 5–8 min. Não interromper — rodar em background e aguardar.
- **S3 API:** `s3.BucketV2` está deprecado no `@pulumi/aws@7.35` → usar `s3.Bucket` (mesmas props).

## Decisões recentes

| ADR | Decisão | Detalhe |
|---|---|---|
| [`decisions.md#ADR-001`](./decisions.md) | `id` (uuid v7) para delete/incremento | lookup de redirect idempotente por `shortCode` |
| [`decisions.md#ADR-002`](./decisions.md) | Redirect `302` no front | 2 chamadas: GET → PATCH → `window.location` |
| [`decisions.md#ADR-003`](./decisions.md) | Short code custom + auto base62 7 chars | retry 5x, case-sensitive |
| [`decisions.md#ADR-004`](./decisions.md) | Deploy 100% AWS + Pulumi | ECS Fargate, RDS micro, S3+CloudFront |
| [`decisions.md#ADR-005`](./decisions.md) | Storage com 2 providers | chaves `CLOUDFLARE_*` + `AWS_*` |
| [`decisions.md#ADR-006`](./decisions.md) | Estado Pulumi em S3 centralizado | `s3://burn-pulumi-state` |
| [`decisions.md#ADR-007`](./decisions.md) | `.env` via `process.loadEnvFile` | zero dependência de `dotenv` |
| [`decisions.md#ADR-008`](./decisions.md) | Retry esgotado → `500` | `ShortCodeGenerationError`; `409` só para custom code |
| [`decisions.md#ADR-009`](./decisions.md) | Backend Pulumi exclusivo | `s3://brevly-pulumi-state` (substitui ADR-006) |

## Próximos passos

1. **Fase 7 — CI/CD (finalizar):** criar o repositório público `brev.ly`, a role OIDC `GitHubActionsOIDCRole` e os secrets `AWS_OIDC_ROLE_ARN` + `DB_PASSWORD`; validar os pipelines em um PR real. Ver [`ci-cd.md`](./ci-cd.md).
2. **Aplicar a infra** (`pulumi up`) quando for fazer o deploy real: emitir o certificado ACM (validação DNS), push da imagem ECR, migrations no RDS e sync do front no S3. Ver [`deploy.md`](./deploy.md).
3. Fase 4 — Front-end (finalização): revisão visual contra o `design-spec.md` (Desktop 1366×720 e Mobile 390px) e testes manuais dos fluxos.
4. Fase 8 — Testes e2e/aceite.
5. Fase 9 — Entrega (repo público, push, submissão FTR).

## Como atualizar este documento

- A cada tarefa, atualize: progresso do roadmap, estado dos subprojetos, gotchas novos, próximos passos.
- Se uma decisão nova for tomada, adicione o ADR em [`decisions.md`](./decisions.md) e referencie aqui.
- Commit sugerido: `docs: update project status` (PT-BR no conteúdo).