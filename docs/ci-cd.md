# CI/CD — Brev.ly

Pipelines de **GitHub Actions** para o Brev.ly. Autenticação AWS via **OIDC** (sem credenciais estáticas). Deploy em `https://brev-ly.burndev.app` (front) e `https://api.brev-ly.burndev.app` (API).

## Visão geral

| Workflow | Trigger | O que faz |
|---|---|---|
| `pr.yml` | Pull request para `main` | Server: lint/format/typecheck/test/build (77 testes) · Web: lint/format/typecheck/build · Pulumi preview (`brevly-prod`) |
| `deploy.yml` | Push em `main` | 1. Build+push imagem server → ECR (`sha` + `latest`) · 2. `pulumi up` · 3. `Force ECS redeploy` · 4. `db:migrate` (via ECS task) · 5. Sync web → S3 + invalidação CloudFront |

## Isolamento entre aplicações (importante)

O Brev.ly usa uma **role OIDC dedicada**, isolada das outras aplicações do `burn-c`:

| Role | Trust | Uso |
|---|---|---|
| `GitHubActionsOIDCRoleBrevly` | **somente** `repo:burn-c/brev.ly:*` | CI/CD do Brev.ly |
| `GitHubActionsOIDCRole` | **somente** `repo:burn-c/upload-widget-server:*` | upload-widget (inalterada) |

- A role dedicada tem policy `GitHubActionsBrevlyPolicy` **escopada por ARN** (S3, ECR, ECS, ELB, Logs, Secrets Manager, IAM PassRole).
- A role compartilhada **não** tem acesso ao Brev.ly (trust e policy removidos na Fase de isolamento).
- `burndev.iac` usa credenciais estáticas (`AWS_ACCESS_KEY_ID`) — não compartilha role OIDC com o Brev.ly.

## Pré-requisitos (uma vez)

### 1. Repositório no GitHub

Repo público `burn-c/brev.ly` (main). Ver `docs/status.md`.

### 2. Roles OIDC (AWS)

- **Provider OIDC:** `token.actions.githubusercontent.com` (aud `sts.amazonaws.com`).
- **Role dedicada:** `GitHubActionsOIDCRoleBrevly` → `arn:aws:iam::488182246611:role/GitHubActionsOIDCRoleBrevly`.
  - Trust: `repo:burn-c/brev.ly:*` e `repo:burn-c@*/brev.ly@*:*` (formato real do GitHub com IDs).
  - Policy inline `GitHubActionsBrevlyPolicy`: PulumiState (S3), FrontendS3, CsvS3, S3CreateBuckets, CloudFront (`*` por limitação AWS), Acm, VpcNetwork, Rds, EcrRepository, Ecs (ARN escopado + List* em `*`), Elb, Logs, SecretsManager, IAM PassRole/Read/ManageRoles/CreateServiceLinkedRole/IamPolicies.

### 3. Secrets e variáveis

| Secret/Var | Uso | Status |
|---|---|---|
| `AWS_OIDC_ROLE_ARN` | ARN da `GitHubActionsOIDCRoleBrevly` | ✅ definido |
| `DB_PASSWORD` | Senha do RDS (`brevly-infra:dbPassword`) | ✅ definido |
| `BREVLY_ENABLE_TLS` (var) | `true` → CloudFront alias + ALB 443 + redirect | ✅ definido |

## Notas operacionais

- **Backend de estado:** `s3://brevly-pulumi-state` (exclusivo — ADR-009). Login no CI: `pulumi login s3://brevly-pulumi-state` com `AWS_REGION=us-east-1`.
- **Passphrase da stack:** vazio (`PULUMI_CONFIG_PASSPHRASE=""`). A config (`Pulumi.brevly-prod.yaml`) **não é versionada**; o workflow recria `accountId`, `imageTag`, `enableTls` e `dbPassword` (secret) antes do `pulumi up`.
- **Imagem do server:** build com tag `${{ github.sha }}` (imutável) + `latest`. O ECS usa `latest` + `--force-new-deployment` para re-puxar a imagem nova (abordagem estável; `:sha` na task def expõe eventual-consistency do provider ECS — documentado no ADR-012).
- **`db:migrate`:** roda via **ECS one-off task** (dentro da VPC, alcança o RDS privado). Usa o migrator programático do drizzle com `sslmode=no-verify` (RDS com certificado auto-assinado).
- **Web:** `VITE_BACKEND_URL=https://api.brev-ly.burndev.app` e `VITE_FRONTEND_URL=https://brev-ly.burndev.app`; sync em `brevly-frontend-web` (privado, via OAC) + invalidação do CloudFront.

## Estrutura

- `.github/workflows/pr.yml` — validação de PR (lint, typecheck, testes, preview).
- `.github/workflows/deploy.yml` — deploy em `main` (ECR → pulumi up → redeploy → migrate → web).