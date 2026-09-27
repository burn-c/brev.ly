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
- [ ] Fase 4 — Front-end (páginas, UX, responsividade)
- [ ] Fase 5 — Docker (Dockerfile, docker-compose)
- [ ] Fase 6 — Infra (Pulumi: VPC/ECS/RDS/S3/CloudFront)
- [ ] Fase 7 — CI/CD (GitHub Actions + OIDC)
- [ ] Fase 8 — Testes (suíte completa)
- [ ] Fase 9 — Entrega (checklist 26 itens, README, submissão)

## Estado dos subprojetos

### `server/` — Back-end (Fastify + Drizzle + Postgres) ✅ em execução

- **Rotas:** `POST /links`, `GET /links` (paginado), `GET /links/:shortCode` (retorna link completo), `DELETE /links/:id`, `PATCH /links/:id/access`, `GET /reports/links.csv`, `GET /health`.
- **Camadas:** `src/db/` (schema + client) · `src/repositories/` · `src/services/` (links + report) · `src/routes/` · `src/storage/` (S3/R2) · `src/utils/short-code.ts`.
- **Testes:** 75 passando (Vitest). Scripts: `typecheck`, `lint`, `format:check`, `test`, `build`, `db:migrate`, `db:generate`.
- **Ids:** uuid v7 via `uuidv7` (ADR-001).
- **Pendências:** Dockerfile (F5), storage em produção real (F6/7).

### `web/` — Front-end (React + Vite + TS + Tailwind) 🎨 design system pronto · 🔨 Fase 4 pendente

- **Scaffold pronto** (React 19, Vite, TanStack Query, RHF, Zod, React Router, Biome).
- **Design system extraído do Figma ✅ concluído**: tokens, spec das 8 telas e assets commitados.
  - [`web/docs/design-tokens.md`](../web/docs/design-tokens.md) — tokens oficiais do Style Guide (`blue-base`, `blue-dark`, `gray-100..600`, `danger`), já aplicados no `tailwind.config.js`.
  - [`web/docs/design-spec.md`](../web/docs/design-spec.md) — spec detalhada das telas (Links/Empty/Redirect/Not Found × desktop/mobile) e componentes (Button primary/secondary, Icon Button, Input).
  - [`web/assets/`](../web/assets/) — `Logo.svg`, `Logo_Icon.svg`, `404.svg` (com `<title>` acessível).
- **Acesso ao Figma:** ver [seção "Acesso ao Figma"](#acesso-ao-figma) abaixo — fonte de verdade visual (checklist item 24).
- **Fase 4 pendente:** implementar páginas `/`, `/:url-encurtada`, `*` (404) guiadas pelo `design-spec.md`; fluxos de criar/listar/deletar/redirecionar/CSV; empty state, loading, bloqueio de ações, responsividade.
- **Regra:** agentes de layout devem atualizar esta seção e os docs de `web/docs/` a cada avanço.

### `infra/` — Infraestrutura (Pulumi) ⏳ esqueleto

- Projeto Pulumi `brevly-infra` criado; stack `brevly-prod` **ainda não inicializada** (Fase 6).
- Estado planejado: `s3://burn-pulumi-state` (centralizado), região `us-east-1`, conta `488182246611` (ADR-006).

## Acesso ao Figma

**Registrado em um único lugar (aqui).** Demais documentos apenas referenciam esta seção.

- **MCP:** servidor `figma` via `figma-developer-mcp` (`--stdio`), configurado **globalmente** no opencode (`~/.config/opencode/opencode.json`) com o token no `environment` — **não versionado no repo**.
- **Arquivo:** `https://www.figma.com/design/WV2Kpt6RdFhUJHV9lCfMGU/` — **"Encurtador de Links (Community)"** (duplicado nos Drafts do usuário).
- **Uso:** antes de implementar/refinar a UI (Fase 4), consultar o Figma (Style Guide + páginas do Projeto) e conferir com [`web/docs/design-tokens.md`](../web/docs/design-tokens.md) e [`web/docs/design-spec.md`](../web/docs/design-spec.md).
- **Nota:** o endpoint remoto `mcp.figma.com` **não aceita** clientes fora da Figma MCP Catalog — usar o `figma-developer-mcp` local (REST API) via o MCP `figma` acima.

## Gotchas operacionais (armadilhas já descobertas)

- **drizzle 0.45:** violação de unicidade vem em `err.cause.code === "23505"` (`DrizzleQueryError`), não em `err.code`. Usar `isUniqueViolation()` (`src/repositories/links-repository.ts`).
- **pg `count(*)`:** retorna `bigint`/string → converter com `Number(...)` no `total`.
- **Biome 2.5:** `recommended` deprecado (usar `preset: "recommended"`); `biome format` sem `--check` já é modo check; `vcs.root: "../"` necessário para achar o `.gitignore` da raiz; schema do biome.json fixado na versão exata do CLI.
- **pnpm 11:** exige `onlyBuiltDependencies` (esbuild/pulumi) → `pnpm-workspace.yaml` em `server/` e `infra/`.
- **tsup:** `build` usa entrada `src/server.ts` (evita empacotar testes no `dist/`); `outExtension: ".mjs"`.
- **AWS SDK v3:** `requestChecksumCalculation: "WHEN_REQUIRED"` + `responseChecksumValidation: "WHEN_REQUIRED"` no client (compatibilidade com provedores S3-compatíveis).
- **Ambiente (Docker):** MinIO e LocalStack bloqueados no registro; `s3mock` v3 incompatível (parse XML) e v2 não persiste uploads do SDK v3. **Validação de rede S3/R2 fica para o deploy (F6/7).** O mesmo SDK é comprovado contra R2 no projeto de referência.
- **Storage lazy:** `createStorageProvider` valida na hora do upload (não quebra o `buildApp` sem config).
- **CORS:** origin = `FRONTEND_URL` (default `http://localhost:5173`).

## Decisões recentes

| ADR | Decisão | Detalhe |
|---|---|---|
| [`decisions.md#ADR-001`](./decisions.md) | `id` (uuid v7) para delete/incremento | lookup de redirect idempotente por `shortCode` |
| [`decisions.md#ADR-002`](./decisions.md) | Redirect `302` no front | 2 chamadas: GET → PATCH → `window.location` |
| [`decisions.md#ADR-003`](./decisions.md) | Short code custom + auto base62 7 chars | retry 5x, case-sensitive |
| [`decisions.md#ADR-004`](./decisions.md) | Deploy 100% AWS + Pulumi | ECS Fargate, RDS micro, S3+CloudFront |
| [`decisions.md#ADR-005`](./decisions.md) | Storage com 2 providers | chaves `CLOUDFLARE_*` + `AWS_*` |
| [`decisions.md#ADR-006`](./decisions.md) | Estado Pulumi em S3 centralizado | `s3://burn-pulumi-state` |

## Próximos passos

1. **Fase 4 — Front-end:** páginas `/`, `/:url-encurtada`, `*` (404), seguindo os design tokens de `web/docs/`; fluxos de criar/listar/deletar/redirecionar/CSV; empty state, loading, responsividade.
2. Fase 5 — Docker (Dockerfile multi-stage + docker-compose).
3. Fase 6 — Pulumi (stack `brevly-prod`, recursos AWS).
4. Fase 7 — CI/CD (GitHub Actions, OIDC).
5. Fase 8 — Testes e2e/aceite.
6. Fase 9 — Entrega (repositório público, push, submissão FTR).

## Como atualizar este documento

- A cada tarefa, atualize: progresso do roadmap, estado dos subprojetos, gotchas novos, próximos passos.
- Se uma decisão nova for tomada, adicione o ADR em [`decisions.md`](./decisions.md) e referencie aqui.
- Commit sugerido: `docs: update project status` (PT-BR no conteúdo).