# API

Contratos da API REST do Brev.ly (Fastify). Base URL: `http://localhost:3333` (variável `PORT`). Todas as respostas são JSON.

## Endpoints

| Método | Rota | Descrição | Sucesso | Erros |
|---|---|---|---|---|
| `POST` | `/links` | Criar link | `201` link criado | `400` formato inválido · `409` short code existente |
| `GET` | `/links` | Listar links (paginado) | `200` `{ data, meta }` | — |
| `GET` | `/links/:shortCode` | Obter URL original | `200` `{ originalUrl }` | `404` |
| `DELETE` | `/links/:id` | Deletar link | `204` | `400` id inválido · `404` |
| `PATCH` | `/links/:id/access` | Incrementar acessos | `200` `{ accessCount }` | `400` id inválido · `404` |
| `GET` | `/health` | Health check | `200` `{ status, timestamp }` | — |

> Delete e incremento usam `id` (uuid v7). O `shortCode` é usado apenas no lookup de redirecionamento (`GET /links/:shortCode`), que é idempotente (não incrementa). Ver [`decisions.md`](./decisions.md).

## Exemplos

### Criar link

```bash
curl -X POST http://localhost:3333/links \
  -H 'content-type: application/json' \
  -d '{"originalUrl":"https://www.rocketseat.com.br","shortCode":"rs"}'
```

```jsonc
// 201
{ "id": "01a0e412-...", "originalUrl": "https://www.rocketseat.com.br", "shortCode": "rs", "accessCount": 0, "createdAt": "2026-09-27T18:13:02.329Z" }
```

- `shortCode` é opcional: se omitido, é **auto-gerado** (base62, 7 caracteres).
- Formato válido: `^[a-zA-Z0-9]{1,10}$`.
- `originalUrl` deve ser uma URL `http`/`https` válida.

### Erros

```jsonc
// 400 — short code mal formatado ou URL inválida
{ "message": "..." }

// 409 — short code já existente
{ "message": "..." }

// 404 — link não encontrado
{ "message": "..." }
```

### Listar

```bash
curl "http://localhost:3333/links?page=1&pageSize=20"
```

```jsonc
// 200
{ "data": [ /* Link[] */ ], "meta": { "page": 1, "pageSize": 20, "total": 34, "totalPages": 2 } }
```

`page` default `1`; `pageSize` entre `1` e `100`, default `20`. Ordenado por `created_at DESC`.

### Redirecionamento (lookup)

```bash
curl http://localhost:3333/links/rs
# 200 → { "originalUrl": "https://www.rocketseat.com.br" }
```

### Incrementar acessos

```bash
curl -X PATCH http://localhost:3333/links/01a0e412-.../access
# 200 → { "accessCount": 1 }
```

### Deletar

```bash
curl -X DELETE http://localhost:3333/links/01a0e412-...
# 204 (sem corpo)
```

## Modelo de dados (JSON)

```ts
type Link = {
  id: string        // uuid v7
  originalUrl: string
  shortCode: string
  accessCount: number
  createdAt: string // ISO 8601
}
```

## Validação

Entradas validadas com **zod** (body/querystring/params) nas rotas, e regras de negócio no serviço (`src/services/links-service.ts`). CORS habilitado via `@fastify/cors` (origin `FRONTEND_URL`).