# Banco de Dados

Documentação do modelo de dados e migrations do Brev.ly. Banco: **PostgreSQL** (obrigatório na avaliação), ORM: **Drizzle**.

## Modelo — tabela `links`

| Coluna | Tipo | Constraints |
|---|---|---|
| `id` | `uuid` | PK — gerado na aplicação com **uuid v7** (`uuidv7`) |
| `original_url` | `text` | NOT NULL |
| `short_code` | `text` | NOT NULL, **UNIQUE** |
| `access_count` | `integer` | NOT NULL, default `0` |
| `created_at` | `timestamp with time zone` | NOT NULL, default `now()` |

- O `short_code` possui índice UNIQUE (regra "URL encurtada já existente").
- `created_at` possui índice **descendente** (`links_created_at_idx`) para a listagem performática (`ORDER BY created_at DESC`).
- Listagem ordenada por `created_at DESC` com paginação.
- Schema definido em `server/src/db/schema.ts`.

## Camadas

| Arquivo | Responsabilidade |
|---|---|
| `src/db/schema.ts` | Definição da tabela (`links`) e tipos `LinkRow`/`NewLinkRow` |
| `src/db/index.ts` | Factory `createDb(connectionString?)` → instância drizzle + pool |
| `src/repositories/links-repository.ts` | Acesso a dados (queries), mapeamento row→`Link`, detecção de violação de unicidade |
| `src/services/links-service.ts` | Regras de negócio (validação, geração de short code, retry) |
| `src/domain/link.ts` | Tipo de domínio `Link` |

## Migrations

- Pasta de migrations: `server/drizzle/`.
- **Gerar** a partir do schema: `pnpm db:generate` (`drizzle-kit generate`).
- **Aplicar** no banco: `pnpm db:migrate` (`drizzle-kit migrate`) — **chave de script exigida pela avaliação**.
- A conexão usa `DATABASE_URL` do `.env` (ver `drizzle.config.ts`).

### Rodando localmente

```bash
# 1. Suba um Postgres (ex.: Docker)
docker compose up -d db   # server/docker-compose.yaml (container brevly-db, porta 5432)
# ou avulso:
docker run -d --name brevly-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=brevly -p 5432:5432 postgres:15-alpine

# 2. Configure o .env
# server/.env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/brevly

# 3. Aplique as migrations
pnpm db:migrate

# 4. Rode a API
pnpm dev
```

> O `docker-compose.yaml` (`server/`) tem o Postgres (`db`) e a imagem da API (`app`). Para desenvolvimento local, sobe-se apenas o `db` e roda-se a API/web no host (`pnpm dev`).