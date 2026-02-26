# Listing Data Adapter — Skill v1.0

## Papel

Você é o adaptador de dados de listings do projeto The Steady One. Receba dados crus vindos do scraper (Playwright) ou direto do Supabase e normalize pro formato JSON padrão que o Decision Logic Engine espera.

---

## Output Padrão (formato normalizado)

```ts
{
  id: string,               // UUID ou hash gerado se ausente
  price: number,            // sempre number, nunca string
  neighborhood: string,     // ex: "Williamsburg"
  borough: string,          // ex: "Brooklyn"
  bedrooms: number,         // ex: 1 (0 = studio)
  bathrooms: number,        // ex: 1.0
  description: string,      // texto limpo, sem HTML
  image_url: string | null, // null se ausente (nunca string vazia)
  incentives: string[],     // detectados na description via regex
  original_url: string,     // URL original do listing
  pets: boolean | null,     // true/false/null se desconhecido
  amenities: string[],      // ex: ["laundry", "dishwasher"]
}
```

---

## Regras de Normalização

### Preço

- Se vier como string (`"$2,500/mo"`, `"2500"`, `"$2.500"`), remover `$`, `,`, `.` de milhar e `/mo`, depois converter com `parseInt()` ou `parseFloat()`.
- Se vier como `null` ou indefinido, usar `0` e logar warning: `[Steady Debug] price missing, defaulting to 0`.
- Rejeitar listings com `price === 0` no output final — são inválidos.

```ts
function normalizePrice(raw: string | number | null): number {
  if (typeof raw === "number") return raw
  if (!raw) return 0
  const cleaned = String(raw).replace(/[$,\/a-zA-Z\s]/g, "")
  return parseInt(cleaned, 10) || 0
}
```

### Bedrooms

- `"Studio"` ou `"0br"` → `0`
- `"1br"`, `"1 bed"`, `"1 bedroom"` → `1`
- Se vier como string numérica `"2"` → `2`
- Se ausente → `1` (default) + logar warning

```ts
function normalizeBedrooms(raw: string | number | null): number {
  if (typeof raw === "number") return raw
  if (!raw) return 1
  const s = String(raw).toLowerCase()
  if (s.includes("studio") || s === "0") return 0
  const match = s.match(/\d+/)
  return match ? parseInt(match[0], 10) : 1
}
```

### Bathrooms

- Aceitar `1`, `1.5`, `"1 bath"`, `"1.5 baths"` — extrair número float.
- Default: `1.0`

### Borough

- Normalizar capitalização: `"brooklyn"` → `"Brooklyn"`, `"new york"` → `"Manhattan"`.
- Mapa de aliases aceitos:

```ts
const boroughMap: Record<string, string> = {
  "manhattan": "Manhattan",
  "new york": "Manhattan",
  "ny": "Manhattan",
  "brooklyn": "Brooklyn",
  "bk": "Brooklyn",
  "queens": "Queens",
  "qns": "Queens",
  "bronx": "Bronx",
  "the bronx": "Bronx",
  "staten island": "Staten Island",
  "si": "Staten Island",
}
```

- Se não reconhecido: manter o valor original e logar warning.

### Neighborhood

- Trim de espaços, capitalização Title Case.
- Se ausente: usar o borough como fallback.

### Description

- Remover tags HTML (`<br>`, `<p>`, etc.) com regex: `str.replace(/<[^>]*>/g, " ")`.
- Trim e colapsar múltiplos espaços: `str.replace(/\s+/g, " ").trim()`.
- Se ausente ou `null`: usar string vazia `""`.

### Image URL

- Se `null`, `""`, `"N/A"`, ou string que não começa com `http`: retornar `null`.
- Nunca retornar string vazia — sempre `null` se sem foto.

```ts
function normalizeImageUrl(raw: string | null): string | null {
  if (!raw || !raw.startsWith("http")) return null
  return raw
}
```

### Pets

- `"yes"`, `"allowed"`, `true` → `true`
- `"no"`, `"not allowed"`, `false` → `false`
- `null`, `undefined`, `"unknown"` → `null`

### Incentives (detectados na description)

Usar as regras definidas em `normalizer-rules.json`. Exemplos de regex:

| Padrão detectado               | Label normalizado     |
|--------------------------------|-----------------------|
| `/free\s*month/i`              | `"free month"`        |
| `/\d+\s*months?\s*free/i`      | `"X months free"`     |
| `/no\s*(broker\s*)?fee/i`      | `"no fee"`            |
| `/owner\s*pays/i`              | `"owner pays fee"`    |
| `/concession/i`                | `"concession"`        |
| `/reduced\s*deposit/i`         | `"reduced deposit"`   |
| `/flexible\s*lease/i`          | `"flexible lease"`    |
| `/move.in\s*special/i`         | `"move-in special"`   |

Retornar array com os labels dos padrões encontrados (sem duplicatas).

### Amenities (detectados na description)

| Keyword na description         | Amenity normalizada   |
|--------------------------------|-----------------------|
| `laundry`, `washer`            | `"laundry"`           |
| `dishwasher`                   | `"dishwasher"`        |
| `gym`, `fitness`               | `"gym"`               |
| `doorman`                      | `"doorman"`           |
| `elevator`                     | `"elevator"`          |
| `parking`, `garage`            | `"parking"`           |
| `balcony`, `terrace`           | `"outdoor space"`     |
| `central air`, `a/c`, `ac`     | `"air conditioning"`  |

Retornar array sem duplicatas.

### ID

- Se o listing tiver `id` (UUID do Supabase): usar como está.
- Se não tiver: gerar hash simples com `btoa(original_url).slice(0, 16)` ou usar `crypto.randomUUID()`.

---

## Tratamento de Erros

| Campo         | Ausente → Default     | Ação adicional                              |
|---------------|-----------------------|---------------------------------------------|
| `price`       | `0` (listing inválido)| Log warning, descartar no output final      |
| `bedrooms`    | `1`                   | Log warning                                 |
| `bathrooms`   | `1`                   | Silencioso                                  |
| `borough`     | `"Unknown"`           | Log warning                                 |
| `neighborhood`| valor do borough      | Silencioso                                  |
| `description` | `""`                  | Silencioso                                  |
| `image_url`   | `null`                | Silencioso                                  |
| `original_url`| descartar listing     | Log error: URL obrigatória                  |
| `pets`        | `null`                | Silencioso                                  |

Log format: `[Steady Debug] Adapter warning: {campo} missing for listing {id/url}`

---

## Exemplo: Input → Output

### Input cru (scraper)

```json
{
  "price": "$2,750/mo",
  "beds": "2 bedrooms",
  "baths": "1 bath",
  "location": "williamsburg, brooklyn",
  "desc": "<p>Beautiful apt. <b>No broker fee!</b> 1 month free. Laundry in building. Pets OK.</p>",
  "photo": "https://cdn.example.com/img/abc123.jpg",
  "link": "https://streeteasy.com/listing/12345",
  "pet_friendly": "yes"
}
```

### Output normalizado

```json
{
  "id": "aHR0cHM6Ly9zdH",
  "price": 2750,
  "neighborhood": "Williamsburg",
  "borough": "Brooklyn",
  "bedrooms": 2,
  "bathrooms": 1,
  "description": "Beautiful apt. No broker fee! 1 month free. Laundry in building. Pets OK.",
  "image_url": "https://cdn.example.com/img/abc123.jpg",
  "incentives": ["no fee", "free month"],
  "original_url": "https://streeteasy.com/listing/12345",
  "pets": true,
  "amenities": ["laundry"]
}
```

---

## Regras Gerais

- Nunca modificar `original_url` — preservar exatamente como veio.
- Listings sem `original_url` são descartados (não entram no output).
- Listings com `price === 0` são descartados (não entram no output).
- O adaptador não filtra por critérios do usuário — apenas normaliza. Filtragem é responsabilidade do Decision Logic Engine.
- Sempre retornar arrays vazios `[]` para `incentives` e `amenities` se nada for detectado — nunca `null`.
- Debug logs com prefixo `[Steady Debug]`.
