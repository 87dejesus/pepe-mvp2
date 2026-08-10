# Marketing Context — The Steady One

**Atualizado:** 2026-08-10 (assets órfãos recuperados do branch `claude/steady-one-marketing-plan-qbujnx`)
**Modelo:** GRÁTIS + afiliado (paywall de $9.49 aposentado; acesso por login de e-mail). Fonte canônica: `PROJECT_BRIEF.md` + `docs/MARKETING_PLAN.md` (v3).
**Objetivo da fase:** pico de aluguel de verão NYC, 100% orgânico (~$0), **máximo de leads (e-mails capturados)**. Receita vem de afiliado.

---

## Regra de conteúdo: SEMPRE puxar inspiração das fontes vivas (de 2026-06-16)

**Antes de gerar qualquer post (carrossel, vídeo, legenda), ler primeiro:**
1. `docs/reddit-insights/copy-bank.md` — frases reais por dor + arsenal de leis (capturado de threads do Reddit). **Fonte principal de linguagem fresca/autêntica.**
2. `docs/reddit-insights/raw/` — capturas cruas de threads (contexto bruto).
3. `content/posts/` — artigos SEO (ângulos e dados já pesquisados).
4. `docs/RENTER_RESEARCH.md` — as 4 forças validadas.

O objetivo é que cada post use a **voz real dos renters** (do copy-bank), não copy genérica, e fique mais fresco. Puxar 1-2 frases/ângulos do banco por peça.

> `docs/reddit-insights/` está no `main` (consolidado no PR #39, 2026-07-17). Ler direto do repo. Já em uso (ex.: carrossel 08_dealbreakers).

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
- `05_coliving` (7) — co-living x apê inteiro (força #4), fundo skyline.
- Vídeos rodada 2 pendentes: quanto aguenta (40x), o que é legal cobrar, custo do trajeto. (Briefs usam `skyline.png` no fundo.)

**Rodada 3 (capa-foto real — `docs/assets/magic_*.png`, `cover_*.png`):**
- `06_hiddencosts` (7) — custos escondidos/arrependimento. Primeiro com capa-foto.
- `07_timing` (7) — anti-pânico de timing, dados FTC, sourced do post de SEO.
- `08_dealbreakers` (7) — não-negociáveis, com falas reais do `copy-bank.md`.
- `09_whystay` (7) — "why we stay" (copy emocional; ver regra no fim deste doc).

> Todos os cards de 01 a 04 foram **regerados em 2026-06-28** com o masthead abaixado para sair da safe zone da UI do TikTok. Use sempre a versão do repo, não versões antigas exportadas.

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
- `docs/GROWTH_ROADMAP.md` (marcos de tráfego → escada de monetização)
- `docs/VIDEO_SCRIPTS.md` · `scripts/gen_cards.py` (gerador de cards, com capa-foto)
- `scripts/gen_magic.py` (gerador das fotos NYC de capa) · `docs/assets/skyline.png`
- `docs/carousels/` · `docs/assets/` · `supabase/migrations/003_funnel_events.sql`

## Próximos passos

1. Postar 1/dia por canal (atribuição limpa). Bairros já foi.
2. Gerar rodada 2 restante: co-living, custos escondidos (carrosséis) + 3 vídeos.
3. Construir e-mail de follow-up (Resend) — alavanca de código que falta.
4. Em 3-5 dias: rodar a query, comparar formato x ângulo, dobrar no que traz lead.

## Regra de copy emocional (aprendida 2026-06-17)

Empatia = nomear a dor/auto-dúvida REAL do renter primeiro ("you are not doing it wrong"), depois a pequena graça. Registro tenro e vulnerável, em "você". NUNCA esperto/irônico (afasta). Puxar o sentimento do copy-bank. Ex.: carrossel 09_whystay (levou 3 tentativas; v1/v2 falharam por serem "espertas").
