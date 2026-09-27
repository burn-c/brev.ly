# Changelog

Todas as mudanças notáveis do projeto serão documentadas neste arquivo, seguindo o estilo [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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