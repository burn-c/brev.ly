# Changelog

Todas as mudanças notáveis do projeto serão documentadas neste arquivo, seguindo o estilo [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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