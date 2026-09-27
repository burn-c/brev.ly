# Deploy — Brev.ly

Guia do deploy da aplicação na AWS (Pulumi). Stack `brevly-prod`.

> **Status:** a infraestrutura está definida (Fase 6) com `pulumi preview` validado (50 recursos). O deploy automatizado (CI/CD) será implementado na Fase 7.

## Arquitetura

| Componente | AWS | Publicação |
|---|---|---|
| Front-end | S3 `brevly-frontend-web` + CloudFront | `https://cdn.brevly.com.br` |
| Back-end | ECR `brevly-server` → ECS Fargate (ALB) | `http://<alb>.elb.amazonaws.com` |
| Banco | RDS PostgreSQL `db.t4g.micro` | interno (VPC) |
| CSV/CDN | S3 `brevly-csv-reports` + CloudFront | via CDN |

## Pré-requisitos

- Pulumi CLI + credenciais AWS (conta `488182246611`, região `us-east-1`).
- Backend de estado `s3://brevly-pulumi-state` (ver [`infra-pulumi.md`](./infra-pulumi.md)).

## Fluxo de deploy (manual, antes da automação)

```bash
cd infra
AWS_REGION=us-east-1 pulumi login s3://brevly-pulumi-state
AWS_REGION=us-east-1 pulumi preview -s brevly-prod   # revisar o diff
AWS_REGION=us-east-1 pulumi up -s brevly-prod         # aplicar
```

Após o `up`, os outputs da stack expõem: `frontendBucketName`, `cdnUrl`, `apiUrl`, `databaseEndpoint`, `ecrRepositoryUrl`.

### 1. Imagem do back-end

```bash
cd server
docker build -t $ECR_REPO_URL:latest .
docker push $ECR_REPO_URL:latest
```

### 2. Aplicar migrations

```bash
# aponta para o endpoint do RDS (output databaseEndpoint)
DATABASE_URL=postgres://postgres:$DB_PASSWORD@$DB_ENDPOINT/brevly pnpm db:migrate
```

### 3. Subir o front-end

```bash
cd web
pnpm build
aws s3 sync dist/ s3://brevly-frontend-web --delete
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

### 4. Variáveis do back-end (ECS task)

Definidas no `infra/index.ts`: `DATABASE_URL`, `FRONTEND_URL=https://cdn.brevly.com.br`, `STORAGE_PROVIDER=aws`, `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_CDN_URL`. As credenciais `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` do server são injetadas via role IAM do ECS (execution/task role).

## Certificado TLS

O ACM Certificate (`cdn.brevly.com.br`) usa validação DNS — antes do `pulumi up` final, criar o registro CNAME (exposto no output do Certificate) no DNS e aguardar a emissão.

## Custos estimados

| Recurso | ~US$/mês |
|---|---|
| RDS PostgreSQL micro | 12–15 |
| ECS Fargate (mínimo) | 5–9 |
| S3 + CloudFront + ECR | < 1 |
| **Total** | **~15–20** |

> Sem uso ativo: `pulumi destroy -s brevly-prod` zera os custos.

## Roteiro para a Fase 7 (CI/CD)

1. GitHub Actions com OIDC (role `GitHubActionsOIDCRole`).
2. `pulumi up` no deploy; build+push da imagem ECR; sync do front + invalidação CloudFront; `db:migrate`.