# Marketing Context — The Steady One

**Atualizado:** 2026-06-16
**Branch de trabalho:** `claude/steady-one-marketing-plan-qbujnx`
**Modelo:** GRÁTIS + afiliado (paywall de $9.49 aposentado; acesso por login de e-mail). Fonte canônica: `PROJECT_BRIEF.md` + `docs/MARKETING_PLAN.md` (v3).
**Objetivo da fase:** pico de aluguel de verão NYC, 100% orgânico (~$0), **máximo de leads (e-mails capturados)**. Receita vem de afiliado.

---

## Estado atual (o que já está no ar)

- **Tracking de funil:** LIVE (tabela `funnel_events`). Eventos: quiz_start, quiz_complete, paywall_view, checkout_start, paid (o `paid` agora = acesso grátis liberado), com UTM de origem.
- **TikTok @thesteadyonenyc:** conta Business, categoria Education, **link do site clicável** no campo Website com `?utm_source=tiktok`. Bio nova.
- **Reddit:** conta `takeitslow` (u/Resident_Leading9499), em aquecimento. Skill `reddit-comment-drafter`.
- **Instagram:** bio link com `?utm_source=instagram`.

## Inventário de conteúdo

**Rodada 1 (fundo liso) — `docs/carousels/`:**
1. `01_movein` (6) — custo real de move-in ($10,454, StreetEasy 2023)
2. `02_fifteen` (7) — anti-pânico "15 apartamentos"
3. `03_fareact` (7) — "no fee" / FARE Act

**Vídeos manim rodada 1 (voz ElevenLabs "Brian"):**
4. Guarantor · 5. 3 sinais de golpe · 6. Rent-stabilized

**Rodada 2 (fundo com skyline riscado da home — `docs/assets/skyline.png`):**
- `04_boroughs` (7) — comparação de bairros (curiosidade/tradeoff). **POSTADO.** Card 1 sem ano (atemporal); números 2026 no repo.
- Pendentes: co-living x apê inteiro; custos escondidos/arrependimento.
- Vídeos rodada 2 pendentes: quanto aguenta (40x), o que é legal cobrar, custo do trajeto. (Briefs usam `skyline.png` no fundo.)

CTA padrão: "Free quiz, link in bio" (alinhado ao modelo grátis).

## Ângulos já testados (psicologia do gancho)

- Problema/dinheiro: move-in, FARE, guarantor
- Medo: golpes · Segredo: rent-stabilized · Anti-pânico: 15 apês · **Curiosidade: bairros (rodada 2)**

**Regra de conteúdo (do core):** todo card aterrissa no quiz via a ponte tradeoff → não-negociável. Penúltimo card faz a ponte explícita ("which line won't you cross?").

## Como medir (rodar 3-5 dias após postar)

```sql
select coalesce(utm_source,'(none/direct)') as canal,
  count(*) filter (where event='quiz_start')    as quiz_iniciado,
  count(*) filter (where event='quiz_complete') as quiz_completo,
  count(*) filter (where event='paid')          as acesso_lead
from public.funnel_events
where created_at > now() - interval '30 days'
group by 1 order by acesso_lead desc nulls last;
```
Comparar: vídeo manim x carrossel, e qual ângulo trouxe lead. **Métrica-norte: quiz → e-mail (lead).**

## Como continuar (nuvem x desktop)

- **Claude (nuvem):** gera cards/briefs, commita no GitHub. Para regerar: `pip install Pillow cairosvg` e `python3 scripts/gen_cards.py`.
- **Desktop (manim + ElevenLabs):** renderiza vídeos. Mascote `D:\projects\the-steady-one\heed-mascot.png`, skyline `D:\projects\the-steady-one\skyline.png`, saída `...\videos\`.

## Arquivos-chave

- `docs/MARKETING_PLAN.md` (v3, modelo grátis) · `docs/RENTER_RESEARCH.md` (4 forças)
- `docs/VIDEO_SCRIPTS.md` · `scripts/gen_cards.py` (gerador) · `docs/assets/skyline.png`
- `docs/carousels/` · `supabase/migrations/003_funnel_events.sql`

## Próximos passos

1. Postar 1/dia por canal (atribuição limpa). Bairros já foi.
2. Gerar rodada 2 restante: co-living, custos escondidos (carrosséis) + 3 vídeos.
3. Construir e-mail de follow-up (Resend) — alavanca de código que falta.
4. Em 3-5 dias: rodar a query, comparar formato x ângulo, dobrar no que traz lead.
