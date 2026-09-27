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

Pré-requisitos: Node.js 20+ · pnpm 9+ · (infra) Pulumi CLI + credenciais AWS.

### Back-end

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

Scripts principais: `dev` · `build` · `preview` · `typecheck` · `lint`

### Infraestrutura

```bash
cd infra
pnpm install
pulumi preview -s brevly-prod   # após a Fase 6 (stack ainda não criada)
```

## Status

Fases do roadmap em [`spec.md`](./spec.md#10-roadmap):

- [x] **Fase 1 — Setup** (monorepo `web/` + `server/` + `infra/`, tooling, envs)
- [x] **Fase 2 — Back-end** (Drizzle + Postgres, migrations, CRUD)
- [x] **Fase 3 — CSV/CDN** (storage S3/R2, exportação CSV, nome único via CDN)
- [~] Fase 4 — Front-end (páginas `/`, `/:url-encurtada`, `*`; fluxos; UX) — implementado, aguardando revisão visual final
- [x] **Fase 5 — Docker** (Dockerfile multi-stage + docker-compose local)
- [x] **Fase 6 — Infra (Pulumi)** (VPC/ECS/RDS/S3/CloudFront, stack `brevly-prod` — preview validado)
- [ ] Fase 7 — CI/CD
- [ ] Fase 8 — Testes
- [ ] Fase 9 — Entrega