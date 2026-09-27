# brevly-infra

Infraestrutura como código (IaC) do **Brev.ly** usando [Pulumi](https://www.pulumi.com/) + AWS TypeScript.

## Propósito

Provisiona a infraestrutura AWS do Brev.ly: front-end (S3 + CloudFront), back-end (ECR → ECS Fargate com ALB), banco (RDS PostgreSQL) e CDN para relatórios CSV.

> **Status:** Fase 6 concluída — programa completo em `index.ts`, stack `brevly-prod` inicializada e `pulumi preview` validado (50 recursos). Ver [`docs/infra-pulumi.md`](../docs/infra-pulumi.md).

## Stack

- **Stack:** `brevly-prod`
- **Região:** `us-east-1`
- **Backend de estado:** `s3://brevly-pulumi-state` (exclusivo do Brev.ly — ADR-009)

## Comandos

```bash
pnpm install        # instala dependências
pnpm typecheck      # typecheck TypeScript (tsc --noEmit)
pnpm preview        # pulumi preview -s brevly-prod
pnpm up             # pulumi up -s brevly-prod
pnpm refresh        # pulumi refresh -s brevly-prod
pnpm destroy        # pulumi destroy -s brevly-prod
```

> O login usa o backend S3: `AWS_REGION=us-east-1 pulumi login s3://brevly-pulumi-state` (bucket em us-east-1).

## Estrutura

- `Pulumi.yaml` — metadados do projeto Pulumi
- `Pulumi.brevly-prod.yaml` — config da stack (`accountId`, `dbPassword` secreto)
- `index.ts` — programa Pulumi (VPC, storage, CDN, RDS, ECR, ECS+ALB)
- `package.json` / `pnpm-workspace.yaml` — dependências e pinagem de versões
- `tsconfig.json` — opções do TypeScript (strict)