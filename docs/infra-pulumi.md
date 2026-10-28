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
| Observabilidade | CloudWatch Logs `/ecs/brevly-server` | Logs do ECS (retenção 7 dias) |
| Segredos | Secrets Manager `brevly/DATABASE_URL` | Connection string do RDS |
| Estado | S3 `s3://brevly-pulumi-state` | Backend de estado (exclusivo do Brev.ly) |

## Stack e backend de estado

- **Stack:** `brevly-prod` (região `us-east-1`, conta `488182246611`).
- **Backend:** `s3://brevly-pulumi-state` (bucket criado na Fase 6 com versionamento habilitado). Este bucket substitui o `burn-pulumi-state` do ADR-006, que não é acessível a partir desta conta — **registrar ADR-009**.
- Login: `AWS_REGION=us-east-1 pulumi login s3://brevly-pulumi-state`.

## Configuração

```bash
# uma vez por máquina
AWS_REGION=us-east-1 pulumi login s3://brevly-pulumi-state

# config da stack (NÃO versionada — ver nota abaixo)
AWS_REGION=us-east-1 PULUMI_CONFIG_PASSPHRASE="" pulumi config set brevly-infra:accountId 488182246611
AWS_REGION=us-east-1 PULUMI_CONFIG_PASSPHRASE="" pulumi config set --secret brevly-infra:dbPassword <senha>
```

> O namespace de config é o **nome do projeto** (`brevly-infra`), não `brevly`.
>
> **A config da stack (`Pulumi.brevly-prod.yaml`) não é versionada** (está no `.gitignore` do `infra/`) porque contém o `dbPassword` criptografado e o repo é público. Após um clone/limpeza, recrie com os comandos acima. A stack e o estado ficam no backend S3 (`s3://brevly-pulumi-state`), então a config pode ser recriada sem perder o deploy.
>
> **Passphrase:** a stack foi criada com `PULUMI_CONFIG_PASSPHRASE=""` (vazio). Para ler/editar a config, use o mesmo valor: `PULUMI_CONFIG_PASSPHRASE="" pulumi ...`.

## Comandos

```bash
pnpm typecheck      # tsc --noEmit
pnpm preview        # pulumi preview -s brevly-prod
pnpm up             # pulumi up -s brevly-prod
pnpm refresh        # pulumi refresh -s brevly-prod
pnpm destroy        # pulumi destroy -s brevly-prod (cru — prefira pnpm teardown)
pnpm teardown       # teardown completo: preflight + destroy + sweep (ver docs/teardown.md)
```

> O preview exige `AWS_REGION=us-east-1` (o bucket de estado está nessa região). O primeiro preview baixa os plugins do Pulumi (aws/awsx) — demora alguns minutos.

## Teardown

`pnpm destroy` sozinho não é suficiente no estado atual: buckets com objetos,
secret em recovery window e log group criado pelo ECS podem falhar ou deixar
órfãos. Use [`scripts/teardown.sh`](../infra/scripts/teardown.sh) via
`pnpm teardown` — ele valida a conta, drena o ECS, esvazia os buckets, roda o
destroy com retries, limpa o que estava fora do state e faz o sweep.
Runbook completo: [`docs/teardown.md`](./teardown.md).

## Hardening para destroy idempotente

- `forceDestroy: true` nos buckets de front/CSV;
- `recoveryWindowInDays: 0` no secret `brevly/DATABASE_URL`;
- `deletionProtection: false` no RDS.

Esses ajustes entram no próximo `pulumi up`; o script já cobre o estado antigo.

> O log group `/ecs/brevly-server` **continua fora do state** de propósito: é
> criado pelo ECS (`awslogs-create-group`) e o script de teardown o remove após
> o destroy. Gerenciá-lo no Pulumi exigiria um `pulumi import` único e poderia
> quebrar o deploy; por isso a limpeza ficou no script.

## Versões pinadas

- `@pulumi/aws` **7.35.0** e `@pulumi/awsx` **3.6.0** (fixas, com `overrides` no `pnpm-workspace.yaml`). São as versões com binários já instalados localmente (`~/.pulumi/plugins`) — versões mais novas exigem download e travam em rede lenta. Ver gotcha no [`status.md`](./status.md).

## Estrutura

- `index.ts` — programa Pulumi (VPC, storage front/CSV, CDN, RDS, ECR, ECS+ALB).
- `Pulumi.yaml` — metadados do projeto (runtime nodejs + pnpm).
- `Pulumi.brevly-prod.yaml` — config da stack (region, accountId, dbPassword secreto) — **não versionado** (`.gitignore`), recriar com `pulumi config set`.
- `package.json` / `pnpm-workspace.yaml` — dependências e pinagem.

## Deploy

O fluxo de deploy (push de imagem, `pulumi up`, sync do front, invalidação do CloudFront) é automatizado pelo CI/CD (Fase 7). Ver [`deploy.md`](./deploy.md) e [`ci-cd.md`](./ci-cd.md). Para desligar tudo e parar os custos, ver [`teardown.md`](./teardown.md).