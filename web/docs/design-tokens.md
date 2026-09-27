# Design Tokens — Brev.ly

Extraído do arquivo Figma oficial **"Encurtador de Links (Community)"**
(`WV2Kpt6RdFhUJHV9lCfMGU`) — página **🎨 Style Guide**. Especificação completa
das telas em [`design-spec.md`](./design-spec.md).

---

## 1. Cores

Nomes oficiais definidos no Style Guide do Figma.

| Token | Hex | Uso |
|---|---|---|
| `blue-base` | `#2C46B1` | Primary — botão, links, active/error input, ícone logo, fallback links (underline) |
| `blue-dark` | `#2C4091` | Hover do botão primary |
| `white` | `#FFFFFF` | Texto sobre primary |
| `gray-100` | `#F9F9FB` | Fundo dos cards (superfícies) |
| `gray-200` | `#E4E6EC` | **Fundo das telas**, botão secondary, icon button, dividers |
| `gray-300` | `#CDCFD5` | Border input default |
| `gray-400` | `#74798B` | Placeholder |
| `gray-500` | `#4D505C` | Label do input, texto secundário (acessos, URL original), label secondary button, texto empty state, error message |
| `gray-600` | `#1F2025` | Texto principal (títulos, texto do input preenchido) |
| `danger` | `#B12C4D` | Estado de erro do input |
| `black` | `#000000` | Vetor base dos ícones Phosphor (Copy, Trash, DownloadSimple, Warning, Link) — cor efetiva via `currentColor` |

> **Ícones:** no Style Guide, o vetor base dos ícones Phosphor é `#000000` (não `white`). Nas telas eles aparecem como instâncias `IMAGE-SVG` sem override de fill — a cor renderizada vem do vetor. Ao implementar com lucide-react, usar `currentColor` (padrão) herdando a cor do contexto (ex.: sobre `gray-200`, o ícone permanece escuro).

### Valores renderizados (pixel-accurate)

Os hex acima são os nominais do Style Guide. Os valores renderizados no canvas:

| Token | Renderizado |
|---|---|
| `blue-base` | `#2C46B1` |
| `blue-dark` | `#2C4090` |
| `gray-100` | `#F9F9FA` |
| `gray-200` | `#E4E5EB` |
| `gray-300` | `#CDCED4` |
| `gray-400` | `#74788A` |
| `gray-500` | `#4C4F5B` |
| `gray-600` | `#1F2025` |

---

## 2. Tipografia

**Família:** Open Sans (via Google Fonts). **Logo:** Quicksand 700.

| Nome | Size | Line Height | Weight | Case |
|---|---|---|---|---|
| `text-xl` | 24px | 32px | 700 | Default |
| `text-lg` | 18px | 24px | 700 | Default |
| `text-md` | 14px | 18px | 600 | Default |
| `text-sm` | 12px | 16px | 400 / 600 | Default |
| `text-xs` | 10px | 14px | 400 | **Uppercase** |

---

## 3. Componentes (resumo)

| Componente | Dimensão | Radius | Fill | Border |
|---|---|---|---|---|
| Button primary | 352×48 (full) | 8 | `blue-base` / `blue-dark` (hover) | — |
| Button secondary | 100×32 | 4 | `gray-200` | `blue-base` w1 (hover) |
| Icon Button | 32×32 | 4 | `gray-200` | `blue-base` w1 (hover) |
| Input | 316×48 | 8 | — | `gray-300` w1 / `blue-base`·`danger` w1.5 |

Detalhes de estados e layout em [`design-spec.md`](./design-spec.md).