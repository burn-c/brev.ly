# Docker — Back-end

Containerização do Back-end do Brev.ly (Fastify). Dockerfile multi-stage + docker-compose para desenvolvimento local.

## Dockerfile (`server/Dockerfile`)

Multi-stage (padrão do spec):

| Estágio | Base | O que faz |
|---|---|---|
| `base` | `node:22-alpine` | Configura pnpm via corepack (`packageManager: pnpm@11.9.0`) |
| `dependencies` | `base` | `pnpm install --frozen-lockfile` (com cache `/pnpm/store`) |
| `build` | `base` | Copia `node_modules`, roda `pnpm build` (tsup → `dist/server.mjs`) e `pnpm prune --prod` |
| `production_deployment` | `node:22-alpine` | Imagem final leve: `dist/` + `node_modules` (prod) + `package.json`; `USER node`; `CMD node dist/server.mjs` |

> **Node 22** (não 20): o pnpm 11.9 fixado no projeto exige Node ≥ 22 (`ERR_UNKNOWN_BUILTIN_MODULE` no Node 20). O spec citava "node 20", mas a versão real do runtime do projeto é Node 22+.

> **Migrations:** `drizzle-kit` é devDependency (removido no `pnpm prune --prod`), então `pnpm db:migrate` **não roda dentro do container**. As migrations são aplicadas no deploy (CI, Fase 7) ou localmente contra o banco do compose (ver abaixo).

### Build da imagem

```bash
cd server
docker build -t brevly-server .
docker run --rm -p 3333:3333 \
  -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/brevly \
  brevly-server
```

## docker-compose (`server/docker-compose.yaml`) — dev local

Dois serviços:

| Serviço | Imagem | Observações |
|---|---|---|
| `db` | `postgres:15-alpine` | Porta `5432`, volume `db-data`, healthcheck `pg_isready` |
| `app` | `build: .` | `env_file: .env` + `DATABASE_URL` para o `db` do compose, porta `3333`, aguarda o `db` saudável |

### Uso

**Só o banco (recomendado para dev):** sobe o Postgres e roda a API/web no host.

```bash
cd server
cp .env.example .env   # ajuste as variáveis (PORT, FRONTEND_URL, storage)
docker compose up -d db

# 1. Aplique as migrations (drizzle-kit roda no host, contra a porta 5432 do compose)
pnpm db:migrate

# 2. API em http://localhost:3333 (pnpm dev) + web em http://localhost:5173 (pnpm dev)
curl http://localhost:3333/health
```

**Subir o app no container** (imagem `brevly-server`): `docker compose up -d --build` — o `app` usa `env_file: .env` + `DATABASE_URL` apontando para o `db` do compose.

Para parar e remover volumes: `docker compose down -v`.

> **CSV local (Cloudflare R2):** o `STORAGE_PROVIDER` padrão é `cloudflare`; sem credenciais o CSV retorna `500` (storage lazy). Preencha as vars `CLOUDFLARE_*` no `.env` (ver README → Quickstart) para testar a exportação: o server faz upload para o bucket R2 e o browser abre a URL pública (`CLOUDFLARE_PUBLIC_URL`). R2 e S3 são S3-compatíveis — o `@aws-sdk/client-s3` é o mesmo para ambos.