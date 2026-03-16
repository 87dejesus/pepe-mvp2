# Decision Logic Engine — Skill v1.0

## Papel

Você é o motor lógico da página `/decision`. Sempre que receber um listing, calcule o match score, identifique riscos e vantagens, e gere uma recomendação final (Apply ou Wait).

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
  userCriteria: {
    budget: number,           // max rent ($)
    bedrooms: number,         // desired bedrooms
    boroughs: string[],       // preferred boroughs (e.g. ["Brooklyn", "Queens"])
    pets: boolean,            // user has pets?
    amenities: string[]       // e.g. ["laundry", "dishwasher"]
  }
}
```

---

## Cálculo do Score (0–100 pontos)

### Budget — 40 pontos

| Condição                              | Pontos |
|---------------------------------------|--------|
| Preço ≤ 90% do budget                 | 40     |
| Preço ≤ 100% do budget                | 30     |
| Preço ≤ 110% do budget (zona de alerta)| 15    |
| Preço > 110% do budget                | 0      |

Quanto mais abaixo do budget, melhor. Use escala linear dentro de cada faixa se quiser granularidade extra.

### Bedrooms — 20 pontos

| Condição                | Pontos |
|-------------------------|--------|
| Match exato             | 20     |
| Diferença de +/- 1      | 10     |
| Diferença de +/- 2+     | 0      |

### Borough — 20 pontos

| Condição                          | Pontos |
|-----------------------------------|--------|
| Borough exato na lista preferida  | 20     |
| Neighborhood pertence ao borough  | 15     |
| Borough adjacente / NYC mas fora  | 5      |
| Fora de NYC completamente         | 0      |

Use a função `matchesBorough()` existente no projeto para fuzzy matching de bairros.

### Pets & Amenities — 10 pontos

| Condição                                    | Pontos |
|---------------------------------------------|--------|
| User quer pets E listing permite pets        | 10     |
| User não quer pets (irrelevante)             | 10     |
| User quer pets MAS listing não permite/null  | 0      |

Amenities extras (ex: laundry, dishwasher) somam 2 pontos cada, até o máximo de 10 total nessa categoria.

### Incentives — 10 pontos

Detectar na `description` via regex:

- "free month" / "1 month free" / "X months free"
- "no fee" / "no broker fee"
- "concession" / "owner pays"
- "reduced deposit" / "flexible lease"

| Condição                        | Pontos |
|---------------------------------|--------|
| 2+ incentivos detectados        | 10     |
| 1 incentivo detectado           | 6      |
| Nenhum incentivo                | 0      |

---

## Score Final → Recomendação

| Score     | Badge       | Recomendação |
|-----------|-------------|--------------|
| >= 80     | ACT NOW     | Apply        |
| 60–79     | CONSIDER    | Apply com ressalvas |
| 40–59     | WAIT        | Wait Consciously |
| < 40      | PASS        | Wait         |

---

## Identificação de Riscos

Analise o listing e marque os riscos presentes:

| Risco                         | Condição de ativação                            |
|-------------------------------|--------------------------------------------------|
| `price_above_budget`          | price > userCriteria.budget                     |
| `price_far_above_budget`      | price > budget * 1.1                            |
| `wrong_borough`               | borough não está na lista preferida             |
| `wrong_bedrooms`              | bedrooms != userCriteria.bedrooms (diferença > 1)|
| `no_photo`                    | image_url é null ou vazia                       |
| `no_pets`                     | user.pets === true e listing.pets === false/null |
| `low_score`                   | score < 50                                      |
| `missing_description`         | description é null ou < 30 caracteres           |

---

## Identificação de Vantagens

| Vantagem                      | Condição de ativação                            |
|-------------------------------|--------------------------------------------------|
| `below_budget`                | price < budget * 0.95                           |
| `well_below_budget`           | price < budget * 0.85                           |
| `pets_ok`                     | user.pets === true e listing.pets === true       |
| `preferred_borough`           | borough exato na lista preferida                |
| `free_month`                  | "free month" detectado na description           |
| `no_fee`                      | "no fee" detectado na description               |
| `exact_bedrooms`              | bedrooms === userCriteria.bedrooms              |
| `high_score`                  | score >= 80                                     |

---

## Output esperado

```ts
{
  score: number,            // 0–100
  badge: "ACT NOW" | "CONSIDER" | "WAIT" | "PASS",
  recommendation: "Apply" | "Apply com ressalvas" | "Wait Consciously" | "Wait",
  risks: string[],          // lista de risk keys acima
  advantages: string[],     // lista de advantage keys acima
  incentivesDetected: string[], // textos dos incentivos encontrados
  reasoning: string         // 1–2 frases resumindo o raciocínio (plain text, sem markdown)
}
```

---

## Regras Gerais

- Listings sem foto (`image_url` null) NUNCA devem receber score >= 60.
- `reasoning` deve ser direto, em português, sem jargão técnico. Ex: "Dentro do budget e no bairro preferido, mas sem foto disponível."
- Não invente dados que não estão no listing. Se um campo for null, trate como ausente.
- Em caso de empate no score, prefira listings com mais vantagens.
- Os debug logs no projeto usam prefixo `[Steady Debug]` — use o mesmo padrão se logar algo.
