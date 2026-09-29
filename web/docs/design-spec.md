# Design Spec — Brev.ly (extraído do Figma)

Especificação completa extraída do arquivo Figma oficial **"Encurtador de Links (Community)"**
(`https://www.figma.com/design/WV2Kpt6RdFhUJHV9lCfMGU/`), páginas **🎨 Style Guide** e **💻 Projeto**.
Fonte de verdade para a implementação da UI. Tokens resumidos em [`design-tokens.md`](./design-tokens.md).

> **Revisão (2026-09-28):** spec reconciliada com o canvas — corrigidos o label do input (`gray-500`),
> o texto do empty state (`gray-500`, CAIXA ALTA) e as dimensões dos botões (primary full-width,
> secondary `hug`); adicionados botões disabled no empty state, fallback links sublinhados (`blue-base`),
> gaps da listagem mobile, inputs preenchidos no desktop e a cor base `#000000` dos ícones Phosphor.
>
> **Revisão (2026-09-29):** ícone de erro do input e do dialog com cor `danger`; botão "Baixar CSV"
> desabilitado quando não há links; logo do header centralizada no mobile; barra de scroll fina/custom
> na listagem; primeiro carregamento da lista com loader cinza + "CARREGANDO LINKS..." (no lugar do
> skeleton); barra de progresso 4px (`blue-base`, indeterminada) no topo da seção "Meus links" durante
> refetch; página 404 com o "brev.ly" como link para a home.

---

## 1. Tokens de cor (nomes oficiais do Figma)

| Token (Figma) | Hex nominal | Hex renderizado | Uso |
|---|---|---|---|
| `blue-base` | `#2C46B1` | `#2C46B1` | Primary: botão, link encurtado, active/error input, ícone logo, fallback links (underline) |
| `blue-dark` | `#2C4091` | `#2C4090` | Hover do botão primary |
| `white` | `#FFFFFF` | `#FFFFFF` | Texto sobre primary |
| `gray-100` | `#F9F9FB` | `#F9F9FA` | **Fundo dos cards** (New link, My links, Content) |
| `gray-200` | `#E4E6EC` | `#E4E5EB` | **Fundo das telas**, botão secondary, icon button, dividers |
| `gray-300` | `#CDCFD5` | `#CDCED4` | Border do input default |
| `gray-400` | `#74798B` | `#74788A` | Placeholder |
| `gray-500` | `#4D505C` | `#4C4F5B` | **Label do input**, texto secundário (acessos, URL original), label secondary button, texto do empty state, error message |
| `gray-600` | `#1F2025` | `#1F2025` | Texto principal (títulos, texto do input preenchido) |
| `danger` | `#B12C4D` | `#B12C4D` | Estado de erro do input, parte do "404" ilustração |
| `black` | `#000000` | `#000000` | Vetor base dos ícones Phosphor (cor efetiva via `currentColor`) |

---

## 2. Tipografia

**Família:** Open Sans (via Google Fonts). **Logo:** Quicksand 700.

| Style | Size | Line Height | Weight | Uso |
|---|---|---|---|---|
| `text-xl` | 24px | 32px | 700 | Headlines de estado: "Redirecionando...", "Link não encontrado" |
| `text-lg` | 18px | 24px | 700 | Títulos de card: "Novo link", "Meus links" |
| `text-md` | 14px | 18px | 600 | Link encurtado na listagem (`blue-base`); texto de redirect/404 |
| `text-md` | 14px | 18px | 400 | Placeholder e texto digitado no input |
| `text-sm` | 12px | 16px | 600 | Label do botão secondary; label do input (label do error) |
| `text-sm` | 12px | 16px | 400 | URL original, contador "N acessos", error message |
| `text-xs` | 10px | 14px | 400 | Label do input (**uppercase**, `gray-500`), texto do empty state (**uppercase**) |

**Logo "brev.ly"** — Quicksand 700, ~18.67px, cor `blue-base`; ícone (scissors) 26×22 `blue-base`.

**Ícones:** Phosphor Icons (Copy, Trash, Warning, DownloadSimple, Link). 32×32 nas telas, 16×16 nos botões. Vetor base `#000000` → usar `currentColor` (lucide-react) e ajustar a cor ao contexto (ex.: `gray-600`/`gray-500` sobre `gray-200`).

---

## 3. Componentes

### 3.1 Button — primary

| Propriedade | Valor |
|---|---|
| Dimensões | **full-width** (estica até a largura do card): 316×48 desktop · 318×48 mobile. A base 352×48 existe apenas no componente do Style Guide |
| Radius | 8 |
| Label | Open Sans 14px 600, `white` |
| default | fill `blue-base` |
| hover | fill `blue-dark` |
| disabled | fill `blue-base` opacidade 0.5 |

### 3.2 Button — secondary ("Baixar CSV", ~100×32)

| Propriedade | Valor |
|---|---|
| Dimensões | 32 de altura, **largura `hug`** (~100–104px, auto) |
| Radius | 4 |
| Conteúdo | ícone 16×16 + label "Baixar CSV" |
| Label | Open Sans 12px 600, `gray-500` |
| default | fill `gray-200` |
| hover | fill `gray-200` + stroke `blue-base` w1 |
| disabled | fill `gray-200` opacidade 0.5 |

### 3.3 Icon Button (Copy / Trash, 32×32)

| Propriedade | Valor |
|---|---|
| Dimensões | 32×32 · ícone 16×16 |
| Radius | 4 |
| default | fill `gray-200` |
| hover | fill `gray-200` + stroke `blue-base` w1 |

### 3.4 Input (316×48 / 318×48)

Estrutura por campo (altura total 70px):
```
Label (10px UPPERCASE, gray-500)          ← dy 0
gap 8px
Input box (48px)                          ← dy 8
```

| Estado | Border | Texto | Radius |
|---|---|---|---|
| default | `gray-300` w1 | placeholder `gray-400` 14px 400 | 8 |
| active | `blue-base` w1.5 | texto `gray-600` 14px 400 | 8 |
| error | `danger` w1.5 | texto `gray-600` 14px 400 | 8 |

Com erro, o componente ganha +24px (mensagem 16px com ícone `Warning` 16×16). Altura: 70px sem erro, 94px com erro. O box do input **não tem fill** (só stroke); o texto digitado usa `gray-600`.

---

## 4. Layout — Home `/` (Links)

### 4.1 Desktop (1366×720)

- Fundo: `gray-200` (`#E4E5EB`).
- Logo (96×24) topo-esquerda, y=88 do topo da tela.
- Dois cards lado a lado (topo y=144), padding interno **32px**:
  - **New link** — 380×340
  - **My links** — 580×396
- Gap entre cards: ~20px (380+580+20 = 980 → centralizado em 1366).

#### Card New link (380×340, padding 32)

```
Título "Novo link" (text-lg 700)
gap 24px
Form (316×156):
  Input "link original"     ← placeholder ex.: "www.exemplo.com.br"
  gap 16px
  Input "link encurtado"    ← placeholder ex.: "brev.ly/"
gap 24px
Button primary "Salvar link" (316×48)
```

#### Card My links (580×396, padding 32)

```
Header (516×32):
  "Meus links" (text-lg 700)
  Button secondary "Baixar CSV" (100×32) à direita
List (516×280):
  Divider (516×1, gray-200)
  Row × 4 (516×42):
    Title (347×38):
      link encurtado 14px 600 blue-base   "brev.ly/Portfolio-Dev"
      URL original 12px 400 gray-500      "devsite.portfolio.com.br/..."
    Contador 12px 400 gray-500            "30 acessos"
    Actions (68×32): IconButton Copy + IconButton Trash
```

### 4.2 Mobile (390×788)

- Padding lateral **12px**, cards **366px** de largura, padding interno **24px**.
- Empilhados verticalmente: Logo → New link → My links.
- Inputs 318×48; botão 318×48.
- **Gaps da listagem diferem do desktop**: List gap **12px** (desktop 16), Row gap **16px** (desktop 20).

---

## 5. Layout — Home `/` (Empty state)

Mesma estrutura do Home, com a lista vazia:

```
List:
  Divider
  Empty placeholder (padding 16px 0 24px):
    ícone Link 32×32 (Phosphor, cor base #000000 → currentColor)
    "ainda não existem links cadastrados" 10px 400 gray-500 UPPERCASE centralizado
```

> **No Figma, o empty state também exibe os botões desabilitados** (opacidade 0.5): o primary "Salvar link" e o secondary "Baixar CSV" aparecem na variante disabled. O texto do empty renderiza em **CAIXA ALTA** por causa do `textCase: UPPER` do estilo `Text Xs`.

---

## 6. Layout — Redirect `/:url-encurtada`

### Desktop (1366×720) / Mobile (390×784)

- Fundo: `gray-200`.
- **Card Content** centralizado: 580×296 (desktop) / 366×282 (mobile), fill `gray-100`, radius **8**.
- Conteúdo — **logo centralizado** (padX 266 desktop); título e texto com **padX 48**, padY 64:

```
Logo_Icon 48×48 (blue-base)        ← centralizado
gap 24px
"Redirecionando..."  (text-xl 700, gray-600)
gap 24px
Text (484×40):
  "O link será aberto automaticamente em alguns instantes."  14px 600 gray-500
  "Não foi redirecionado? Acesse aqui"                       14px 600 gray-500
```

> O link manual **"Acesse aqui"** é a ação de fallback (abre a URL original diretamente) e aparece **sublinhado + `blue-base`** (style `Text Md` com span underline `#2C46B1`). O card usa **padding 64px 48px** (desktop) / **48px 20px** (mobile), gap 24.

---

## 7. Layout — Not Found `*`

### Desktop (1366×720) / Mobile (390×784)

- Fundo: `gray-200`.
- **Card Content** centralizado: 580×329 (desktop) / 366×302 (mobile), fill `gray-100`, radius **8**.
- Conteúdo — **ilustração centralizada** (padX 193 desktop); título e texto com **padX 48**, padY 64:

```
Ilustração "404" 194×85 (desktop) / 164×72 (mobile)
  - formas em blue-base e danger (os "4"s têm a quina em danger)
gap 24px
"Link não encontrado"  (text-xl 700, gray-600)
gap 24px
Text (484×36):
  "O link que você está tentando acessar não existe, foi removido ou é uma URL inválida. Saiba mais em brev.ly."  14px 600 gray-500
```

> O **"brev.ly"** do texto aparece **sublinhado + `blue-base`** (mesmo estilo dos fallback links). Card: padding 64px 48px (desktop) / 48px 20px (mobile), gap 24.

---

## 8. Resumo de telas (página 💻 Projeto)

| Tela | Rota | Desktop | Mobile |
|---|---|---|---|
| Links | `/` | 1366×720 | 390×788 |
| Empty | `/` (sem dados) | 1366×720 | 390×788 |
| Redirect | `/:url-encurtada` | 1366×720 | 390×784 |
| Not Found | `*` | 1366×720 | 390×784 |

> **Altura das telas mobile:** Links/Empty = 788, Redirect/Not Found = 784 (diferença de 4px no canvas).

> **Validação de profundidade:** revisado no canvas — não há **sombras/efeitos** em nenhum
> componente ou tela (o design é flat). A página "🚀 Sobre" contém apenas conteúdo promocional
> (About/Thumbnail), fora do escopo da UI do app.
>
> **Inputs preenchidos no desktop:** a tela "Links / Desktop" do Figma exibe os inputs **preenchidos**
> (ex.: `linkedin.com/in/myprofile` e `brev.ly/Linkedin-Profile` em `gray-600`), enquanto a versão
> mobile e a Empty usam placeholders (`gray-400`). Na implementação, o estado default do formulário
> usa placeholders; o preenchido é o resultado do submit.

---

## 9. Assets (exportados do Figma)

| Asset | Arquivo | Origem (Figma) | Uso |
|---|---|---|---|
| Logo | `web/assets/Logo.svg` (162×44) | Style Guide → Vetores → `Logo` | Header das telas Home |
| Logo_Icon | `web/assets/Logo_Icon.svg` (52×52) | Style Guide → Vetores → `Logo_Icon` | Card de Redirect (`/:url-encurtada`) |
| 404 | `web/assets/404.svg` (128×56) | Style Guide → Vetores → `404` | Ilustração do card Not Found (`*`) |

> Ícones da UI (Copy, Trash, Warning, DownloadSimple, Link) são componentes
> **Phosphor Icons** no Style Guide — **não exportar como SVG**; usar substitutos
> lucide-react: `Copy`, `Trash2`, `TriangleAlert`, `Download`, `Link`, `Scissors`.
>
> Os demais elementos raster do arquivo (avatar no "🚀 Sobre", imagens dos banners
> "Saiba mais") são conteúdo **promocional**, fora do escopo da UI do app.

---

## 10. Referência cruzada com a spec

- **Checklist item 24** — "Siga o mais fielmente possível o layout do Figma": implementação orientada a esta spec.
- **Item 25** — UX: empty state (seção 5), loading (skeletons/spinner), bloqueio de ações (botão disabled), toasts.
- **Item 26** — Responsividade: telas mobile 390px (seções 4.2, 6, 7).

> **Acesso ao Figma** (reconsultar antes de implementar): ver seção "Acesso ao Figma" em [`docs/status.md`](../../docs/status.md).