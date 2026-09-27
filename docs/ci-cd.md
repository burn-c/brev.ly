# CI/CD — Brev.ly

Pipelines de **GitHub Actions** para o Brev.ly. Autenticação AWS via **OIDC** (sem credenciais estáticas).

## Visão geral

| Workflow | Trigger | O que faz |
|---|---|---|
| `pr.yml` | Pull request para `main` | Server: lint/format/typecheck/test/build · Web: lint/format/typecheck/build · Pulumi preview (`brevly-prod`) |
| `deploy.yml` | Push em `main` | 1. Build+push imagem server → ECR (`sha`) · 2. `pulumi up` · 3. `db:migrate` · 4. Sync web → S3 + invalidação CloudFront |

## Pré-requisitos (uma vez)

### 1. Repositório no GitHub

Criar o repositório público `brev.ly` e subir o código (Fase 9). Alternativa temporária: usar o repo existente do usuário.

### 2. Role OIDC (AWS)

O workflow assume uma role IAM via OIDC. Criar com o AWS CLI:

```bash
# criar provider (uma vez por conta)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# trust policy da role (ajustar repo)
# "burn-c/brev.ly"
```

A role `GitHubActionsOIDCRole` deve ter as permissões da infra (VPC/ECS/RDS/S3/CloudFront/ECR/ACM/Pulumi) e o trust com o repo. Armar o ARN em `AWS_OIDC_ROLE_ARN`.

### 3. Secrets do repositório

| Secret | Uso |
|---|---|
| `AWS_OIDC_ROLE_ARN` | Role OIDC assumida pelo `configure-aws-credentials` |
| `DB_PASSWORD` | Senha do RDS (mesma de `brevly-infra:dbPassword` no Pulumi) |

```bash
gh secret set AWS_OIDC_ROLE_ARN
gh secret set DB_PASSWORD
```

## Notas operacionais

- **Backend de estado:** `s3://brevly-pulumi-state` (bucket exclusivo — ADR-009). Login no CI: `pulumi login s3://brevly-pulumi-state` com `AWS_REGION=us-east-1`.
- **Passphrase da stack:** vazio (`PULUMI_CONFIG_PASSPHRASE=""`). A config da stack (`Pulumi.brevly-prod.yaml`) **não é versionada**; o workflow recria `accountId` + `dbPassword` antes do preview/up.
- **Config da stack no CI:** o `pulumi config set` roda no `working-directory: infra` com o backend S3 já logado — os valores entram como argumento/env, sem secret no YAML.
- **Imagem do server:** tag `${{ github.sha }}` no ECR `brevly-server`. O `pulumi up` usa a tag `latest` (a task definition referencia `:latest`); para apontar para o `sha`, ajustar o `image` no `infra/index.ts` ou re-taggear no ECR.
- **`db:migrate`:** roda após o `pulumi up`, lendo `databaseEndpoint` do output da stack; `drizzle-kit` é devDependency instalado no job.
- **Web:** `VITE_BACKEND_URL=https://api.brevly.com.br` e `VITE_FRONTEND_URL=https://cdn.brevly.com.br` no build; sync em `brevly-frontend-web` + invalidação do CloudFront.

> **Pendência de domínio/API:** o ALB expõe `http://<dns>` (sem TLS). Para o `https://api.brevly.com.br`, adicionar listener 443 + certificado ACM no ALB (fora do escopo atual; o `cdnUrl` já é HTTPS via CloudFront).

## Estrutura

- `.github/workflows/pr.yml` — validação de PR (lint, typecheck, testes, preview).
- `.github/workflows/deploy.yml` — deploy em `main` (ECR → pulumi up → migrate → S3/CloudFront).