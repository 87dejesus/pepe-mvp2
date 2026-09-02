# The Steady One — STATUS (cockpit)
Atualizado: 2026-09-01 | Verdade profunda: [PROJECT_BRIEF.md](PROJECT_BRIEF.md) (canônico, rev 32) | Decisões: [DECISIONS.md](DECISIONS.md)

## O que é
Guia calmo e editorial para decidir apartamento em NYC (thesteadyone.com). Quiz de 7 perguntas → matches com clareza de decisão. Mascote: Heed, o crocodilo. Tom: "yoga teacher, not salesperson".

## Estágio
🟡 VALIDAÇÃO — o produto está no ar; o gargalo é distribuição, não produto.

## Natureza do projeto (reorientação 16/07)
Produto está RESOLVIDO e não volta a ser trabalho. Daqui pra frente o TSO é um **projeto 100% de marketing/distribuição** — a única categoria de trabalho que existe é trazer gente pro site (vídeos, Reddit, SEO, afiliados). Trabalho de produto, se aparecer, é exceção. (Ritmo semanal = decisão de portfólio separada; hoje em gotejamento pela D-005 do Boat Lux.)

## Objetivo principal (trimestre)
Bater a kill metric: até 2026-09-14, ≥300 visitas UTM acumuladas E ≥30 emails capturados. Hit → dobrar na fonte vencedora. Miss → repensar o topo do funil (manter só Reddit + SEO).

## Público e modelo
Quem aluga em NYC e está travado na decisão. Modelo: grátis (paywall aposentado no teste de 90 dias) + monetização futura por afiliados. Lemonade e Self recusaram a aplicação pré-tráfego; hoje não há afiliado ativo. Nunca expor o modelo de receita na copy.

## Posicionamento (travado — fonte: marketing/lapidan_adaptation.md)
Clareza de decisão, não listagens: "know your lines" — separar inegociável de desejável antes de visitar.

## FOCO ATUAL
- **Trabalhando em:** distribuição. Reddit como motor de conteúdo terminou após duas ações de moderação; SEO continua como canal próprio. No TikTok, o teste atual é encontrar um formato criativo que gere UTM visits, não apenas views.
- **Próximas 3 ações:**
  1. Founder revisar o piloto de carrossel `marketing/creative/2026-09-01-opposite-right-answers/` e aprovar, ajustar ou rejeitar a direção.
  2. Se aprovado, postar com TikTok native text e UTM constante; produzir mais dois pilotos com a mesma arquitetura de história.
  3. Depois de duas semanas, comparar os três pilotos por UTM visits e emails capturados; views, saves, shares e profile visits são diagnóstico criativo, não a decisão final.
- **Bloqueado/esperando:** números atuais de `funnel_events` e analytics do TikTok ainda não foram lidos nesta sessão; não declarar vencedor de canal com base apenas na captura do perfil.

## Métricas que importam
| Métrica | Último valor | Data |
|---|---|---|
| Visitas UTM acumuladas (kill: 300) | ⚠️ valor atual não lido nesta sessão | 2026-09-01 |
| Emails capturados (kill: 30) | ⚠️ registrar no domingo | — |
| Melhor conteúdo Reddit | 25K views / 32 upvotes / 16 comments, mas thread travada por mod | 2026-07-22 |
> Fonte de negócio: tabela `funnel_events` (first-touch UTM). A captura do TikTok em 2026-09-01 serve apenas como evidência criativa visível.

## Riscos ativos
- Kill metric vence 2026-09-14; faltam menos de duas semanas e os números atuais ainda precisam ser lidos.
- Se o scraper falhar >10 dias, o DB drena e o site cai nos mocks (watchdog Sentry existe).
- Rotacionar a chave ScraperAPI vazada (baixo risco, aposentada).

## O que estou IGNORANDO de propósito
- Produto/features novas — o funil está bom o suficiente para o teste.
- Paywall/Stripe (dormante, intacto — não deletar, não reativar).
- Email de follow-up do Resend (não prometido na copy até existir).
- CI, footer, metadata por página (low priority do brief §6).

## Backlog (não-agora)
- Trocar parceiros mortos do /low-credit por Lemonade + Self (quando aprovados).
- Construir follow-up email via Resend.
- Deletar rotas/normalizers dos scrapers aposentados.

## Acessos (referência rápida)
- Google Analytics: `G-0LQ1VL0PMG` → propriedade "Pepe MVP - Find Pepe" (514608911), conta "Luciano Jesus" (221101884), login **luhciano.sj@gmail.com**. Instalado em `app/layout.tsx:132`.

## Arquivos importantes
- `PROJECT_BRIEF.md` — canônico (regras de copy §7, Reddit playbook §6).
- `marketing/lapidan_adaptation.md` + `docs/reddit-insights/copy-bank.md` (~45 frases mineradas) — marketing via skill Lapidan.
- `marketing/video-scripts-2026-07-04.md` — roteiros da série de vídeos.
- `CLAUDE.md` — regras do repo.
