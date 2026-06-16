# CONTEXT — The Steady One

Última atualização: 2026-06-16

## Modelo de negócio (ATUAL)
**Grátis + affiliate** para o teste de 90 dias. O paywall de $9.49 foi **aposentado** (não deletado).
- Acesso liberado para qualquer usuário que faça login por e-mail. Controlado pela flag `FREE_ACCESS` em `app/api/auth/access-status/route.ts` (true). Para religar o paywall: virar a flag para false.
- Stripe, webhook, `subscription_status` e `/subscribe` continuam no código, **dormindo**.
- Decisão registrada na memória do projeto: `business-model-90day-test.md` (supersede o `docs/MARKETING_PLAN.md`, que ainda fala em $9.49).

## Funil do usuário (hoje)
`/` → `/flow` (quiz) → `/onboarding/tradeoffs` → `/onboarding/preview` (1 match grátis) → `/paywall` (login por e-mail, código de 6 dígitos, **sem cobrança**) → `/onboarding/post-auth` → `/decision` (todos os matches, grátis).
- O e-mail = chave de acesso + captura de lead. Não enviamos os resultados por e-mail (aparecem em `/decision`).

## Enviado nesta sessão (2026-06-16)
- ✅ Pivô pro grátis implementado e no ar (backend + copy de `/onboarding/preview` e `/paywall`). Mockup aprovado: `docs/mockups/free-pivot-before-after.html`.
- ✅ Copy ancorada na pesquisa (4 forças). Caso de borda (0/1 match) tratado.
- ✅ Segurança: rotas `/api/apify/sync` e `/collect` agora exigem `CRON_SECRET` (`lib/cron-auth.ts`).
- ✅ SEO: meta tag de verificação FlexOffers no layout.
- ✅ Afiliados aplicados (em análise): **Lemonade** (renters insurance, via Impact) e **Self** (credit-builder, via FlexOffers).

## Estado real (dados)
- Tracking de funil **funciona** (`funnel_events` no Supabase), mas tráfego real ≈ **zero** (~14 eventos, maioria teste). **O gargalo é distribuição, não o produto.**

## Próximos passos (em ordem)
1. **Distribuição / Reddit (founder)** — o botão de verdade. Conta `takeitslow`, skill `steady-one-reddit-drafter`. Aquecimento: comentários úteis, ZERO link nas 2 primeiras semanas.
2. Quando Lemonade/Self aprovarem → trocar os parceiros mortos de `/low-credit` (Rhino/LeaseLock/TheGuarantors NÃO pagam afiliado).
3. E-mail de follow-up (Resend) — só DEPOIS dá pra prometer "novos matches por e-mail" na copy.
4. Escrever a **métrica de kill** (ex.: até X de setembro, N visitantes e M leads, ou muda/pausa).

## Regras de copy (NÃO violar)
- Nunca expor o modelo de receita (afiliado/comissão) em texto pro usuário. Memória: `copy-no-business-model-exposure.md`.
- Voz da marca + bans (sem "unlock", sem em-dash, sem fluff): skill `steady-one-design`.

## Admin / teste
- E-mail admin `luhciano.sj@gmail.com` tem bypass (pula pro `/decision`). Para testar o fluxo grátis real, usar OUTRO e-mail.
