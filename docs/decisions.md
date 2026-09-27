# Decisões Técnicas (ADRs)

Registro das decisões técnicas do projeto, no formato de Architecture Decision Records (ADRs). Decisões novas devem ser adicionadas aqui quando forem tomadas.

## ADR-001 — Identificador para deletar e incrementar acessos

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

O enunciado não especifica se as operações de deletar e incrementar acessos usam `id` ou URL encurtada, pedindo consistência entre elas.

### Decisão

Usar **`id` (uuid v7)** para `DELETE /links/:id` e `PATCH /links/:id/access`. O `shortCode` é usado apenas no lookup de redirecionamento (`GET /links/:shortCode`), que permanece idempotente.

### Consequências

- Delete e incremento consistentes por `id`, conforme recomendação do enunciado.
- O `GET` de redirect fica cacheável e sem efeito colateral.
- O uuid v7 permite ordenação temporal sem timestamp separado.

## ADR-002 — Status do redirecionamento

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

O redirecionamento de `/:url-encurtada` para a URL original pode usar status 301 (permanente) ou 302 (temporário).

### Decisão

Usar **`302 Found`**, com redirecionamento realizado **no front-end** (SPA), conforme o enunciado descreve a página `/:url-encurtada` como "faz a pesquisa na API".

### Consequências

- Todo clique passa pelo app e contabiliza o acesso corretamente.
- Edições futuras no destino do link refletem imediatamente (sem cache permanente).
- Fluxo de 2 chamadas: `GET /links/:shortCode` → `PATCH /links/:id/access` → `window.location`.

## ADR-003 — Geração do short code

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

As regras "URL encurtada mal formatada" e "URL encurtada já existente" exigem que o usuário possa informar o código, além de auto-geração.

### Decisão

Alias customizado **opcional** (regex `^[a-zA-Z0-9]{1,10}$`, case-sensitive) + **auto-geração** em base62 de **7 caracteres** com retry de até **5 tentativas** em caso de colisão.

### Consequências

- `400` para formato inválido; `409` para código existente (unique index).
- Auto-geração cobre o caso de alias vazio (decisão de produto, permitida pelo enunciado).

## ADR-004 — Deploy e infraestrutura (AWS + Pulumi)

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

A parte DevOps exige Dockerfile, `db:migrate`, `.env.example`, CORS e CSV via CDN. O deploy é livre.

### Decisão

Infraestrutura **100% AWS** provisionada com **Pulumi**:

- Front-end → S3 + CloudFront;
- Back-end → ECR → **ECS Fargate** (usa o Dockerfile avaliado);
- Banco → **RDS PostgreSQL** (`db.t4g.micro` — opção mais barata confiável);
- CSV → S3 + CloudFront (CDN);
- Estado do Pulumi → backend S3 centralizado `s3://burn-pulumi-state`;
- CI/CD → GitHub Actions com autenticação **OIDC**.

### Consequências

- Atende todos os requisitos DevOps da avaliação (S3 é explicitamente citado como CDN válida).
- Custo mensal estimado: ~US$ 15–20 (derrubável com `pulumi destroy`).

## ADR-005 — Camada de storage com dois providers

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

O `.env.example` do enunciado usa chaves `CLOUDFLARE_*`, mas o deploy real é em AWS (S3). R2 e S3 são compatíveis com o mesmo SDK (`@aws-sdk/client-s3`).

### Decisão

Camada de storage com **abstração de provider** (`STORAGE_PROVIDER=cloudflare | aws`). O `.env.example` mantém as chaves `CLOUDFLARE_*` exatamente como o enunciado e adiciona as `AWS_*`.

### Consequências

- Fidelidade ao template do enunciado sem sacrificar o deploy em AWS.
- Troca de provider é configuração pura, sem mudança de código de negócio.

## ADR-006 — Backend de estado do Pulumi

- **Status:** Aceita
- **Data:** 2026-09-27

### Contexto

Centralizar o estado do IaC do curso e evitar dependência de Pulumi Cloud.

### Decisão

Reutilizar o bucket **`s3://burn-pulumi-state`** (já usado pelo `burndev.iac`) como `cloud-url` do stack `brevly-prod`, na conta AWS `488182246611`, região `us-east-1`.

### Consequências

- Todo o estado de infra do curso concentrado em um único backend.
- Consistência com o padrão já estabelecido em `burndev.iac`.