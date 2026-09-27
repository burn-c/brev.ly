# Infraestrutura Pulumi — Brev.ly

Infraestrutura como código (IaC) do Brev.ly com **Pulumi** (TypeScript + AWS). Stack `brevly-prod`.

## Recursos provisionados

| Recurso | Serviço AWS | Finalidade |
|---|---|---|
| Front-end | S3 `brevly-frontend-web` + CloudFront | Site estático (Vite build) |
| Back-end | ECR `brevly-server` → ECS Fargate + ALB | API Fastify (Dockerfile) |
| Banco | RDS PostgreSQL `db.t4g.micro` | Persistência |
| CSV | S3 `brevly-csv-reports` + CloudFront | CDN para relatórios |
| Rede | VPC `10.0.0.0/16`, 2 AZs, NAT single | Isolamento |
| Estado | S3 `s3://brevly-pulumi-state` | Backend de estado (exclusivo do Brev.ly) |

## Stack e backend de estado

- **Stack:** `brevly-prod` (região `us-east-1`, conta `488182246611`).
- **Backend:** `s3://brevly-pulumi-state` (bucket criado na Fase 6 com versionamento habilitado). Este bucket substitui o `burn-pulumi-state` do ADR-006, que não é acessível a partir desta conta — **registrar ADR-009**.
- Login: `AWS_REGION=us-east-1 pulumi login s3://brevly-pulumi-state`.

## Configuração

```bash
# uma vez por máquina
AWS_REGION=us-east-1 pulumi login s3://brevly-pulumi-state

# config da stack (já versionada em Pulumi.brevly-prod.yaml)
AWS_REGION=us-east-1 pulumi config set brevly-infra:accountId 488182246611
AWS_REGION=us-east-1 pulumi config set --secret brevly-infra:dbPassword <senha>
```

> O namespace de config é o **nome do projeto** (`brevly-infra`), não `brevly`.

## Comandos

```bash
pnpm typecheck      # tsc --noEmit
pnpm preview        # pulumi preview -s brevly-prod
pnpm up             # pulumi up -s brevly-prod
pnpm refresh        # pulumi refresh -s brevly-prod
pnpm destroy        # pulumi destroy -s brevly-prod
```

> O preview exige `AWS_REGION=us-east-1` (o bucket de estado está nessa região). O primeiro preview baixa os plugins do Pulumi (aws/awsx) — demora alguns minutos.

## Versões pinadas

- `@pulumi/aws` **7.35.0** e `@pulumi/awsx` **3.6.0** (fixas, com `overrides` no `pnpm-workspace.yaml`). São as versões com binários já instalados localmente (`~/.pulumi/plugins`) — versões mais novas exigem download e travam em rede lenta. Ver gotcha no [`status.md`](./status.md).

## Estrutura

- `index.ts` — programa Pulumi (VPC, storage front/CSV, CDN, RDS, ECR, ECS+ALB).
- `Pulumi.yaml` — metadados do projeto (runtime nodejs + pnpm).
- `Pulumi.brevly-prod.yaml` — config da stack (region, accountId, dbPassword secreto).
- `package.json` / `pnpm-workspace.yaml` — dependências e pinagem.

## Deploy

O fluxo de deploy (push de imagem, `pulumi up`, sync do front, invalidação do CloudFront) será definido na Fase 7 (CI/CD). Ver [`deploy.md`](./deploy.md).