# Teardown — desligar a infra e parar os custos

Runbook para remover **toda** a infraestrutura AWS do Brev.ly e identificar o que
fica fora do Pulumi. Complementa [`infra-pulumi.md`](./infra-pulumi.md) e
[`deploy.md`](./deploy.md).

> **Regra de ouro:** `pulumi destroy` sozinho **não** termina limpo no estado atual.
> Buckets com objetos, secret em recovery window e log group criado pelo ECS
> impedem/furam o destroy. O script [`infra/scripts/teardown.sh`](../infra/scripts/teardown.sh)
> cobre esses casos.

## 1. O que é destruído × preservado

### Efêmero — o teardown remove

| Recurso | Serviço AWS | Observação |
|---|---|---|
| VPC, subnets, NAT Gateway, EIP | EC2 | NAT single ≈ US$ 33/mês (maior custo fixo) |
| ALB, target group, listeners, SGs | ELB/EC2 | ALB ≈ US$ 16/mês + LCU |
| ECS cluster, service, task definition | ECS/Fargate | Task definitions antigas ficam `INACTIVE` (sem custo) |
| Repositório ECR + imagens | ECR | `forceDelete: true` |
| RDS PostgreSQL | RDS | `skipFinalSnapshot: true` + `backupRetentionPeriod: 0` → **sem snapshot** |
| Buckets `brevly-frontend-web` e `brevly-csv-reports` | S3 | `forceDestroy: true` (esvazia objetos) |
| CloudFront + OAC + bucket policies | CloudFront | Delete leva 15–30 min |
| Certificado ACM | ACM | Só deleta depois de CloudFront/ALB |
| Secret `brevly/DATABASE_URL` | Secrets Manager | `recoveryWindowInDays: 0` (delete imediato) |
| Log group `/ecs/brevly-server` | CloudWatch Logs | Criado pelo ECS (fora do state); o script remove após o destroy |
| Roles/policies do ECS | IAM | `brevly-server-execution` / `brevly-server-task` |

### Persistente — mantido de propósito

| Recurso | Por quê |
|---|---|
| `s3://brevly-pulumi-state` | Histórico/estado para um redeploy; custo de centavos |
| Role OIDC `GitHubActionsOIDCRoleBrevly` + policy | Reutilizada no próximo deploy |
| Domínio `burndev.app` e DNS no Squarespace | Ativo anual, não é por uso |
| Repositório GitHub, secrets e variables | CI/CD |
| AWS Budget / alarme de custo (se criado) | Rede de segurança |

### Manual — fora da AWS/Pulumi

| Recurso | Como remover |
|---|---|
| Cloudflare R2 `brevly-csv-reports` (usado no dev) | Dashboard R2 → apagar objetos + bucket; revogar o API token |
| `.env` locais com credenciais | Limpar/rotacionar (R2, DB) |
| CNAMEs órfãos no Squarespace (ACM/CloudFront/ALB) | Remover após o destroy, se não for redeployar |

## 2. Custo real antes de decidir

| Recurso | ~US$/mês |
|---|---|
| NAT Gateway (single) | 33 |
| ALB | 16 |
| RDS `db.t4g.micro` + 20 GB | 14 |
| ECS Fargate (1 task 0,25 vCPU/0,5 GB) | 6 |
| S3 + CloudFront + ECR + Secrets Manager | < 2 |
| **Total** | **~70** |

> A estimativa de US$ 15–20 do `spec.md` não incluía NAT Gateway nem ALB. Por isso
> "pausar" economiza menos da metade; só o destroy zera.

## 3. Modo recomendado — destroy completo

### Pré-requisitos

- AWS CLI v2 autenticada na conta **`488182246611`** (admin ou perfil com permissão de delete).
- Pulumi CLI (validado com `v3.250.0`).
- `PULUMI_CONFIG_PASSPHRASE` vazio (a stack foi criada assim) ou o valor correto.
- Região `us-east-1` — o script exporta `AWS_REGION`/`AWS_DEFAULT_REGION`.

### Uso

```bash
cd infra
pnpm install          # primeira vez / após limpar node_modules

# 1. Preflight + preview, sem alterar nada
pnpm teardown --dry-run

# 2. Destroy interativo (pede para digitar "brevly-prod")
pnpm teardown

# 3. Ou sem interação (CI/automação)
CONFIRM_DESTROY=brevly-prod pnpm teardown --yes
```

### O que o script faz

1. **Guardas**: confere a conta AWS (`488182246611`) e a stack `brevly-prod`;
   faz login no backend `s3://brevly-pulumi-state`.
2. **Preflight**: mostra a contagem de recursos no state e roda
   `pulumi destroy --preview-only`.
3. **Confirmação**: exige digitar `brevly-prod` (ou `CONFIRM_DESTROY` com `--yes`).
4. **Pre-drain**: `ecs update-service --desired-count 0` + `wait services-stable`;
   esvazia os dois buckets S3.
5. **Destroy**: `pulumi destroy -s brevly-prod --yes`, com até **3 tentativas**
   (ENIs/SGs podem demorar a liberar).
6. **Limpeza fora do state**: remove log group(s) `/ecs/brevly*` e força a
   exclusão do secret `brevly/DATABASE_URL` (caso o state antigo tenha deixado
   recovery window).
7. **Sweep**: consulta VPC, NAT, SGs, RDS, ECS, ALB/TG, ECR, log groups,
   secrets, IAM, CloudFront, ACM e S3; imprime o que sobrou e sai com código
   **1** se houver órfãos.

O destroy **não executa o programa Pulumi por padrão** (usa o state), então
`dbPassword`/`accountId` não são necessários para destruir. Eles voltam a ser
exigidos no `pulumi up` do redeploy.

### Tempo esperado

| Etapa | Tempo |
|---|---|
| Preview + confirmação | 1–2 min |
| ECS drenar | 1–10 min |
| RDS deletar | 5–10 min |
| CloudFront desabilitar + deletar | 15–30 min |
| **Total** | **~30–45 min** |

Não interrompa o destroy no meio do CloudFront; se interromper, rode o script de
novo (é idempotente).

## 4. Modo curto — pausar (não zera o custo)

Use só para intervalos de poucos dias (ex.: entre apresentações). O RDS para por
no máximo **7 dias** e a AWS religa sozinho depois.

```bash
# Descobrir o identificador do RDS
DB_ID=$(aws rds describe-db-instances \
  --query "DBInstances[?starts_with(DBInstanceIdentifier,'brevly')].DBInstanceIdentifier" \
  --output text --region us-east-1)

# Parar ECS e RDS
aws ecs update-service --cluster brevly-cluster --service brevly-server-api \
  --desired-count 0 --region us-east-1
aws rds stop-db-instance --db-instance-identifier "$DB_ID" --region us-east-1
```

Custo restante: NAT + ALB + EIP + storage → **~US$ 50/mês**. Para religar:
`desired-count 1` + `aws rds start-db-instance`.

## 5. Hardening que torna o destroy confiável

Aplicado em [`infra/index.ts`](../infra/index.ts):

| Ajuste | Motivo |
|---|---|
| `forceDestroy: true` nos buckets de front/CSV | Evita `BucketNotEmpty` |
| `recoveryWindowInDays: 0` no secret | Evita secret residual por 7 dias |
| `deletionProtection: false` explícito no RDS | Evita bloqueio de delete |

> Esses ajustes passam a valer no próximo `pulumi up`. Mesmo antes disso, o
> script já cobre o estado antigo (esvazia buckets e limpa log group/secret).
>
> O log group `/ecs/brevly-server` **continua fora do state** de propósito: ele é
> criado pelo ECS (`awslogs-create-group`) e o script o remove depois do destroy.
> Gerenciá-lo no Pulumi exigiria um `pulumi import` único (e poderia quebrar o
> deploy), então a limpeza ficou no teardown.

## 6. Depois do teardown

1. Confirme que o script terminou com **código 0** e sem leftovers.
2. Confira o state:
   ```bash
   cd infra
   AWS_REGION=us-east-1 pulumi stack export -s brevly-prod | grep -c '"urn"'   # deve ser 0
   ```
3. **Impeça o redeploy acidental**: qualquer push em `main` roda o `deploy.yml`
   e recria tudo. Antes do teardown, desabilite o workflow ou adicione um guard:
   ```bash
   gh workflow disable deploy.yml
   # ou: repo variable BREVLY_DEPLOY_ENABLED=false + `if:` no deploy.yml
   ```
4. Verifique o custo no **Cost Explorer**/Budgets no dia seguinte (pode haver
   cobrança residual de horas já consumidas).
5. Se não for redeployar, remova o R2 e os CNAMEs órfãos (seção 7).

## 7. Limpeza manual avançada (opcional)

### Cloudflare R2 (dev)

- Dashboard Cloudflare → **R2** → bucket `brevly-csv-reports` → apagar objetos e bucket.
- **Manage R2 API Tokens** → revogar o token usado no `server/.env`.
- Limpar `CLOUDFLARE_*` do `.env`.

R2 tem free tier de 10 GB; o custo é irrelevante, mas as credenciais não devem
ficar ativas.

### State bucket do Pulumi (só se for abandonar o projeto)

O bucket `brevly-pulumi-state` é **versionado**; `aws s3 rm --recursive` não
remove versões. Se realmente quiser apagá-lo:

```bash
# ATENÇÃO: apaga o histórico do Pulumi. Faça só depois do destroy.
aws s3api list-object-versions --bucket brevly-pulumi-state \
  --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --output json > /tmp/versions.json
aws s3api delete-objects --bucket brevly-pulumi-state --delete file:///tmp/versions.json

aws s3api list-object-versions --bucket brevly-pulumi-state \
  --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' --output json > /tmp/markers.json
aws s3api delete-objects --bucket brevly-pulumi-state --delete file:///tmp/markers.json

aws s3api delete-bucket --bucket brevly-pulumi-state
```

Sem o state, o redeploy exige `pulumi stack init brevly-prod` e recriar a config.
**Recomendação:** manter o bucket.

### DNS

Se o destroy foi definitivo, remova no Squarespace os CNAMEs de validação do ACM
e os apontamentos de `brev-ly`/`api.brev-ly`. Ver [`squarespace-dns.md`](./squarespace-dns.md).

## 8. Recriar depois

O código e o state continuam no repositório/bucket. O fluxo é o deploy normal:

```bash
cd infra
AWS_REGION=us-east-1 pulumi login s3://brevly-pulumi-state
# recriar config se o Pulumi.brevly-prod.yaml local não existir:
#   pulumi config set brevly-infra:accountId 488182246611
#   pulumi config set --secret brevly-infra:dbPassword <senha>
#   pulumi config set brevly-infra:enableTls true
pulumi up -s brevly-prod
```

Depois: build/push da imagem no ECR, `migrate` via ECS task, build do web e
`aws s3 sync` + invalidação do CloudFront (ou simplesmente push em `main` com o
`deploy.yml` reabilitado).

**Atenção ao TLS:** o RDS volta **vazio** (sem snapshot) e o CloudFront/ALB
recebem novos DNS. Com `enableTls=true`, o certificado ACM é recriado e precisa
ser validado de novo no DNS; os CNAMEs do Squarespace devem ser atualizados.

## 9. Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| `BucketNotEmpty` | Bucket com objetos | Rode o script (ele esvazia) ou `aws s3 rm --recursive`; confira `forceDestroy` |
| `DependencyViolation` (VPC/SG/ENI) | Fargate/ALB ainda liberando ENIs | Aguarde 5–10 min e reexecute |
| Destroy para no CloudFront | Delete assíncrono (15–30 min) | Aguarde/reexecute; não cancele |
| `secret ... already scheduled for deletion` | Recovery window de 7 dias | O script roda `--force-delete-without-recovery`; se persistir, faça manualmente |
| `Missing required configuration variable` | Você passou `--run-program` | Não passe; o destroy usa o state |
| Preview mostra troca de senha do RDS | `dbPassword` local difere do deploy (CI usa `DB_PASSWORD`) | **Não rode `pulumi up` local**; alinhe o secret ou aplique via CI |
| `PermanentRedirect` no state | `AWS_REGION` diferente de `us-east-1` | O script exporta a região correta |
| `InvalidParameterValue: deletion protection` | RDS com proteção | `aws rds modify-db-instance --no-deletion-protection --apply-immediately` |
| `Certificate ... in use` | CloudFront/ALB ainda existe | Destrua-os primeiro (o Pulumi ordena; se manual, faça nessa ordem) |
| Sweep acha secret | State antigo (antes do hardening) | O script força a exclusão; se sobrar, faça manualmente |
| Sweep acha log group | Comportamento esperado se o script não chegou à limpeza | Rode o script de novo ou `aws logs delete-log-group` |

## 10. Checklist de encerramento

- [ ] Fiz backup/export dos dados, se necessário (**o destroy não cria snapshot**)
- [ ] Rodei `pnpm teardown --dry-run` e revisei o preview
- [ ] Rodei o destroy e o script saiu com código 0
- [ ] `pulumi stack export` está sem recursos (`urn` = 0)
- [ ] Desabilitei o `deploy.yml` (ou `BREVLY_DEPLOY_ENABLED=false`)
- [ ] Removi/revoguei o R2 e limpei `.env` (se definitivo)
- [ ] Conferi o custo no dia seguinte
- [ ] Atualizei `docs/status.md` com a data do teardown
