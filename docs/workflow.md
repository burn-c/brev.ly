# Fluxo de Desenvolvimento

Padrões e convenções do projeto **Brev.ly**. Este documento define como o código deve ser implementado, verificado, documentado e commitado. Referência técnica completa no [`spec.md`](../spec.md).

## Ciclo por tarefa

Cada fase do roadmap é quebrada em tarefas granulares (ex.: "criar rota `POST /links`"). Cada tarefa segue o ciclo:

```
1. IMPLEMENTAR   → código focado em uma única responsabilidade
2. VERIFICAR     → scripts do package.json: lint, format:check, typecheck, test, build / pulumi preview
3. APROVAR       → revisar o diff contra o spec + checklist de compliance (26 itens)
4. DOCUMENTAR    → docs/ e/ou README e/ou CHANGELOG apenas se necessário
5. COMMITAR      → main direto, commit atômico + semântico (inglês)
```

## Definição de "pronto"

Antes de commitar, todos os itens abaixo devem estar satisfeitos:

- [ ] `lint` + `format:check` (Biome) passando
- [ ] `typecheck` passando
- [ ] `build` passando
- [ ] `test` (Vitest) verde — quando a tarefa possui testes
- [ ] `pulumi preview` sem erros — quando a tarefa toca `infra/`
- [ ] Comportamento dentro do escopo do `spec.md` e do item correspondente do checklist de compliance
- [ ] Documentação atualizada **apenas se** a mudança for notável (API, deploy, comandos, decisões)
- [ ] Commit atômico (1 conceito = 1 commit) e semântico (Conventional Commits)

## Convenção de commits

- **Idioma**: mensagens de commit em **inglês**; documentação/changelog em **português**.
- **Branch**: commits diretos em `main` (sem PR por tarefa; PRs apenas para revisões de fases maiores, quando aplicável).
- **Atomicidade**: um commit por conceito lógico. Se a tarefa envolve código, testes e docs, são commits separados (ex.: `feat(api)` + `test(server)` + `docs`).

### Tipos

| Tipo | Uso | Exemplo |
|---|---|---|
| `feat(scope)` | Nova funcionalidade | `feat(api): add POST /links endpoint` |
| `fix(scope)` | Correção de bug | `fix(api): return 409 on duplicate short_code` |
| `test(scope)` | Testes | `test(server): cover short code collision retry` |
| `docs` | Docs/README/CHANGELOG | `docs: add api reference` |
| `refactor` | Refatoração sem mudança de comportamento | `refactor(storage): extract provider abstraction` |
| `build` | Dockerfile/empacotamento | `build(server): add multi-stage Dockerfile` |
| `ci` | GitHub Actions | `ci: add OIDC deploy workflow` |
| `chore` | Manutenção | `chore: update lockfile` |

### Escopos

`web`, `server`, `api`, `db`, `infra`, `docker`, `ci`, `readme`, `docs`, `changelog`.

### Exemplos de sequência atômica

```
feat(api): add POST /links endpoint
test(server): cover short code collision retry
docs: add api reference
changelog: bump to 0.2.0
```

## Scripts de verificação

Padronizados via `scripts` no `package.json` de cada subprojeto:

- **`web/`**: `lint`, `format:check`, `typecheck`, `build`, `test`
- **`server/`**: `lint`, `format:check`, `typecheck`, `test`, `build`, `db:migrate`
- **`infra/`**: `preview` / `up` via Pulumi CLI (stack `brevly-prod`)

## Documentação

Estrutura em [`docs/`](./README.md), sempre em PT-BR:

- **`docs/`** — documentação complementar por área (API, banco, docker, deploy, infra, CI/CD, decisões).
- **`README.md`** (raiz) — visão geral, stack, quickstart, estrutura e deploy.
- **`CHANGELOG.md`** (raiz) — estilo Keep a Changelog, em PT-BR; atualizado **por versão/fase** e, quando necessário para manter atomicidade, **por tarefa notável**.

### Quando documentar

Atualizar documentação apenas quando a mudança for visível/externa:

- Nova rota/contrato de API → `docs/api.md`;
- Mudança de schema/migrations → `docs/database.md`;
- Mudança de build/container → `docs/docker.md`;
- Mudança de deploy/infra → `docs/deploy.md`, `docs/infra-pulumi.md`, `docs/ci-cd.md`;
- Decisão técnica relevante → `docs/decisions.md` (ADR);
- Mudança notável de comportamento → `CHANGELOG.md`.