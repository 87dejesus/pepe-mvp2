# The Steady One — STATUS (cockpit)
Atualizado: 2026-07-05 | Verdade profunda: [PROJECT_BRIEF.md](PROJECT_BRIEF.md) (canônico, rev 10) | Decisões: [DECISIONS.md](DECISIONS.md)

## O que é
Guia calmo e editorial para decidir apartamento em NYC (thesteadyone.com). Quiz de 7 perguntas → matches com clareza de decisão. Mascote: Heed, o crocodilo. Tom: "yoga teacher, not salesperson".

## Estágio
🟡 VALIDAÇÃO — o produto está no ar; o gargalo é distribuição, não produto.

## Natureza do projeto (reorientação 16/07)
Produto está RESOLVIDO e não volta a ser trabalho. Daqui pra frente o TSO é um **projeto 100% de marketing/distribuição** — a única categoria de trabalho que existe é trazer gente pro site (vídeos, Reddit, SEO, afiliados). Trabalho de produto, se aparecer, é exceção. (Ritmo semanal = decisão de portfólio separada; hoje em gotejamento pela D-005 do Boat Lux.)

## Objetivo principal (trimestre)
Bater a kill metric: até 2026-09-14, ≥300 visitas UTM acumuladas E ≥30 emails capturados. Hit → dobrar na fonte vencedora. Miss → repensar o topo do funil (manter só Reddit + SEO).

## Público e modelo
Quem aluga em NYC e está travado na decisão. Modelo: grátis (paywall aposentado no teste de 90 dias) + monetização por afiliados (Lemonade/Self em aprovação). Nunca expor o modelo de receita na copy.

## Posicionamento (travado — fonte: marketing/lapidan_adaptation.md)
Clareza de decisão, não listagens: "know your lines" — separar inegociável de desejável antes de visitar.

## FOCO ATUAL
- **Trabalhando em:** distribuição — Reddit (conta `takeitslow` aquecida, veio tenant-rights) + teste de vídeo com rosto.
- **Próximas 3 ações:**
  1. Série "Steady Rules" — **cadência oficial: 3 gravações/semana** (1 por bloco; gravação toma o bloco inteiro). #1 gravado 06/07, #2 gravado 07/07; #3 em ~09-10/07. Roteiros em `marketing/video-scripts-2026-07-04.md`.
  2. Postar os vídeos espalhados na semana, bio links com UTM `face_test` (tiktok/instagram/youtube).
  3. Continuar replies no Reddit (tenant-rights + minerar copy bank; priorizar comentaristas top-1%).
- **Bloqueado/esperando:** aprovação dos afiliados Lemonade (Impact) + Self (FlexOffers).

## Métricas que importam
| Métrica | Último valor | Data |
|---|---|---|
| Visitas UTM acumuladas (kill: 300) | ~14 eventos, maioria teste | 2026-06 |
| Emails capturados (kill: 30) | ⚠️ registrar no domingo | — |
| Melhor conteúdo Reddit | 37 upvotes / 1158 views (Good Cause) | 2026-06-17 |
> Fonte: tabela `funnel_events` (first-touch UTM). Avaliar vídeo vs Reddit após 2 semanas.

## Riscos ativos
- Kill metric vence 2026-09-14 — cada semana sem distribuição consome o prazo.
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
