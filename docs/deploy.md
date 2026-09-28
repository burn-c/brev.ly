# Deploy — Brev.ly

Guia do deploy da aplicação na AWS (Pulumi). Stack `brevly-prod`.

> **Status:** ✅ deploy aplicado e funcional (2026-09-28). O CI/CD (Fase 7) automatiza o deploy em `main` via GitHub Actions + OIDC.

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

O RDS é **privado** (sem acesso externo), então as migrations rodam **via ECS one-off task** (dentro da VPC). O job `migrate` do `deploy.yml` executa o migrator programático do drizzle com `sslmode=no-verify` (RDS usa certificado auto-assinado). Referência manual:

```bash
aws ecs run-task --cluster brevly-cluster --launch-type FARGATE \
  --task-definition <TASK_DEF> \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNETS]}" \
  --overrides '{"containerOverrides":[{"name":"brevly-server","command":["node","-e","...migrate..."],"environment":[{"name":"DATABASE_URL","value":"postgres://postgres:$DB_PASSWORD@$DB_ENDPOINT/brevly?sslmode=no-verify"}]}]}'
```

> O `DATABASE_URL` no ECS usa `?sslmode=no-verify` (RDS com cert auto-assinado; `require` falha com "self-signed certificate in certificate chain").

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

> **Nota atual:** o CloudFront usa o **certificado default** (`cloudfrontDefaultCertificate: true`) — o domínio `cdn.brevly.com.br` ainda não tem DNS/TLS configurado. Para usar TLS custom no futuro: criar o ACM Certificate, validar via DNS (CNAME) e trocar `viewerCertificate` no `infra/index.ts`.

## Estado do deploy (2026-09-28)

- **API (ALB):** `http://brevly-alb-254f025-408442978.us-east-1.elb.amazonaws.com` — health/CRUD validados.
- **Front (CloudFront):** URL `https://d3nkc5rftpck20.cloudfront.net` (certificado default).
- **Banco:** RDS `brevly-db62b3c22` (available), migrations aplicadas via ECS task.
- **Deploy automatizado:** push em `main` → `pulumi up` → ECR → redeploy → migrate (ECS) → sync web + invalidação CloudFront.

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