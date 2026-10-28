# CI/CD — Brev.ly

Pipelines de **GitHub Actions** para o Brev.ly. Autenticação AWS via **OIDC** (sem credenciais estáticas). Deploy em `https://brev-ly.burndev.app` (front) e `https://api.brev-ly.burndev.app` (API).

## Visão geral

| Workflow | Trigger | O que faz |
|---|---|---|
| `pr.yml` | Pull request para `main` | Server: lint/format/typecheck/test/build (77 testes) · Web: lint/format/typecheck/build · Pulumi preview (`brevly-prod`) — **não aplica** |
| `deploy.yml` | **Manual** (`workflow_dispatch`, a partir de `main`) com confirmação `deploy-brevly-prod` | 1. Build+push imagem server → ECR (`sha` + `latest`) · 2. `pulumi up` · 3. `Force ECS redeploy` · 4. `db:migrate` (via ECS task) · 5. Sync web → S3 + invalidação CloudFront |

> **Produção desativada (2026-10-28):** o deploy **não dispara mais em push** para `main` e a infraestrutura foi desligada para evitar custos. Um push em `main` **não recria** a infra. Para reativar, ver [`teardown.md`](./teardown.md#8-recriar-depois) e dispare o workflow manualmente.

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
| `BREVLY_DEPLOY_ENABLED` (var, opcional) | `false` → bloqueia o deploy manual (guard do `deploy.yml`) | usar `false` enquanto offline |

## Notas operacionais

- **Deploy manual:** o `deploy.yml` só roda via `workflow_dispatch`, **a partir de `main`**, e exige digitar `deploy-brevly-prod` no input `confirm`. Push em `main` **não** dispara nem recria a infra.
- **Guard de produção:** a variable `BREVLY_DEPLOY_ENABLED=false` faz o job `guard` ser pulado, e todos os jobs dependentes também. Use enquanto a infra estiver derrubada; remova/defina `true` para liberar.
- **Após um teardown completo:** o job de build/push roda antes do `pulumi up` e o repositório ECR não existe. Rode `pulumi up -s brevly-prod` uma vez (ver [`teardown.md`](./teardown.md#8-recriar-depois)) para recriar ECR/infra, depois dispare o deploy manual. O workflow tem um preflight que falha com mensagem clara se o ECR não existir.
- **Backend de estado:** `s3://brevly-pulumi-state` (exclusivo — ADR-009). Login no CI: `pulumi login s3://brevly-pulumi-state` com `AWS_REGION=us-east-1`.
- **Passphrase da stack:** vazio (`PULUMI_CONFIG_PASSPHRASE=""`). A config (`Pulumi.brevly-prod.yaml`) **não é versionada**; o workflow recria `accountId`, `imageTag`, `enableTls` e `dbPassword` (secret) antes do `pulumi up`.
- **Imagem do server:** build com tag `${{ github.sha }}` (imutável) + `latest`. O ECS usa `latest` + `--force-new-deployment` para re-puxar a imagem nova (abordagem estável; `:sha` na task def expõe eventual-consistency do provider ECS — documentado no ADR-012).
- **`db:migrate`:** roda via **ECS one-off task** (dentro da VPC, alcança o RDS privado). Usa o migrator programático do drizzle com `sslmode=no-verify` (RDS com certificado auto-assinado).
- **Web:** `VITE_BACKEND_URL=https://api.brev-ly.burndev.app` e `VITE_FRONTEND_URL=https://brev-ly.burndev.app`; sync em `brevly-frontend-web` (privado, via OAC) + invalidação do CloudFront.
- **`pr.yml`:** continua rodando em PR e faz apenas `pulumi preview` — não cria/altera recursos. Se quiser suspender o acesso à AWS durante o período offline, desabilite também esse workflow.

## Estrutura

- `.github/workflows/pr.yml` — validação de PR (lint, typecheck, testes, preview).
- `.github/workflows/deploy.yml` — deploy manual (`workflow_dispatch`): ECR → pulumi up → redeploy → migrate → web.