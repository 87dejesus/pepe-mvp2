# The Steady One — DECISIONS
Decisões de negócio, mais recente no topo. Detalhes técnicos no PROJECT_BRIEF.md.
Status: 🔒 TRAVADA (com gatilho de revisão) | ⏳ PENDENTE | ↩️ REVISADA em D-0XX

## ⏳ Pendentes
- (nenhuma no momento)

---

## D-007 — Teste de vídeo com rosto (supera o lock "faceless")
- Data: 2026-07-03
- Status: 🔒 TRAVADA como TESTE (gatilho de avaliação: 2 semanas após postar, comparar com tráfego Reddit em funnel_events; vídeo só ganha slot de rotina se superar)
- Por quê: Reddit sozinho gera pouco volume; rosto cria reconhecimento que faceless não cria.
- Alternativa rejeitada: manter 100% faceless (↩️ lock anterior superado por esta).

## D-006 — Kill metric da validação
- Data: 2026-07-03
- Status: 🔒 TRAVADA (imutável até 2026-09-14 — é o ponto dela)
- Decisão: ≥300 visitas UTM acumuladas E ≥30 emails até 2026-09-14. Hit → dobrar na fonte vencedora. Miss → pausar abordagem atual, repensar topo de funil (manter só Reddit + SEO).

## D-005 — Estratégia Reddit: autoridade tenant-rights, nunca pitch
- Data: 2026-06-17 (consolidada nas sessões 1-4)
- Status: 🔒 TRAVADA
- Decisão: conteúdo = fatos verificados (FARE Act, Rent Freeze, Good Cause, Habitability); aliados de alta karma (ex.: Suzfindsnyapts) são rapport, NUNCA clientes/pitch; links só onde sancionado (self-promo thread), sempre com UTM; evitar AI tells.

## D-004 — Modelo GRÁTIS por 90 dias; monetização = afiliados
- Data: 2026-06-16
- Status: 🔒 TRAVADA (gatilho: fim do teste de 90 dias / resultado da kill metric)
- Por quê: paywall de $9.49 matava a validação de distribuição. Stripe fica dormante e intacto (flag FREE_ACCESS).
- Alternativas rejeitadas: manter paywall; assinatura (NUNCA subscription).

## D-003 — Nunca expor o modelo de receita na copy
- Data: 2026-06
- Status: 🔒 TRAVADA
- Por quê: quebra o tom editorial e a confiança; CTA usa fatos de UX (free, no card, no account).

## D-002 — Scraper = Apify saswave (proxy próprio embutido)
- Data: 2026-06-08
- Status: 🔒 TRAVADA (gatilho: só trocar por actor SEM input `proxyConfiguration`, ou se comprarmos proxy residencial)
- Alternativas rejeitadas: ParseForge/epctex/RentHop (bloqueados ou quebrados usando nosso proxy).

## D-001 — Identidade: calma editorial, sem hype
- Data: fundação do projeto
- Status: 🔒 TRAVADA
- Decisão: dark navy editorial (Steady Modern), sem scarcity fake, sem badges agressivos, sem promessas falsas; voz builder-to-builder. Mascote Heed (nunca "Pepe").
