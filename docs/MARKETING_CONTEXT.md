# Marketing Context — The Steady One

**Atualizado:** 2026-06-12
**Branch de trabalho:** `claude/steady-one-marketing-plan-qbujnx`
**Objetivo da fase:** pico de aluguel de verao NYC, 100% organico (~$0), maximo de pagantes.

---

## Estado atual (o que ja esta no ar)

- **Tracking de funil:** LIVE em producao (PR #30 mergeado). Tabela `funnel_events` no Supabase. Eventos: quiz_start, quiz_complete, paywall_view, checkout_start, paid, com UTM de origem.
- **TikTok @thesteadyonenyc:** conta Business aprovada, categoria Education, **link do site clicavel** no campo Website com `?utm_source=tiktok`. Bio nova.
- **Reddit:** conta principal `takeitslow` (u/Resident_Leading9499), em fase de aquecimento (comentar util, zero link). Skill `reddit-comment-drafter` para draftar.
- **Instagram:** bio link deve usar `?utm_source=instagram`.
- **Site (Vercel) + Supabase:** no ar.

## Inventario de conteudo (pronto, falta postar)

**Carrosseis (sem voz, foto-carrossel, musica de fundo) — `docs/carousels/`:**
1. `01_movein` (6 cards) — custo real de move-in ($10,454, fonte StreetEasy 2023)
2. `02_fifteen` (7 cards) — anti-panico "15 apartamentos"
3. `03_fareact` (7 cards) — "no fee" / FARE Act

**Videos manim (voz ElevenLabs "Brian", renderizados no desktop):**
4. Guarantor (40x / 80x / 27.5x)
5. 3 sinais de golpe
6. Rent-stabilized (~1M unidades)

Legendas (TikTok + IG) entregues no chat para todos. CTA padrao: "Free quiz, link in bio".

## Anguilos ja testados (psicologia do gancho)

- Problema/dinheiro: move-in, FARE, guarantor
- Medo: golpes
- Segredo/insider: rent-stabilized
- Anti-panico: 15 apartamentos

**Proximo angulo a testar:** curiosidade/comparacao — "O que $2.500/mes da em cada bairro NYC" (gancho positivo, ja foi campeao de alcance no canal). Alternativa nao tocada: co-living x ape inteiro (forca #4).

## Como medir (rodar em 3-5 dias apos postar)

No Supabase SQL Editor:
```sql
select coalesce(utm_source,'(none/direct)') as canal,
  count(*) filter (where event='quiz_start') as quiz_iniciado,
  count(*) filter (where event='quiz_complete') as quiz_completo,
  count(*) filter (where event='paywall_view') as viu_paywall,
  count(*) filter (where event='paid') as pagou
from public.funnel_events
where created_at > now() - interval '30 days'
group by 1 order by pagou desc nulls last;
```
Comparar: video manim x carrossel, e qual tema/angulo trouxe quiz e pagante.

## Como continuar (nuvem x desktop)

- **Eu (Claude na nuvem):** gero cards/briefs, commito e empurro pro GitHub. Container e descartavel; o GitHub e a memoria. Para regerar cards: `pip install Pillow` e `python3 scripts/gen_cards.py`.
- **Desktop (manim + ElevenLabs via dispatch):** renderiza os videos. Pega o trabalho via `git pull` da branch, ou recebe brief/arquivos pelo chat. Mascote em `D:\projects\the-steady-one\heed-mascot.png`. Saida em `D:\projects\the-steady-one\videos\`.

## Arquivos-chave

- `docs/MARKETING_PLAN.md` — plano 90 dias
- `docs/RENTER_RESEARCH.md` — as 4 forcas validadas (fonte das mensagens)
- `docs/VIDEO_SCRIPTS.md` — 12 roteiros base
- `scripts/gen_cards.py` — gerador reutilizavel de carrosseis
- `docs/carousels/` — os 3 carrosseis prontos
- `supabase/migrations/003_funnel_events.sql` — tabela de tracking

## Proximos passos

1. Postar os 3 carrosseis (TikTok + IG) e os 3 videos (TikTok), com links de bio por canal.
2. Reddit: continuar aquecimento; quando achar thread boa, draftar via skill.
3. Em 3-5 dias: rodar a query e comparar formato x angulo.
4. Proximo conteudo: carrossel "comparacao de bairros" (curiosidade).
5. Dobrar no formato/angulo que trouxer pagante mais barato (em tempo).
