#!/usr/bin/env bash
#
# Teardown completo da infraestrutura AWS do Brev.ly (stack brevly-prod).
#
# O script é idempotente: pode ser reexecutado após uma falha parcial.
# Ele NÃO remove recursos persistentes (state bucket, role OIDC, domínio/DNS)
# nem serviços fora da AWS (Cloudflare R2) — ver docs/teardown.md.
#
# Uso:
#   ./scripts/teardown.sh              # preflight + preview + confirmação interativa
#   ./scripts/teardown.sh --dry-run    # apenas preflight + preview
#   CONFIRM_DESTROY=brevly-prod ./scripts/teardown.sh --yes
#
set -euo pipefail

STACK="brevly-prod"
PROJECT_CONFIG="brevly-infra"
ACCOUNT_ID="488182246611"
REGION="us-east-1"
STATE_BUCKET="brevly-pulumi-state"
FRONTEND_BUCKET="brevly-frontend-web"
CSV_BUCKET="brevly-csv-reports"
ECS_CLUSTER="brevly-cluster"
ECS_SERVICE="brevly-server-api"
LOG_GROUP_PREFIX="/ecs/brevly"
DB_SECRET="brevly/DATABASE_URL"
DOMAIN="brev-ly.burndev.app"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DRY_RUN=0
ASSUME_YES=0
LEFTOVERS=()

usage() {
  cat <<'EOF'
Teardown da stack brevly-prod (AWS).

Uso:
  ./scripts/teardown.sh [--dry-run] [--yes]

Opções:
  --dry-run   Executa apenas preflight + `pulumi destroy --preview-only`.
  --yes, -y   Não pergunta interativamente. Exige CONFIRM_DESTROY=brevly-prod.
  -h, --help  Mostra esta ajuda.

Variáveis:
  AWS_PROFILE / credenciais AWS   Conta 488182246611 (obrigatório).
  PULUMI_CONFIG_PASSPHRASE        Padrão vazio (a stack foi criada assim).
  CONFIRM_DESTROY                 Obrigatória com --yes.

O que é destruído: VPC/NAT, RDS, ECS/Fargate, ECR, ALB, S3 (front/CSV),
CloudFront, ACM, Secrets Manager, log group e roles do ECS.
O que é preservado: state bucket, role OIDC, domínio/DNS e Cloudflare R2.
EOF
}

log() { printf '\n==> %s\n' "$*"; }
warn() { printf 'AVISO: %s\n' "$*" >&2; }
die() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }

add_leftover() { LEFTOVERS+=("$1"); }

# Verifica uma consulta AWS CLI e registra o resultado quando não vazio.
# Uso: check_list "label" "query JMESPath" <comando aws ...>
check_list() {
  local label="$1"
  local query="$2"
  shift 2
  local out
  if ! out=$("$@" --query "$query" --output text 2>/dev/null); then
    add_leftover "$label (falha ao consultar)"
    return
  fi
  out="$(printf '%s' "$out" | tr -s '[:space:]' ' ')"
  case "$out" in
    "" | "None") return ;;
  esac
  add_leftover "$label: $out"
}

trap 'printf "\nTeardown interrompido. O state do Pulumi foi preservado; reexecute o script (idempotente).\n" >&2' ERR

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --yes | -y) ASSUME_YES=1 ;;
    --) ;; # aceita o separador opcional do pnpm (`pnpm teardown -- --dry-run`)
    -h | --help)
      usage
      exit 0
      ;;
    *)
      die "Argumento desconhecido: $arg (use --help)"
      ;;
  esac
done

cd "$INFRA_DIR"
export AWS_REGION="$REGION"
export AWS_DEFAULT_REGION="$REGION"
export PULUMI_CONFIG_PASSPHRASE="${PULUMI_CONFIG_PASSPHRASE:-}"

log "Preflight"
command -v aws >/dev/null 2>&1 || die "AWS CLI não encontrado."
command -v pulumi >/dev/null 2>&1 || die "Pulumi CLI não encontrado."

CALLER_ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
CALLER_ARN="$(aws sts get-caller-identity --query Arn --output text)"
[ "$CALLER_ACCOUNT" = "$ACCOUNT_ID" ] ||
  die "Conta AWS atual ($CALLER_ACCOUNT) != $ACCOUNT_ID. Abortando para não destruir a conta errada."
log "AWS: $CALLER_ARN"
log "Região: $REGION"

if ! pulumi login "s3://$STATE_BUCKET" >/dev/null 2>&1; then
  die "Falha no login do Pulumi em s3://$STATE_BUCKET (verifique credenciais/região)."
fi
if ! pulumi stack select "$STACK" >/dev/null 2>&1; then
  die "Não foi possível selecionar a stack $STACK."
fi
log "Stack: $STACK (backend s3://$STATE_BUCKET)"

# O destroy usa o state por padrão (não executa o programa), portanto
# accountId/dbPassword não são necessários. A config só é exigida num futuro
# `pulumi up`; avisamos para evitar surpresa no redeploy.
if ! pulumi config get "$PROJECT_CONFIG:accountId" >/dev/null 2>&1; then
  warn "Config $PROJECT_CONFIG:accountId ausente. Não bloqueia o destroy, mas será necessária para um futuro 'pulumi up'."
fi

if ! STACK_JSON="$(pulumi stack export 2>/dev/null)"; then
  die "Falha ao exportar o state da stack $STACK."
fi
RESOURCE_COUNT="$(printf '%s' "$STACK_JSON" | grep -c '"urn"' || true)"
log "Recursos no state: $RESOURCE_COUNT"

if [ "$RESOURCE_COUNT" -gt 0 ]; then
  log "Preview do destroy (nenhuma alteração feita)"
  pulumi destroy -s "$STACK" --preview-only
else
  log "State vazio — nada para o Pulumi destruir; seguindo para o sweep."
fi

if [ "$DRY_RUN" -eq 1 ]; then
  log "Dry-run concluído. Nenhuma alteração foi feita."
  exit 0
fi

if [ "$ASSUME_YES" -eq 1 ]; then
  [ "${CONFIRM_DESTROY:-}" = "$STACK" ] ||
    die "Com --yes, defina CONFIRM_DESTROY=$STACK para confirmar o destroy."
else
  printf '\nDigite "%s" para confirmar o destroy: ' "$STACK"
  read -r CONFIRM
  [ "$CONFIRM" = "$STACK" ] || die "Confirmação inválida; abortado."
fi

if [ "$RESOURCE_COUNT" -gt 0 ]; then
  log "Drenando o ECS ($ECS_SERVICE)"
  if aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service "$ECS_SERVICE" \
    --desired-count 0 >/dev/null 2>&1; then
    aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE" ||
      warn "Timeout aguardando o ECS drenar; seguindo (o destroy remove o service)."
  else
    warn "ECS service não encontrado (já removido?)."
  fi

  log "Esvaziando buckets S3 (evita BucketNotEmpty)"
  for bucket in "$FRONTEND_BUCKET" "$CSV_BUCKET"; do
    if aws s3api head-bucket --bucket "$bucket" >/dev/null 2>&1; then
      aws s3 rm "s3://$bucket" --recursive --quiet ||
        warn "Falha ao esvaziar s3://$bucket"
      log "Bucket esvaziado: s3://$bucket"
    fi
  done

  log "pulumi destroy ($STACK)"
  DESTROY_OK=0
  for attempt in 1 2 3; do
    log "Tentativa $attempt/3"
    if pulumi destroy -s "$STACK" --yes; then
      DESTROY_OK=1
      break
    fi
    if [ "$attempt" -lt 3 ]; then
      warn "Destroy falhou; aguardando 30s para liberar ENIs/dependências e tentando novamente."
      sleep 30
    fi
  done
  [ "$DESTROY_OK" -eq 1 ] ||
    die "pulumi destroy falhou após 3 tentativas. O state foi preservado; reexecute o script."
else
  log "Pulando o pulumi destroy (state vazio)."
fi

log "Limpando recursos que não estavam no state"
# Log group criado antigamente pelo ECS (awslogs-create-group).
LOG_GROUPS="$(aws logs describe-log-groups \
  --log-group-name-prefix "$LOG_GROUP_PREFIX" \
  --query "logGroups[].logGroupName" --output text 2>/dev/null || true)"
for lg in $LOG_GROUPS; do
  [ -n "$lg" ] || continue
  if aws logs delete-log-group --log-group-name "$lg" >/dev/null 2>&1; then
    log "Log group removido: $lg"
  else
    warn "Falha ao remover log group $lg"
  fi
done

# Secret que possa ter ficado em recovery window (state antigo, sem
# recoveryWindowInDays: 0).
if aws secretsmanager describe-secret --secret-id "$DB_SECRET" >/dev/null 2>&1; then
  if aws secretsmanager delete-secret \
    --secret-id "$DB_SECRET" \
    --force-delete-without-recovery >/dev/null 2>&1; then
    log "Secret removido sem recovery window: $DB_SECRET"
  else
    warn "Falha ao remover $DB_SECRET; verifique manualmente."
  fi
fi

log "Sweep de recursos órfãos (aguardando consistência eventual)"
sleep 10

check_list "VPCs" "Vpcs[].VpcId" \
  aws ec2 describe-vpcs --filters "Name=cidr,Values=10.0.0.0/16"
check_list "NAT Gateways" "NatGateways[?State!='deleted'].NatGatewayId" \
  aws ec2 describe-nat-gateways --filter "Name=tag:project,Values=brevly"
check_list "Elastic IPs" "Addresses[].PublicIp" \
  aws ec2 describe-addresses --filters "Name=tag:project,Values=brevly"
check_list "Security groups" "SecurityGroups[?starts_with(GroupName, 'brevly')].GroupId" \
  aws ec2 describe-security-groups
check_list "RDS instances" "DBInstances[?starts_with(DBInstanceIdentifier, 'brevly')].DBInstanceIdentifier" \
  aws rds describe-db-instances
check_list "RDS subnet groups" "DBSubnetGroups[?starts_with(DBSubnetGroupName, 'brevly')].DBSubnetGroupName" \
  aws rds describe-db-subnet-groups
check_list "ECS clusters" "clusterArns[?contains(@, 'brevly')]" \
  aws ecs list-clusters
check_list "Load balancers" "LoadBalancers[?starts_with(LoadBalancerName, 'brevly')].LoadBalancerName" \
  aws elbv2 describe-load-balancers
check_list "Target groups" "TargetGroups[?starts_with(TargetGroupName, 'brevly')].TargetGroupName" \
  aws elbv2 describe-target-groups
check_list "ECR repositories" "repositories[?starts_with(repositoryName, 'brevly')].repositoryName" \
  aws ecr describe-repositories
check_list "CloudWatch log groups" "logGroups[].logGroupName" \
  aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP_PREFIX"
check_list "Secrets Manager" "SecretList[?starts_with(Name, 'brevly/')].Name" \
  aws secretsmanager list-secrets
check_list "IAM roles" "Roles[?starts_with(RoleName, 'brevly-')].RoleName" \
  aws iam list-roles
check_list "ACM certificates" "CertificateSummaryList[?DomainName == '$DOMAIN'].CertificateArn" \
  aws acm list-certificates

# CloudFront: procura "brevly-" no JSON (origens, comment ou alias). Evita
# depender de Items[] quando a conta não tem distribuições.
if ! CF_JSON="$(aws cloudfront list-distributions --output json 2>/dev/null)"; then
  add_leftover "CloudFront (falha ao consultar)"
elif printf '%s' "$CF_JSON" | grep -q 'brevly-'; then
  add_leftover "CloudFront distribution (origem/comment/alias com 'brevly-')"
fi

for bucket in "$FRONTEND_BUCKET" "$CSV_BUCKET"; do
  if aws s3api head-bucket --bucket "$bucket" >/dev/null 2>&1; then
    add_leftover "S3 bucket: $bucket"
  fi
done

log "Resultado"
if [ "${#LEFTOVERS[@]}" -eq 0 ]; then
  log "Nenhum recurso órfão encontrado. Teardown concluído."
  if aws s3api head-bucket --bucket "$STATE_BUCKET" >/dev/null 2>&1; then
    log "Preservado para redeploy: s3://$STATE_BUCKET (state do Pulumi)."
  fi
  exit 0
fi

warn "Ainda existem recursos relacionados ao Brev.ly:"
for item in ${LEFTOVERS[@]+"${LEFTOVERS[@]}"}; do
  printf '  - %s\n' "$item"
done
cat <<EOF

Ação recomendada:
  1. Reexecute este script (ele é idempotente) para tentar novamente.
  2. Se o item for persistente/intencional (state bucket, role OIDC, DNS),
     ignore ou remova manualmente conforme docs/teardown.md.
  3. Para recursos presos por dependência (ENI/SG), aguarde alguns minutos
     e rode de novo; o CloudFront pode levar 15–30 min para deletar.
EOF
exit 1
