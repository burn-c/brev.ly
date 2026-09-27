# Changelog

Todas as mudanças notáveis do projeto serão documentadas neste arquivo, seguindo o estilo [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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