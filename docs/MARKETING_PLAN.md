# Plano de Marketing — The Steady One

**Versão:** 2
**Data:** 2026-06-10
**Produto:** The Steady One (thesteadyone.com)
**Mascote:** Heed, o jacaré
**Modelo:** pagamento único, $9.49 / 30 dias de acesso

> **Decisões travadas com o founder (2026-06-10):**
> - **Orçamento:** ~$0. **Tudo orgânico.** Nada de ads pagos nesta fase.
> - **Execução:** founder + Claude Code. O que destravar conversão e for código, **eu implemento** (tracking, e-mail, prévia de match, blog).
> - **Público inicial:** mercado geral de NYC **em inglês**. (Nicho BR/latino = expansão futura, não agora.)
> - **Meta dos 90 dias:** **máximo de pagantes**, aproveitando o pico de verão.
> - **Vídeo:** **faceless** (Heed + gravação de tela + voz/legenda). Founder não aparece.
> - **Reddit:** founder tem ~3 contas de ~4 meses, pouco karma. Precisa de aquecimento antes de promover.

---

## 0. Leitura rápida (TL;DR)

- O jogo é **volume orgânico no pico de verão (jun–set), agora.** Sem orçamento, a alavanca é tempo + execução + código.
- **3 motores, todos $0:** (1) Reddit + comunidades NYC, (2) vídeo faceless com Heed, (3) SEO de cauda longa (blog já existe).
- **O quiz é o produto grátis.** Toda copy empurra pro `/flow`, nunca direto pro preço.
- **Tracking de funil não existe hoje** (o `/api/track` só cobre clique de afiliado). Sem medir quiz→pago, marketing orgânico é cego. **Construir isso é o passo 0.**
- Meu trabalho (Claude Code) destrava 3 coisas de código que aumentam pagantes sem gastar 1 dólar: **tracking de funil, prévia de match no paywall, e-mail de recuperação de quiz.**

---

## 1. Posicionamento (inalterado)

### A dor que vendemos
Procurar apê em NYC não é falta de opções, é **excesso + ansiedade + medo de errar**. O blog já ataca isso (burnout, ansiedade de decisão, taxa de corretor, red flags, decidir rápido).

### Frase âncora
> "Me diga suas linhas que não pode cruzar. Eu te digo a verdade sobre cada lugar." (copy do Heed no hero)

### O que NÃO somos
Não somos StreetEasy/Zillow (volume), não somos corretor, não fazemos hype/escassez falsa. **A calma editorial É a diferenciação.**

---

## 2. Público inicial: mercado geral NYC (inglês)

Foco em quem está **mudando para / dentro de NYC no verão**, em ordem de conversão:

| Prioridade | Segmento | Onde encontrar |
|---|---|---|
| **1** | Mudando para NYC com data marcada (novo emprego, transferência) | r/AskNYC, r/movingtonyc, r/NYCapartments |
| **2** | Recém-formados / primeiro apê sozinho (pico de verão) | TikTok/IG/Shorts, r/NYCapartments |
| **3** | Em burnout de busca (já viu 30 apês, travado) | Reddit, busca orgânica, retargeting via e-mail |

> Crédito baixo / sem fiador e nicho BR/latino ficam guardados como **expansão** (temos páginas `/low-credit` + parceiros guarantor prontos pra ativar quando quisermos). Não dispersar agora.

---

## 2.5 Mensagens-âncora (validadas por pesquisa)

Fonte: `docs/RENTER_RESEARCH.md` (deep-research 2026-06-09, 21 fontes, 25 claims verificados). **Toda copy de Reddit, vídeo e blog deve puxar de uma destas 4 forças** — não de dores genéricas.

| Força (a dor real) | Como usamos no marketing |
|---|---|
| **1. Caixa + qualificação** (dominante) | O aluguel anunciado esconde ~**$13k de move-in**. Regra 40x renda, fiador 80x + 700 score. Limite legal: depósito = 1 mês, taxa = $20 (excesso é red flag). |
| **2. Golpes** | Ghost listings, "não posso mostrar a unidade", pagar por app antes de ver. Conteúdo de verificação antes de pagar. |
| **3. Estrutura invisível** | Rent stabilization (~1M unidades, aumento limitado, renovação garantida) não aparece no listing. "Verifique você mesmo." |
| **4. Confusão de moradia** | Co-living/quarto x apê inteiro têm contratos e regras de renda diferentes. ~30% do nosso catálogo vinha mal rotulado. |

**Postura anti-pânico = diferencial (validado):** a pesquisa **refutou** o mito "aluga em horas / espere e perca". Logo, todo o mercado vende FOMO e nós vendemos calma com **respaldo factual**. Esse é o nosso ângulo único.

**Correção importante (FARE Act, jun/2025):** a taxa de corretor agora cai sobre quem **contrata** o corretor, então a maioria dos renters **não paga** mais os 12-15%. Tratar broker fee como "possível", não garantido. **Não usar como âncora de preço.**

---

## 3. Os 3 motores orgânicos

### Motor 1 — Reddit (custo $0, público no pico de busca)

**Conta principal:** `takeitslow` (u/Resident_Leading9499). 136 karma, ~5 meses, sem ban nos subs-alvo. Confirmado em 2026-06-10.

**Ferramenta que já temos:** a skill `reddit-comment-drafter`. O fluxo operacional é: **founder cola a thread → Claude roda a skill → sai um comentário pronto.** Ela já embute a regra de ouro do aquecimento (abaixo).

**A "Regra das 2 interações" (da skill, crítica):**
- **1ª resposta:** empatia pura + 1 pergunta aberta. **Nunca** mencionar produto, Heed, link. Mencionar mata a confiança.
- **2ª resposta:** só se o OP responder e a conversa fluir, aí dá pra citar "The Steady One" uma vez, de forma orgânica. Se soar forçado, fica calado.

**Quais threads comentar (taxonomia de dor da skill):** speed pressure, burnout, forced compromise, fear of regret, financial humiliation (fiador/40x/broker fee), invisible competition, opaque process, anxiety/shame. Se a thread não tem nenhuma dessas dores (ex.: "looking for 1BR Astoria $1800"), **não comentar** — economiza goodwill.

**Fase de aquecimento (semana 1–2):**
- 2–3 comentários úteis/dia nos subs em escopo (r/NYCapartments, r/AskNYC, r/nyc, r/Brooklyn, r/Astoria, r/Manhattan). **Zero link.**
- Meta: comment karma ~136 → ~250–300 antes de qualquer link.

**Fase ativa (semana 3+):**
- Continuar comentando via skill; deixar a 2ª interação fazer o trabalho de menção.
- 1 post de valor/semana ancorado nas 4 forças da pesquisa (ver §2.5), link discreto só no fim.
- Medir tudo com UTM (`?utm_source=reddit`).

### Motor 2 — Vídeo faceless com o Heed (TikTok + IG Reels + YouTube Shorts)

Sem câmera, sem rosto. 100% produzível com gravação de tela + Heed + voz/legenda. Formatos:

- **"Heed reage a 1 listing":** gravação de tela de um listing real → texto/voz aponta 2 red flags + 1 pergunta que ninguém faz. 20–35s. Fundo navy, calmo.
- **"Tell me your lines":** texto na tela: 3 non-negotiables → mostra como cortam 80% dos apês → CTA pro quiz.
- **"O número real de move-in":** mostrar que o aluguel anunciado esconde ~$13k de entrada (depósito + 1º mês + taxas) e o que a lei de NYC limita (depósito = 1 mês, taxa de aplicação = $20). Ângulo validado pela pesquisa.
- **"Anti-pânico":** desmontar o mito do "aluga em horas, decide já" (a pesquisa refutou). Postura calma como diferencial.

**Produção lean (founder + Claude):**
- Eu posso escrever **todos os roteiros + legendas + hooks** em lote.
- Você grava a tela (celular ou desktop) e monta em editor simples (CapCut). Voz pode ser TTS se preferir não narrar.
- Cadência realista: **3 vídeos/semana**, 1 filmagem reaproveitada nas 3 plataformas.
- CTA sempre: "Faça as 7 perguntas, link na bio" → `/flow`.

### Motor 3 — SEO (blog já tem 5 posts certos)

Base já existe: burnout, ansiedade de decisão, taxa de corretor, red flags, decidir rápido. Expandir para intenção alta, **ancorado nas 4 forças da pesquisa** (§2.5):
- "true cost to move into a nyc apartment" (os ~$13k), "40x rent rule nyc explained", "guarantor service nyc worth it", "FARE Act broker fee who pays 2026", "how to spot a nyc rental scam", "rent stabilized apartment how to verify nyc", "co-living vs studio nyc".
- **Eu (Claude) escrevo os posts** no mesmo formato/voz dos existentes. Meta: 2/mês, cada um terminando no quiz.
- **SEO técnico que eu corrijo no código:** metadata por página (o brief aponta `/paywall`, `/subscribe` sem metadata própria), schema de Article nos posts, conferir sitemap/robots e indexabilidade do blog.

---

## 4. Funil & as 3 alavancas de conversão que EU implemento

```
Reddit / Vídeo / SEO
   → / (hero)
      → /flow (quiz 7 perguntas)   ← produto grátis, captura intenção
         → /paywall ($9.49)
            → /decision (match score)
               → cross-sell: /storage + /low-credit (afiliado)
```

**Sem orçamento de ads, ganhar pagante = espremer mais conversão do tráfego que já chega.** Três coisas de código fazem isso de graça:

1. **Tracking de funil (PASSO 0, bloqueia todo o resto).**
   Hoje não existe. Vou instrumentar eventos: `quiz_start`, `quiz_complete`, `paywall_view`, `checkout_start`, `paid`, com a UTM de origem. Sem isso não dá pra saber qual motor traz pagante.

2. **Prévia de match antes do paywall.**
   Mostrar "3 lugares batem com suas linhas" (com 1 listing borrado) → "desbloqueie por $9.49". Pagar às cegas mata conversão; mostrar valor real primeiro aumenta.

3. **E-mail de recuperação de quiz abandonado (via Resend, já no stack).**
   Quem completa o quiz e não paga → e-mail com os resultados parciais + link pra voltar. Recupera vendas de graça.

Bônus de copy (sem código): **NÃO** ancorar contra taxa de corretor (o FARE Act de jun/2025 fez a maioria dos renters não pagar mais — ver §2.5). Ancorar contra a dor real: "$9.49 contra ~$13.000 de move-in" e "menos que um café por semana para não errar a maior conta fixa do seu ano".

---

## 5. Cross-sell & parcerias (receita extra, sem custo)

Páginas de **storage** e **guarantor/low-credit** já existem e já têm tracking de clique. Ativar como canal:
- Pedir aos parceiros de guarantor para listarem o The Steady One como recurso (querem o mesmo cliente).
- E-mail pós-decisão com gancho de storage ("mudou pra um lugar menor? guarde o resto").
- Conteúdo "alugar em NYC sem fiador americano" → linka `/low-credit` → parceiro divulga.

---

## 6. Calendário 90 dias (pico de verão, tudo orgânico)

### Semanas 1–2 (junho): fundação + começar orgânico
- [ ] **(Claude)** Implementar tracking de funil — **isto primeiro, é o passo 0.**
- [ ] **(Founder)** Conferir qual das 3 contas Reddit tem mais karma; começar aquecimento (2–3 comentários úteis/dia, zero link).
- [ ] **(Founder)** Criar/organizar TikTok + IG + YouTube. **(Claude)** entregar os 12 primeiros roteiros faceless.
- [ ] **(Claude)** Corrigir metadata por página + schema de blog.

### Semanas 3–6 (junho/julho): volume no pico
- [ ] **(Founder)** Reddit fase ativa + 3 vídeos/semana.
- [ ] **(Claude)** Implementar prévia de match no paywall.
- [ ] **(Claude)** Implementar e-mail de recuperação de quiz (Resend).
- [ ] **(Claude)** 2 posts novos de blog.

### Semanas 7–12 (julho/agosto): dobrar no que converte
- [ ] Olhar o tracking: qual motor traz pagante mais barato (em tempo)? Dobrar nele.
- [ ] Ativar 1 conversa de co-marketing com parceiro de guarantor.
- [ ] (Opcional, só se aparecer caixa) primeiro teste de ads geo-travado em NYC, mandando pro quiz.

---

## 7. Métricas

**Métrica-norte: pagantes por semana** (meta do founder). Sem ads, a 2ª métrica é **qual motor traz cada pagante**.

| Métrica | Por que |
|---|---|
| Quiz start rate (visita → começa) | Hero/promessa funciona? |
| Quiz completion rate | Fricção das 7 perguntas |
| **Quiz → pago (%)** | A conversão que paga as contas |
| Pagantes/semana por motor (via UTM) | Onde colocar o tempo |
| Receita afiliada / pagante | LTV real além dos $9.49 |

Sem o tracking do passo 0, nenhuma destas existe. Por isso ele vem primeiro.

---

## 8. Regras de marca (não violar)

- **Nunca** "Pepe". É **Heed, o jacaré**.
- **Sem** escassez falsa, countdown, badge "ACT NOW/HOT".
- **Sem** promessa falsa (SLA, garantia de dinheiro de volta sem aprovação).
- **Sem** em-dash/en-dash em copy visível. Use vírgula, dois-pontos, ponto, hífen ASCII.
- Voz calma, editorial. Verde `#00A651` só em CTA. Fundo navy.
- Prova social só se **real**.

---

## 9. Próximos passos concretos

**Eu (Claude Code) posso começar agora:**
1. Implementar o **tracking de funil** (passo 0).
2. Escrever os **12 primeiros roteiros de vídeo faceless** do Heed.
3. Corrigir **SEO técnico** (metadata por página + schema de blog).

**Você (founder) esta semana:**
1. Conferir qual das 3 contas Reddit tem mais karma e começar o aquecimento (comentários úteis, zero link).
2. Abrir/organizar TikTok + IG + YouTube Shorts.

> Estamos na melhor janela do ano e sem custo de mídia. A vitória vem de execução consistente + medir quiz→pago + espremer conversão com as 3 alavancas de código.
