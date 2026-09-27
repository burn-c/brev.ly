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
| `docker.md` | Dockerfile, docker-compose e comandos úteis (pendente — Fase 5) |
| `deploy.md` | Passo a passo do deploy AWS (ECS/RDS/S3/CloudFront) (pendente — Fase 6/7) |
| `infra-pulumi.md` | Stack `brevly-prod`, estado S3, preview/up (pendente — Fase 6) |
| `ci-cd.md` | Workflows GitHub Actions, OIDC, fluxo PR/main (pendente — Fase 7) |

## Convenções

- **Idioma**: documentação e changelog em PT-BR; mensagens de commit em inglês.
- **Atualização**: docs devem ser atualizados **apenas quando** a mudança for notável (API, deploy, comandos, decisões).
- **Workflow**: consulte [`workflow.md`](./workflow.md) antes de implementar.