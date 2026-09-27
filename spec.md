# Spec — Brev.ly

Encurtador de URLs Full Stack — Projeto avaliativo da Pós-Graduação Full-Stack com IA (Tech Developer 360º) da Faculdade de Tecnologia Rocketseat.

## 1. Visão Geral e Contexto

| Campo | Valor |
|---|---|
| **Projeto** | Desafio Prático: Brev.ly |
| **Módulo** | Fase 1 — Avaliação: Fundamentos Técnicos e Estratégicos |
| **Curso** | Pós-Graduação Full-Stack com IA — Tech Developer 360º (Turma 02/2026) |
| **Tipo** | Desafio avaliativo (correção automática, 2 tentativas) |
| **Áreas** | Frontend, Backend e DevOps |
| **Nível** | Intermediário |
| **Stack** | Node.js, React, TypeScript |

**Objetivo:** desenvolver uma aplicação Full Stack de encurtador de URL que permita:

- 🔗 Encurtar links (com validação de formato e de duplicidade);
- 📄 Listar e visualizar todos os links encurtados;
- ❌ Deletar links;
- 📊 Acompanhar a quantidade de acessos de cada link;
- 📁 Exportar um relatório dos links em CSV, servido via CDN;
- 🔀 Redirecionar corretamente o link encurtado para a URL original.

O projeto consolida conceitos de Frontend, Backend e DevOps aprendidos no módulo, servindo como base prática para a disciplina.

### Recursos oficiais

- **Layout (Figma):** https://www.figma.com/community/file/1477335071553579816
- **Exemplo de resultado final:** https://www.youtube.com/watch?v=asZn42mUOmw
- **Docs (Notion):** https://docs-rocketseat.notion.site/Desafio-Fase-1-Brev-ly-1a8395da577080649fb5d515416e9e34
- **Referência oficial (Upload Widget):**
  - Front: https://github.com/rocketseat-education/ftr-pos-360-upload-widget-web
  - Back: https://github.com/rocketseat-education/ftr-pos-360-upload-widget-server

### Critérios de entrega

- Repositório **GitHub público**;
- Deve conter **duas subpastas**:
  - `web/` → resolução completa do Front-end;
  - `server/` → resolução completa dos desafios Back-end e DevOps;
- `infra/` → infraestrutura como código (Pulumi) — pasta extra, não conflita com a correção;
- Enviar o link do repositório na plataforma FTR;
- Funcionalidades extras ("Quer ir além?") devem ficar em **branch separada**.

---

## 2. Checklist de Compliance (26 itens oficiais)

Mapeamento dos itens de correção automática para a implementação do projeto. Usar como rastreabilidade antes de cada envio.

| # | Item (checklist oficial) | Implementação |
|---|---|---|
| 1 | `[Back-end]` | API Fastify em `server/` |
| 2 | Deve ser possível criar um link | `POST /links` |
| 3 | Não deve ser possível criar link com URL encurtada mal formatada | Validação zod + regex `^[a-zA-Z0-9]{1,10}$` → `400` |
| 4 | Não deve ser possível criar link com URL encurtada já existente | Unique index + conflito → `409` |
| 5 | Deve ser possível deletar um link | `DELETE /links/:id` |
| 6 | Deve ser possível obter a URL original por meio de uma URL encurtada | `GET /links/:shortCode` |
| 7 | Deve ser possível listar todas as URLs cadastradas | `GET /links` (paginação) |
| 8 | Deve ser possível incrementar a quantidade de acessos de um link | `PATCH /links/:id/access` |
| 9 | Deve ser possível exportar os links criados em um CSV | `GET /reports/links.csv` |
| 10 | Deve ser possível acessar o CSV por meio de uma CDN (S3, R2, etc.) | Upload para S3 + CloudFront (ou R2) |
| 11 | Deve ser gerado um nome aleatório e único para o arquivo | `crypto.randomUUID()` no nome do objeto |
| 12 | Deve ser possível realizar a listagem de forma performática | Paginação + índice em `created_at`/`short_code` |
| 13 | O CSV deve ter campos: URL original, URL encurtada, contagem de acessos e data de criação | Colunas do CSV |
| 14 | `[Front-end]` | SPA em `web/` |
| 15 | Deve ser possível criar um link | Formulário na rota `/` |
| 16 | Não deve ser possível criar link com encurtamento mal formatado | Validação no cliente (zod) + `400` da API |
| 17 | Não deve ser possível criar link com encurtamento já existente | `409` da API exibido no formulário |
| 18 | Deve ser possível deletar um link | Ação de deletar na listagem |
| 19 | Deve ser possível obter a URL original por meio do encurtamento | Página `/:url-encurtada` → `GET /links/:shortCode` |
| 20 | Deve ser possível listar todas as URLs cadastradas | Listagem na rota `/` |
| 21 | Deve ser possível incrementar a quantidade de acessos de um link | Contador atualizado via `PATCH /links/:id/access` |
| 22 | Deve ser possível baixar um CSV com o relatório dos links criados | Botão de download (abre URL do CSV via CDN) |
| 23 | É obrigatória a criação de uma aplicação React SPA usando Vite como bundler | React 19 + Vite (sem framework) |
| 24 | Siga o mais fielmente possível o layout do Figma | Desenvolvimento orientado ao Figma (aba Style Guide) |
| 25 | Trabalhe com boa experiência do usuário (empty state, loading, bloqueio de ações) | Estados de UI em todos os fluxos |
| 26 | Foco na responsividade (desktop e celular) | Mobile-first com Tailwind |

---

## 3. Requisitos Funcionais

### 3.1 Back-end

- **Criar link**
  - Entrada: `originalUrl` (obrigatória, http/https válida) e `shortCode` (opcional).
  - Se `shortCode` informado: validar formato `^[a-zA-Z0-9]{1,10}$` → se inválido, `400`.
  - Se `shortCode` já existir: `409 Conflict`.
  - Se `shortCode` omitido: **auto-gerar** em base62 com **7 caracteres** (case-sensitive), com **retry de até 5 tentativas** em caso de colisão; esgotadas as tentativas, `500`.
- **Deletar link** — por `id` (uuid v7); `204 No Content`; `404` se inexistente.
- **Obter URL original por encurtada** — por `shortCode`; `200 { originalUrl }`; `404` se inexistente. Endpoint **idempotente** (não incrementa).
- **Listar links** — paginado (`page`, `pageSize`), ordenado por `created_at DESC`; resposta com metadados de paginação. Performático via índices.
- **Incrementar acessos** — por `id`; `200 { accessCount }`; `404` se inexistente.
- **Exportar CSV** — consulta em lotes (stream), gera arquivo com nome aleatório e único, faz upload para o storage (S3/R2) e retorna a **URL pública via CDN**.

> **Decisão de identidade (enunciado):** delete e incremento usam **`id`** (consistência mantida). O `shortCode` é usado apenas no lookup de redirecionamento.

### 3.2 Front-end

- **Criar link**: formulário com URL original + short code opcional; validação no cliente e na API; feedback de erro (formato/duplicado) e de sucesso (link gerado, botão copiar).
- **Deletar link**: com confirmação; atualização otimista da lista.
- **Listar links**: tabela (desktop) / cards (mobile) com URL original, URL encurtada (copiável), data de criação e contador de acessos.
- **Incrementar acessos**: ao acessar `/:url-encurtada`, o front busca a URL original (`GET /links/:shortCode`), incrementa (`PATCH /links/:id/access`) e redireciona (`window.location`, status `302`).
- **Baixar CSV**: botão que abre a URL pública do CSV (via CDN).

### 3.3 Regras de UX (obrigatórias)

- Empty state quando não houver links cadastrados;
- Ícones de carregamento (skeletons/spinner) durante requisições;
- Bloqueio de ações conforme estado (ex.: botão desabilitado durante submit, lista com loading);
- Toasts/feedback para erros e sucessos.

---

## 4. Modelo de Dados

### Tabela `links` (PostgreSQL)

| Coluna | Tipo | Constraints |
|---|---|---|
| `id` | `uuid` (v7) | PK, `default gen_random_uuid()` |
| `original_url` | `text` | NOT NULL, check http/https |
| `short_code` | `varchar(10)` | NOT NULL, **UNIQUE** |
| `access_count` | `integer` | NOT NULL, `default 0` |
| `created_at` | `timestamptz` | NOT NULL, `default now()` |

**Índices:**
- Unique index em `short_code` (garante unicidade → regra "já existente");
- Index em `created_at DESC` (listagem performática);
- Index em `original_url` (opcional, para deduplicação futura).

**ORM:** Drizzle ORM, com `drizzle-kit` para gerar/aplicar migrations.

---

## 5. Arquitetura

### Estrutura do repositório

```
brev.ly/
├── web/            # Front-end: React 19 + Vite + TypeScript + Tailwind
│   ├── .env.example
│   └── src/
├── server/         # Back-end + DevOps: Fastify + Drizzle + Postgres
│   ├── Dockerfile
│   ├── docker-compose.yaml     # Postgres + app (dev local)
│   ├── .env.example
│   ├── drizzle.config.ts
│   └── src/
├── infra/          # IaC: Pulumi (stack brevly-prod)
└── .github/workflows/          # CI/CD
```

### Fluxos principais

**1. Encurtar link**
```
Usuário → web/ → POST /links → server → Postgres (valida formato + unicidade)
        → 201 { id, originalUrl, shortCode, accessCount, createdAt }
```

**2. Redirecionamento (página /:url-encurtada)**
```
Usuário acessa brev.ly/abc123 → web/ → GET /links/abc123  (200 originalUrl)
                                    → PATCH /links/:id/access (incrementa)
                                    → window.location = originalUrl (302)
```
> O redirect acontece **no front** (SPA), conforme o enunciado descreve a página `/:url-encurtada` como "faz a pesquisa na API".

**3. Exportação CSV**
```
Usuário clica "Baixar CSV" → web/ → GET /reports/links.csv
→ server consulta links em lotes (stream) → gera CSV → upload S3/R2 (nome aleatório)
→ 200 { url: <CDN_PUBLIC_URL>/<nome-aleatorio>.csv } → web abre a URL
```

### Stack consolidada

| Camada | Tecnologia | Obrigatório/Flexível |
|---|---|---|
| Back-end | TypeScript, Fastify, Drizzle, Postgres | Obrigatório |
| Back-end | zod (validação), `@fastify/cors` | Boas práticas |
| Front-end | TypeScript, React, Vite (sem framework) | Obrigatório |
| Front-end | TailwindCSS, TanStack Query, React Hook Form, Zod, React Router, lucide-react | Flexível |
| DevOps | Docker, Docker Compose, Pulumi, GitHub Actions | Exigido Dockerfile + CDN |

---

## 6. API (Fastify)

### Endpoints

| Método | Rota | Descrição | Respostas |
|---|---|---|---|
| `POST` | `/links` | Criar link | `201` link criado · `400` formato inválido · `409` short code existente |
| `GET` | `/links` | Listar links (paginado) | `200` `{ data, meta }` |
| `GET` | `/links/:shortCode` | Obter URL original | `200` `{ originalUrl }` · `404` |
| `DELETE` | `/links/:id` | Deletar link | `204` · `404` |
| `PATCH` | `/links/:id/access` | Incrementar acessos | `200` `{ accessCount }` · `404` |
| `GET` | `/reports/links.csv` | Exportar CSV via CDN | `200` `{ url }` |
| `GET` | `/health` | Health check | `200` `{ status: "ok" }` |

### Contratos

**`POST /links`**
```jsonc
// request
{ "originalUrl": "https://exemplo.com/caminho", "shortCode": "abc123" } // shortCode opcional

// 201
{ "id": "0192...", "originalUrl": "https://exemplo.com/caminho", "shortCode": "abc123",
  "accessCount": 0, "createdAt": "2026-09-27T10:00:00Z" }

// 400
{ "message": "URL encurtada mal formatada" }

// 409
{ "message": "URL encurtada já existente" }
```

**`GET /links`**
```jsonc
// 200
{ "data": [ { "id": "…", "originalUrl": "…", "shortCode": "…", "accessCount": 12, "createdAt": "…" } ],
  "meta": { "page": 1, "pageSize": 20, "total": 34, "totalPages": 2 } }
```

**`GET /reports/links.csv`** — o CSV contém as colunas:
```
url_original,url_encurtada,contagem_de_acessos,data_de_criacao
```
Resposta: `200 { "url": "https://cdn.example.com/relatorio-<uuid>.csv" }`.

### Regras transversais

- **CORS habilitado** via `@fastify/cors` (permitir `VITE_FRONTEND_URL`);
- Validação de entrada com **zod**;
- Tratamento centralizado de erros (resposta JSON consistente);
- `GET /links/:shortCode` idempotente (sem efeito colateral).

---

## 7. Front-end (React + Vite)

### Páginas (3)

| Rota | Conteúdo |
|---|---|
| `/` | Formulário de cadastro + listagem dos links |
| `/:url-encurtada` | Busca na API pela URL encurtada, incrementa acesso e redireciona |
| `*` | Página de recurso não encontrado (404) |

### Stack

- React 19 + TypeScript + Vite (sem framework);
- React Router (modo library) para as 3 rotas;
- TailwindCSS (mobile-first);
- TanStack Query (fetch/cache/estados de loading e erro);
- React Hook Form + Zod (validação de formulário);
- lucide-react (ícones); toasts para feedback.

### Estados de UX

- **Loading**: skeletons na listagem, spinner no submit, bloqueio de botões;
- **Empty state**: mensagem + ilustração quando não há links;
- **Erro**: mensagens de validação (formato/duplicado) e toasts de falha;
- **Sucesso**: toast + link copiável.

### Variáveis de ambiente (`.env.example`)

```bash
VITE_FRONTEND_URL=
VITE_BACKEND_URL=
```

---

## 8. DevOps e Infraestrutura (AWS + Pulumi)

### Exigências do enunciado

- **`Dockerfile`** (boas práticas) para gerar a imagem do back-end;
- Script com a chave exata **`db:migrate`**;
- **`.env.example`** com as chaves necessárias;
- **CORS** habilitado;
- CSV acessível via **CDN** (S3 ou R2).

### Variáveis de ambiente — Back-end (`.env.example`)

```bash
PORT=
DATABASE_URL=

# Storage — suporte a Cloudflare R2 ou AWS S3
STORAGE_PROVIDER=cloudflare   # cloudflare | aws

# Cloudflare R2 (fidelidade ao enunciado)
CLOUDFLARE_ACCOUNT_ID=""
CLOUDFLARE_ACCESS_KEY_ID=""
CLOUDFLARE_SECRET_ACCESS_KEY=""
CLOUDFLARE_BUCKET=""
CLOUDFLARE_PUBLIC_URL=""

# AWS S3 (deploy real)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION=""
AWS_S3_BUCKET=""
AWS_CDN_URL=""
```

> **Justificativa:** R2 e S3 são compatíveis com o mesmo `@aws-sdk/client-s3`. A camada de storage abstrai o provider; o `.env.example` mantém as chaves `CLOUDFLARE_*` exatamente como no enunciado (fidelidade) e adiciona as `AWS_*` para o deploy.

### Docker

**`server/Dockerfile`** — multi-stage (padrão Upload Widget):
1. `base`: node 20 + pnpm;
2. `dependencies`: `pnpm install`;
3. `build`: build + `pnpm prune --prod`;
4. `production_deployment`: imagem final leve (dist + node_modules prod).

**`server/docker-compose.yaml`** (dev local): serviços `db` (postgres:15-alpine) e `app`, com variáveis de ambiente do R2/S3.

### Deploy AWS (Pulumi em `infra/`)

| Recurso | Serviço AWS | Finalidade |
|---|---|---|
| Front-end | S3 + CloudFront | Site estático (Vite build) |
| Back-end | ECR → **ECS Fargate** (com ALB) | API Fastify (usa o Dockerfile) |
| Banco | **RDS PostgreSQL** (`db.t4g.micro`) | Persistência |
| CSV | S3 + CloudFront | CDN para relatórios |
| Estado Pulumi | `s3://burn-pulumi-state` | Backend centralizado de estado |
| CI/CD | GitHub Actions (OIDC) | Deploy automatizado |

**Configuração Pulumi:**
- Projeto: `infra/` no repositório (runtime nodejs + pnpm, `@pulumi/aws` + `@pulumi/awsx`);
- Stack: `brevly-prod`;
- Estado: `cloud-url: s3://burn-pulumi-state` (reutiliza o backend centralizado já usado em `burndev.iac`);
- Região: `us-east-1`; conta AWS `488182246611`;
- Credenciais CI: role **OIDC** `GitHubActionsOIDCRole` (padrão do upload-widget-server).

### CI/CD (GitHub Actions)

- **PR**: lint (Biome) + typecheck + testes + `pulumi preview` (stack `brevly-prod`);
- **main**: 
  1. Server: build + push imagem → **ECR** (tag `sha`);
  2. `pulumi up` → atualiza task definition/Fargate (redeploy);
  3. Web: `vite build` → sync **S3** + invalidação **CloudFront**;
  4. `db:migrate` executado no deploy (init/migration).

### Custos estimados

| Recurso | ~US$/mês |
|---|---|
| RDS PostgreSQL micro | 12–15 |
| ECS Fargate (mínimo) | 5–9 |
| S3 + CloudFront + ECR | < 1 |
| **Total** | **~15–20** |

> Sem uso ativo, derrubar a stack com `pulumi destroy` zera os custos.

---

## 9. Testes e Critérios de Aceite

### Testes (Vitest — `server/`)

- **Unit**: geração de short code (base62, colisão/retry), validação zod, serviço de links;
- **Integração**: CRUD de links contra Postgres de teste; upload do CSV para storage (mock);
- **e2e**: `app.inject()` do Fastify cobrindo os fluxos da API.

### Critérios de aceite (por item do checklist)

| Requisito | Critério de aceite |
|---|---|
| Criar link | `POST /links` retorna `201`; registro persistido no Postgres |
| Short code mal formatado | `POST /links` com `shortCode` inválido retorna `400` |
| Short code existente | `POST /links` com `shortCode` repetido retorna `409` |
| Deletar | `DELETE /links/:id` retorna `204` e remove o registro |
| Obter URL original | `GET /links/:shortCode` retorna `originalUrl` correta |
| Listar | `GET /links` retorna lista paginada ordenada por criação |
| Incrementar acessos | `PATCH /links/:id/access` aumenta `accessCount` em 1 |
| Exportar CSV | `GET /reports/links.csv` retorna URL pública (CDN) com nome único |
| CSV via CDN | URL acessível publicamente, contendo os 4 campos |
| Frontend fluxos | Fluxos de criar/listar/deletar/redirecionar/CSV funcionando na UI |

---

## 10. Roadmap

| Fase | Escopo | Marco |
|---|---|---|
| **Fase 1 — Setup** | Monorepo `web/` + `server/` + `infra/`, package managers, lint, envs | Repo no GitHub |
| **Fase 2 — Back-end** | Drizzle + Postgres, migrations, CRUD de links, `db:migrate` | API funcional |
| **Fase 3 — CSV/CDN** | Geração de CSV, storage provider (S3/R2), nome único | CSV via CDN |
| **Fase 4 — Front-end** | Style Guide (Figma), páginas, estados de UX, responsividade | UI completa |
| **Fase 5 — Docker** | Dockerfile multi-stage, docker-compose local | Imagem do server |
| **Fase 6 — Infra** | Pulumi: VPC/ECS/RDS/S3/CloudFront, stack `brevly-prod` | Infra provisionada |
| **Fase 7 — CI/CD** | GitHub Actions (OIDC): PR preview + deploy main | Deploy automatizado |
| **Fase 8 — Testes** | Vitest, critérios de aceite | Suíte verde |
| **Fase 9 — Entrega** | Checklist (26 itens), README, submissão na plataforma | Aprovado |

---

## 11. Referências

- Figma — layout oficial Brev.ly: https://www.figma.com/community/file/1477335071553579816
- Vídeo — exemplo de resultado final: https://www.youtube.com/watch?v=asZn42mUOmw
- Docs Notion — Desafio Fase 1 Brev.ly: https://docs-rocketseat.notion.site/Desafio-Fase-1-Brev-ly-1a8395da577080649fb5d515416e9e34
- Upload Widget (referência oficial): https://github.com/rocketseat-education/ftr-pos-360-upload-widget-web e https://github.com/rocketseat-education/ftr-pos-360-upload-widget-server
- Exemplos de colegas: `geovaneborba/ftr-pos-desafio-brev-ly-fullstack`, `profdangarcia/ftr-first-challenge`, `danilo-fq/brevly`