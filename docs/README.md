# Documentação — Brev.ly

Índice da documentação técnica do projeto.

## Documentos

| Documento | Descrição |
|---|---|
| `../spec.md` | Spec completo do projeto (requisitos, checklist de compliance, arquitetura, API, infra) |
| [`status.md`](./status.md) | **Memória de execução** — estado das fases, subprojetos, gotchas operacionais e próximos passos |
| [`workflow.md`](./workflow.md) | Padrões e fluxo de desenvolvimento (ciclo por tarefa, commits, verificação, documentação) |
| [`decisions.md`](./decisions.md) | ADRs — decisões técnicas com alternativas consideradas e o porquê (identificador, redirect, short code, deploy, storage, estado Pulumi) |
| [`api.md`](./api.md) | Contratos da API, exemplos e códigos de erro |
| [`database.md`](./database.md) | Schema, migrations e comandos `db:migrate` |
| [`docker.md`](./docker.md) | Dockerfile multi-stage e docker-compose local |
| [Design tokens (web)](../web/docs/design-tokens.md) | Tokens oficiais do Figma (`blue-base`, `gray-100..600`, `danger`) — fonte de verdade visual |
| [Design spec (web)](../web/docs/design-spec.md) | Spec das telas e componentes extraída do Figma (8 telas, estados, layout) |
| [`deploy.md`](./deploy.md) | Passo a passo do deploy AWS (ECS/RDS/S3/CloudFront) |
| [`infra-pulumi.md`](./infra-pulumi.md) | Stack `brevly-prod`, estado S3, preview/up |
| [`ci-cd.md`](./ci-cd.md) | Workflows GitHub Actions (OIDC, PR preview, deploy main) |
| [`squarespace-dns.md`](./squarespace-dns.md) | Guia para adicionar os CNAMEs do Brev.ly no painel DNS da Squarespace |

## Convenções

- **Idioma**: documentação e changelog em PT-BR; mensagens de commit em inglês.
- **Atualização**: docs devem ser atualizados **apenas quando** a mudança for notável (API, deploy, comandos, decisões).
- **Workflow**: consulte [`workflow.md`](./workflow.md) antes de implementar.
- **Memória de execução**: [`status.md`](./status.md) — inclui o **acesso ao Figma** (seção "Acesso ao Figma").