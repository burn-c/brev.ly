# Guia — Configuração de DNS no Squarespace (Brev.ly)

Guia passo a passo para adicionar os registros CNAME do Brev.ly no painel de DNS da Squarespace do domínio **`burndev.app`**. Este documento é preenchido com os valores reais emitidos pelo Pulumi (stack `brevly-prod`).

> **Quando seguir:** após a Fase 2 (infra aplicada), quando o certificado ACM estiver `PENDING_VALIDATION` e o Pulumi tiver exportado `certValidationRecords`. Ao terminar, aguardar a validação do certificado (`ISSUED`) antes de ativar o TLS (Fase 4).

---

## 1. Acessar o painel de DNS

1. Acesse **Squarespace** → painel do site que usa o domínio `burndev.app`.
2. Menu: **Configurações (Settings)** → **Domínios (Domains)**.
3. Clique em **burndev.app** → aba **DNS Settings** (ou **Advanced DNS** / **Custom DNS**).
4. Role até a seção de **registros DNS** (Records).

> Dica: se não achar o DNS, procure por **"Squarespace Domains"** → **"DNS Settings"** no painel. A Squarespace usa a interface herdada do Google Domains ("Registros personalizados").

---

## 2. Registros CNAME a adicionar (4 no total)

Adicione os 4 registros abaixo como **CNAME** (Host/Name e Value exatos). A Squarespace normalmente adiciona o ponto final automaticamente; se pedir, use o valor completo.

### 2.1 Validação do certificado ACM (2 registros — obrigatórios primeiro)

| Name (Host) | Type | Value (Data/Pontos para) |
|---|---|---|
| `_35b395754a7ad4076bc93ea4abf3249b.brev-ly.burndev.app` | CNAME | `_63159b4360eb4bc0b11dfb3bbaa32e12.wzccmgtwzk.acm-validations.aws.` |
| `_720e5b11c102fc4ef8609bba7951c14e.api.brev-ly.burndev.app` | CNAME | `_384dc97b9ec88bf83226b6b791a7438e.wzccmgtwzk.acm-validations.aws.` |

> Estes valores autorizam o certificado ACM. **Sem eles, o certificado nunca sai de `PENDING_VALIDATION`.**

### 2.2 Apontamento do front/redirect (1 registro)

| Name (Host) | Type | Value (Data) |
|---|---|---|
| `brev-ly.burndev.app` | CNAME | `d3nkc5rftpck20.cloudfront.net` |

> Aponta o front (SPA + redirect `/:shortCode` + 404) para o CloudFront.

### 2.3 Apontamento da API (1 registro)

| Name (Host) | Type | Value (Data) |
|---|---|---|
| `api.brev-ly.burndev.app` | CNAME | `brevly-alb-1345829188.us-east-1.elb.amazonaws.com` |

> Aponta a API para o ALB (HTTPS após a Fase 4).

---

## 3. Como verificar a propagação

Depois de salvar, verifique se os registros propagaram (pode levar de minutos a algumas horas):

```bash
# verifica o CNAME do front
dig +short brev-ly.burndev.app CNAME

# verifica o CNAME da API
dig +short api.brev-ly.burndev.app CNAME

# verifica um CNAME de validação do ACM
dig +short _35b395754a7ad4076bc93ea4abf3249b.brev-ly.burndev.app CNAME
```

Cada comando deve retornar o valor correspondente da tabela acima (com ponto final).

> **Alternativa:** no painel da Squarespace, o status do registro costuma ficar "ativo" assim que propagado.

---

## 4. Próximos passos

1. **Aguardar a emissão do certificado:** `aws acm describe-certificate --certificate-arn <certArn>` até `Status: ISSUED` (o Pulumi exporta `certArn` e `certValidationRecords`).
2. Quando `ISSUED` → ativar o TLS (Fase 4): `pulumi config set brevly-infra:enableTls true` + `pulumi up` (ou definir a variable `BREVLY_ENABLE_TLS=true` no GitHub para o deploy automático).
3. Validar end-to-end (Fase 5): `https://brev-ly.burndev.app` e `https://api.brev-ly.burndev.app/health`.

---

## Referência (valores emitidos em 2026-09-28)

- **Certificado ACM:** `arn:aws:acm:us-east-1:488182246611:certificate/72f83ccf-0fb3-4513-a0c4-d094c439afc5` (status `PENDING_VALIDATION`).
- **CloudFront:** `d3nkc5rftpck20.cloudfront.net` (distribuição `E4G5JLBGBW04X`).
- **ALB:** `brevly-alb-1345829188.us-east-1.elb.amazonaws.com`.

> Se algum valor mudar (ex.: ALB recriado), pegue os outputs atuais com:
> `AWS_REGION=us-east-1 pulumi stack output -s brevly-prod`