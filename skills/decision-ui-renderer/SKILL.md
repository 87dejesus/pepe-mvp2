# Decision UI Renderer — Skill v1.0

## Papel

Você é o renderizador da UI da página `/decision`. Receba o output do Decision Logic Engine e gere código React/Next.js + Tailwind para exibir score, pontos positivos, riscos, recomendação final, e botões Apply e Wait.

---

## Input esperado

```ts
{
  listing: {
    price: number,
    bedrooms: number,
    bathrooms: number,
    borough: string,
    neighborhood: string,
    description: string,
    image_url: string | null,
    pets: boolean | null,
    original_url: string
  },
  analysis: {
    score: number,
    badge: "ACT NOW" | "CONSIDER" | "WAIT" | "PASS",
    recommendation: "Apply" | "Apply com ressalvas" | "Wait Consciously" | "Wait",
    risks: string[],
    advantages: string[],
    incentivesDetected: string[],
    reasoning: string
  }
}
```

---

## Estrutura Fixa do Card

### 1. Imagem

```tsx
{listing.image_url ? (
  <img
    src={listing.image_url}
    alt={listing.neighborhood}
    className="w-full h-48 object-cover rounded-t-md"
  />
) : (
  <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-t-md border-b-2 border-black">
    <span className="text-gray-400 font-bold text-sm tracking-widest">NO PHOTO</span>
  </div>
)}
```

### 2. Preço, Bairro, Beds/Baths

```tsx
<div className="p-4 space-y-1">
  <p className="text-2xl font-black">${listing.price.toLocaleString()}/mo</p>
  <p className="text-sm text-gray-600 font-medium">{listing.neighborhood}, {listing.borough}</p>
  <p className="text-sm text-gray-500">{listing.bedrooms}bd / {listing.bathrooms}ba</p>
</div>
```

### 3. Match Score (barra de progresso)

```tsx
<div className="px-4 pb-2">
  <div className="flex justify-between text-xs font-bold mb-1">
    <span className="text-gray-500 uppercase tracking-wide">Match Score</span>
    <span className="text-[#00A651]">{analysis.score}%</span>
  </div>
  <div className="bg-gray-200 h-2 rounded-full">
    <div
      className="bg-[#00A651] h-2 rounded-full transition-all duration-500"
      style={{ width: `${analysis.score}%` }}
    />
  </div>
</div>
```

> Nunca use classes Tailwind dinâmicas como `w-[${score}%]` — o JIT não compila valores interpolados. Sempre use `style={{ width: ... }}` para valores dinâmicos.

### 4. Badge de Recomendação

```tsx
const badgeStyles: Record<string, string> = {
  "ACT NOW":  "bg-[#00A651] text-white border-[#00A651]",
  "CONSIDER": "bg-yellow-400 text-black border-yellow-400",
  "WAIT":     "bg-orange-400 text-white border-orange-400",
  "PASS":     "bg-gray-400 text-white border-gray-400",
}

<span className={`inline-block px-3 py-1 text-xs font-black uppercase tracking-widest border-2 rounded ${badgeStyles[analysis.badge]}`}>
  {analysis.badge}
</span>
```

### 5. Reasoning

```tsx
<p className="px-4 py-2 text-sm text-gray-700 italic">
  {analysis.reasoning}
</p>
```

### 6. Pontos Positivos (Advantages)

```tsx
const advantageLabels: Record<string, string> = {
  below_budget:      "Abaixo do budget",
  well_below_budget: "Bem abaixo do budget",
  pets_ok:           "Aceita pets",
  preferred_borough: "No bairro preferido",
  free_month:        "Mês grátis detectado",
  no_fee:            "Sem taxa de corretagem",
  exact_bedrooms:    "Quartos exatos",
  high_score:        "Excelente match",
}

{analysis.advantages.length > 0 && (
  <ul className="px-4 pb-2 space-y-1">
    {analysis.advantages.map((key) => (
      <li key={key} className="flex items-center gap-2 text-sm text-[#00A651] font-medium">
        <span>✓</span>
        <span>{advantageLabels[key] ?? key}</span>
      </li>
    ))}
  </ul>
)}
```

### 7. Riscos

```tsx
const riskLabels: Record<string, string> = {
  price_above_budget:     "Acima do budget",
  price_far_above_budget: "Muito acima do budget",
  wrong_borough:          "Fora dos bairros preferidos",
  wrong_bedrooms:         "Número de quartos diferente",
  no_photo:               "Sem foto disponível",
  no_pets:                "Não aceita pets",
  low_score:              "Score baixo",
  missing_description:    "Descrição ausente",
}

{analysis.risks.length > 0 && (
  <ul className="px-4 pb-2 space-y-1">
    {analysis.risks.map((key) => (
      <li key={key} className="flex items-center gap-2 text-sm text-orange-500 font-medium">
        <span>⚠</span>
        <span>{riskLabels[key] ?? key}</span>
      </li>
    ))}
  </ul>
)}
```

### 8. Incentivos Detectados

```tsx
{analysis.incentivesDetected.length > 0 && (
  <div className="px-4 pb-2">
    <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Incentivos</p>
    <div className="flex flex-wrap gap-1">
      {analysis.incentivesDetected.map((incentive, i) => (
        <span key={i} className="bg-yellow-100 border border-yellow-400 text-yellow-800 text-xs px-2 py-0.5 rounded font-medium">
          {incentive}
        </span>
      ))}
    </div>
  </div>
)}
```

### 9. Botões Apply e Wait

```tsx
<div className="px-4 pb-4 pt-2 flex gap-3">
  <a
    href={listing.original_url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex-1 bg-[#00A651] text-white font-black text-sm uppercase tracking-widest text-center py-3 border-2 border-black shadow-[3px_3px_0px_0px_black] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_black] transition-all"
  >
    VIEW FULL LISTING
  </a>
  <button
    onClick={onWait}
    className="flex-1 bg-white text-black font-black text-sm uppercase tracking-widest py-3 border-2 border-black shadow-[3px_3px_0px_0px_black] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_black] transition-all"
  >
    WAIT CONSCIOUSLY
  </button>
</div>
```

> `onWait` deve redirecionar para `/exit`.

---

## Card Completo — Estrutura Final

```tsx
// components/DecisionAnalysisCard.tsx
"use client"

import { badgeStyles, advantageLabels, riskLabels } from "@/lib/decisionUiMaps"

interface Props {
  listing: ListingType
  analysis: AnalysisType
  onWait: () => void
}

export function DecisionAnalysisCard({ listing, analysis, onWait }: Props) {
  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_black] rounded-md overflow-hidden max-w-sm w-full">
      {/* Imagem */}
      {/* Preço / Bairro / Beds */}
      {/* Match Score */}
      {/* Badge + Reasoning */}
      {/* Advantages */}
      {/* Risks */}
      {/* Incentivos */}
      {/* Botões */}
    </div>
  )
}
```

---

## Design System — Classes Consistentes

| Elemento              | Classes Tailwind                                                               |
|-----------------------|--------------------------------------------------------------------------------|
| Card container        | `bg-white border-2 border-black shadow-[4px_4px_0px_0px_black] rounded-md`    |
| Botão primário        | `bg-[#00A651] text-white border-2 border-black shadow-[3px_3px_0px_0px_black]`|
| Botão secundário      | `bg-white text-black border-2 border-black shadow-[3px_3px_0px_0px_black]`    |
| Score bar (outer)     | `bg-gray-200 h-2 rounded-full`                                                 |
| Score bar (inner)     | `bg-[#00A651] h-2 rounded-full transition-all duration-500`                   |
| Texto de risco        | `text-orange-500 font-medium text-sm`                                          |
| Texto de vantagem     | `text-[#00A651] font-medium text-sm`                                           |
| Badge ACT NOW         | `bg-[#00A651] text-white border-[#00A651]`                                     |
| Badge CONSIDER        | `bg-yellow-400 text-black border-yellow-400`                                   |
| Badge WAIT            | `bg-orange-400 text-white border-orange-400`                                   |
| Badge PASS            | `bg-gray-400 text-white border-gray-400`                                       |
| Background de página  | `from-[#3B82F6] to-[#1E3A8A]` (gradient)                                      |

---

## Regras Gerais

- Sempre use `style={{ width: `${score}%` }}` para larguras dinâmicas — nunca classes Tailwind interpoladas.
- Siga o padrão neobrutalista: `border-2 border-black` + `shadow-[Xpx_Xpx_0px_0px_black]` em todos os cards e botões.
- Imagens: sempre com fallback "NO PHOTO" se `image_url` for null/vazio.
- Botão "VIEW FULL LISTING" abre `original_url` em nova aba (`target="_blank"`).
- Botão "WAIT CONSCIOUSLY" chama `onWait` → redireciona para `/exit`.
- Não use `text-green-*` do Tailwind para verde — sempre use `text-[#00A651]` ou `bg-[#00A651]`.
- O card usa `"use client"` porque tem interatividade (botões, hover states).
- Debug logs com prefixo `[Steady Debug]` se necessário.
