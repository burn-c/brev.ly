# Design Tokens — Brev.ly

Extraído do arquivo Figma oficial **"Encurtador de Links (Community)"**
(`WV2Kpt6RdFhUJHV9lCfMGU`) — página **🎨 Style Guide**. Fonte de verdade para a UI.

---

## 1. Cores

### Produto (marca)

| Token | Hex | Uso |
|---|---|---|
| `brand` | `#2C46B1` | Primary — botões, links, active input, stroke hover |
| `brand-dark` | `#2C4090` | Hover do botão primary |

### Base (grayscale)

| Token | Hex | Uso |
|---|---|---|
| `gray-0` | `#FFFFFF` | Texto sobre primary, ícones |
| `gray-50` | `#F9F9FA` | Fundo suave / superfícies claras |
| `gray-100` | `#E4E5EB` | **Fundo das telas**, botão secondary, icon button |
| `gray-200` | `#CDCED4` | Border input default |
| `gray-400` | `#74788A` | Placeholder / texto secundário |
| `gray-600` | `#4C4F5B` | Texto corpo secundário, label secondary button |
| `gray-900` | `#1F2025` | Texto principal (títulos, headings) |

### Feedback

| Token | Hex | Uso |
|---|---|---|
| `danger` | `#B12C4D` | Estado de erro do input |

---

## 2. Tipografia

**Família:** Open Sans (via Google Fonts).

| Nome | Size | Line Height | Weight | Case |
|---|---|---|---|---|
| `text-xl` | 24px | 32px | 700 (Bold) | Default |
| `text-lg` | 18px | 24px | 700 (Bold) | Default |
| `text-md` | 14px | 18px | 600 (SemiBold) | Default |
| `text-sm` | 12px | 16px | 400 / 600 (Regular & SemiBold) | Default |
| `text-xs` | 10px | 14px | 400 (Regular) | **Uppercase** |

> Uso confirmado nas telas: títulos (`Novo link`, `Meus links`) → `text-lg` 700;
> headlines de estado (`Redirecionando...`, `Link não encontrado`) → `text-xl` 700;
> link encurtado na listagem → `text-md` 600 em `#2C46B1`.

**Logo:** `Quicksand` 700 (texto "brev.ly" no Figma). Os ícones são do pacote
**Phosphor Icons** (`Copy`, `Trash`, `Warning`, `DownloadSimple`, `Link`).

---

## 3. Componentes

### Button — primary (default 352×48)

| Estado | Fill | Texto | Radius |
|---|---|---|---|
| default | `#2C46B1` | `#FFFFFF` 14px 600 | 8 |
| hover | `#2C4090` | `#FFFFFF` 14px 600 | 8 |
| disabled | `#2C46B1` opacidade 0.5 | `#FFFFFF` 14px 600 | 8 |

### Button — secondary (100×32)

| Estado | Fill | Texto | Radius |
|---|---|---|---|
| default | `#E4E5EB` | `#4C4F5B` 12px 600 | 4 |
| hover | `#E4E5EB` + stroke `#2C46B1` w1 | `#4C4F5B` 12px 600 | 4 |
| disabled | `#E4E5EB` opacidade 0.5 | `#4C4F5B` 12px 600 | 4 |

> Botão secundário contém ícone (16×16) + label (32×16). Usado no header "Meus links" (CSV).

### Icon Button (32×32)

| Estado | Fill | Radius |
|---|---|---|
| default | `#E4E5EB` | 4 |
| hover | `#E4E5EB` + stroke `#2C46B1` w1 | 4 |

> Ícone 16×16 dentro. Usado nas ações Copy/Trash de cada row.

### Input (352×48)

| Estado | Border | Texto | Radius |
|---|---|---|---|
| default (empty) | `#CDCED4` w1 | placeholder `#74788A` 14px 400 | 8 |
| active | `#2C46B1` w1.5 | texto `#2C46B1` 14px 400 | 8 |
| error | `#B12C4D` w1.5 | texto `#2C46B1` 14px 400 | 8 |

> Estrutura: Label (10px uppercase, 400) + Input 48px + mensagem de erro opcional
> (16px, com ícone `Warning`). Altura do componente: 70px sem erro, 94px com erro.

---

## 4. Telas

Fundo de todas as telas: **`#E4E5EB`** (gray-100).

### `/` — Home (Links)

- **Header**: Logo `brev.ly` (ícone + Quicksand 700) à esquerda.
- **"Novo link"** (380×340 desktop / 366×316 mobile):
  - Título `text-lg` 700;
  - Form com 2 inputs (URL original + short code opcional) + Button primary full-width (48px).
- **"Meus links"** (580×396 desktop / 366×348 mobile):
  - Header com título + Button secondary (DownloadSimple + "CSV");
  - Lista com rows 42px separadas por divider (`#E4E5EB`):
    - Link encurtado `#2C46B1` 14px 600;
    - URL original truncada 12px 400 `#4C4F5B`;
    - Contador "N acessos" 12px 400 `#4C4F5B`;
    - Ações: Copy + Trash (icon buttons).

### `/` — Home (Empty state)

Mesmo layout, mas a lista mostra placeholder: ícone `Link` 32×32 + texto "Placeholder".

### `/:url-encurtada` — Redirect

- Logo_Icon 48×48;
- "Redirecionando..." `text-xl` 700;
- "O link será aberto automaticamente em alguns instantes."
- "Não foi redirecionado? Acesse aqui" (link manual).

### `*` — Not Found

- Ilustração "404" (vetorial);
- "Link não encontrado" `text-xl` 700;
- "O link que você está tentando acessar não existe, foi removido ou é uma URL inválida. Saiba mais em brev.ly."

### Breakpoints

- **Desktop**: telas 1366×720.
- **Mobile**: telas 390×788/784. Colunas/fontes ajustam (ex.: inputs 318px).

---

## 5. Stack de implementação (web/)

- TailwindCSS v3 (mobile-first).
- Fonte: Open Sans via Google Fonts no `index.html`.
- Ícones: lucide-react (substitutos de Phosphor: `Copy`, `Trash2`, `TriangleAlert`,
  `Download`, `Link`, `Scissors`).