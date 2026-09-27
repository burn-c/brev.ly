# brevly-infra

Infraestrutura como código (IaC) do **Brev.ly** usando [Pulumi](https://www.pulumi.com/) + AWS TypeScript.

## Propósito

Provisiona a infraestrutura AWS do Brev.ly: front-end (S3 + CloudFront), back-end (ECR → ECS Fargate com ALB), banco (RDS PostgreSQL) e CDN para relatórios CSV.

> **Status:** Fase 1 (Setup). Nesta fase o projeto contém apenas o esqueleto Pulumi — **nenhum recurso AWS é criado**. A infraestrutura real será implementada na **Fase 6**.

## Stack

- **Stack:** `brevly-prod`
- **Região:** `us-east-1`
- **Backend de estado:** `s3://burn-pulumi-state` (configuração adiada para a Fase 6)

## Comandos

```bash
pnpm install        # instala dependências
pnpm typecheck      # typecheck TypeScript (tsc --noEmit)
pnpm preview        # pulumi preview -s brevly-prod
pnpm up             # pulumi up -s brevly-prod
pnpm refresh        # pulumi refresh -s brevly-prod
pnpm destroy        # pulumi destroy -s brevly-prod
```

> Os comandos `preview`/`up`/`refresh`/`destroy` exigem credenciais AWS e backend de estado e serão utilizados a partir da Fase 6.

## Estrutura

- `Pulumi.yaml` — metadados do projeto Pulumi
- `index.ts` — programa Pulumi (vazio nesta fase)
- `package.json` — dependências (`@pulumi/pulumi`, `@pulumi/aws`, `@pulumi/awsx`)
- `tsconfig.json` — opções do TypeScript (strict)