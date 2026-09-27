# AGENTS.md — Instruções para agentes

Instruções operacionais para agentes que trabalham neste repositório. Leia o [`docs/workflow.md`](docs/workflow.md) e o [`spec.md`](spec.md) antes de implementar.

## Contexto do projeto

- **Brev.ly** — encurtador de URLs Full Stack, projeto avaliativo da pós-graduação (TD 360 — FTR Rocketseat).
- Estrutura: `web/` (React + Vite + TS + Tailwind), `server/` (Fastify + Drizzle + Postgres), `infra/` (Pulumi — AWS).
- Requisitos e checklist de compliance (26 itens oficiais): [`spec.md`](spec.md).

## Ciclo por tarefa (obrigatório)

1. **Implementar** — código focado em uma única responsabilidade.
2. **Verificar** — rodar scripts do package.json (lint, format:check, typecheck, build, test) e `pulumi preview` quando tocar `infra/`.
3. **Aprovar** — conferir o diff contra o `spec.md` e o checklist de compliance.
4. **Documentar** — atualizar `docs/`, `README.md` e `CHANGELOG.md` **apenas se** a mudança for notável.
5. **Commitar** — direto em `main`, commit atômico + semântico.

## Convenções

- **Commits**: Conventional Commits em **inglês**, 1 conceito = 1 commit. Tipos: `feat`, `fix`, `test`, `docs`, `refactor`, `build`, `ci`, `chore`. Escopos: `web`, `server`, `api`, `db`, `infra`, `docker`, `ci`, `readme`, `docs`, `changelog`.
- **Docs/Changelog**: em **PT-BR**. CHANGELOG estilo Keep a Changelog (raiz).
- **Lint/format**: Biome (espaço 2, aspas duplas, sem ponto-e-vírgula, lineWidth 100).
- **Verificação obrigatória antes de declarar tarefa concluída**: `lint`, `format:check`, `typecheck`, `build`, `test` — e `pulumi preview` para infra.
- **Nunca** commit sem executar a verificação e confirmar saída sem erros.

## Comandos úteis

- Web: `pnpm lint` · `pnpm format:check` · `pnpm typecheck` · `pnpm build` · `pnpm test` (em `web/`)
- Server: `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build` · `pnpm db:migrate` (em `server/`)
- Infra: `pulumi preview -s brevly-prod` · `pulumi up -s brevly-prod` (em `infra/`)