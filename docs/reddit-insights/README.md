# Reddit Insights — matéria-prima para copies (The Steady One)

Este espaço junta **três coisas** num só fluxo:

1. **Interagir** com as salas do Reddit (comentar) → skill `steady-one-reddit-drafter`.
2. **Minerar** posts e comentários → extrair os pontos mais valiosos (dores reais, frases textuais, objeções, gatilhos).
3. **Guardar** isso organizado por dor → vira banco de frases pronto para copies (landing, e-mail, anúncios, posts).

Mascote: **Heed** 🐊 (NUNCA "Pepe"). Tudo aqui serve a copy de marca, nunca expõe modelo de negócio (ver `copy-no-business-model-exposure`).

---

## Como funciona o fluxo

```
Reddit thread ──► raw/ (captura crua, link + texto)
                    │
                    ▼
            minerar (extrair frases, dores, objeções)
                    │
                    ▼
            copy-bank.md (organizado pelas 8 dores do Heed)
                    │
                    ▼
            copies (landing, emails, ads, posts)
```

### 1. Capturar (raw/)
Cola o post/thread do Reddit. Crio um arquivo em `raw/` usando `raw/_TEMPLATE.md`:
nome `AAAA-MM-DD-subreddit-slug.md`. Guarda o **link**, a data, o texto cru e o contexto.
Isso preserva a fonte original (citável depois).

### 2. Minerar
A partir da captura, extraio:
- **Frases textuais** do renter (palavras exatas, sem "limpar") — ouro para copy.
- **Dor(es)** detectada(s) entre as 8 do Heed (ver tabela abaixo).
- **Objeções / medos** ("e se eu me arrepender", "isso é golpe?").
- **Gatilhos de decisão** ("vale a pena?", "fico ou mudo?").

### 3. Arquivar no copy-bank
Cada insight vai para `copy-bank.md` na seção da dor correspondente, com a frase
textual + link da fonte. É de lá que as copies puxam linguagem real, não inventada.

---

## As 8 dores do Heed (eixo de organização)

| Dor | Sinais |
|---|---|
| Pressão de tempo | "apply same day", "gone in hours", "decided in 24h" |
| Exaustão mental | "so tired", "burned out", "overwhelming", "hundreds of listings" |
| Compromisso forçado | "had to settle", "gave up on", "no choice" |
| Medo de arrependimento | "what if I regret", "did I make a mistake" |
| Humilhação financeira | "guarantor", "broker fee", "40x salary", "denied again" |
| Competição invisível | "lost it to someone else", "bidding war", "ghost listing" |
| Processo opaco | "no one explains", "why is this so confusing", "scam?" |
| Ansiedade / vergonha | "panic", "anxiety", "embarrassed", "ashamed I can't afford" |

(Tabela espelha a skill `steady-one-reddit-drafter`. Se mudar lá, atualizar aqui.)

> **Prioridade de mira — top commenters / high-karma:** responder a comentaristas top 1% / muito ativos é o engajamento de maior alavancagem. Eles (1) prestam atenção em quem aparece com consistência, (2) tendem a investigar perfis → veem a bio + link UTM, (3) se passam a respeitar o Heed, viram advogados orgânicos (recomendação deles > 10 comentários nossos). Como ganhá-los: CONSISTÊNCIA como a voz precisa e sem venda — nunca empurrar produto; o link no perfil trabalha sozinho. Aliados/voltam-a-aparecer mapeados: Suzfindsnyapts (corretora), YourHuckleberry32__ (top commenter).

> **SEO→Reddit: o formato que SOBREVIVE (aprendido 2026-07-13).** Um post com LINK próprio pode ir bem e NÃO ser removido — vimos um concorrente (rentreboot.com) fazer 220 upvotes em r/NYCapartments com "Over 1,000 Apartments Hit the Market in NYC Every Day. Here's Where They Show Up" + link pra um guia. Por quê: (1) é DADO/RECURSO, não ensaio de conselho; (2) título entrega um número/insight concreto; (3) link vai pra GUIA informativo grátis, não produto/quiz; (4) post de link não tem corpo-ensaio pra flagar como IA. NOSSO post removido era o oposto (ensaio de conselho + persona = lido como self-promo). **Aplicação:** os artigos de SEO podem virar posts-recurso com gancho de dado/lei (ex: "the broker fee they're charging is probably illegal now, here's the law" → guia FARE). PORÉM: esparso (regra ~10% self-promo), genuinamente útil, e depende de engajamento real pra "comprar" legitimidade. Link próprio em todo post = spam flagado.

> **Lente central do produto (não esquecer no triage):** non-negotiables vs. tradeoffs aceitos.
> Posts onde alguém racionaliza um tradeoff pesado (commute brutal, dar up em espaço/luz/silêncio, "at least…") SÃO alvo do Heed, mesmo sem dor explícita — o valor é ajudar a ver se aquilo é um tradeoff aceitável ou uma linha que não devia cruzar. Não descartar como "só commute / só logística".

---

## Regras
- **Comentar = skill `steady-one-reddit-drafter`.** Regra das duas interações; nunca produto no 1º comentário. Este espaço NÃO afrouxa essas regras.
- **Frase textual > paráfrase.** O valor está na palavra exata do renter. Marcar com aspas e link.
- **Sempre guardar o link** da fonte na captura — para citar e re-verificar.
- **Nunca expor modelo de negócio** em nada que vire copy de usuário.
- **O filtro é o POST, não a sala.** Engajar posts de decisão/dor/sobrecarga em QUALQUER sala relevante; pular pedidos de "lista de bairro" em qualquer sala. Não descartar uma sala inteira.
- Salas principais: r/NYCapartments, r/AskNYC, r/nyc, r/brooklyn, r/astoria, r/manhattan.
- **r/movingtoNYC ESTÁ no escopo** (correção 2026-07-09): a audiência é premium — gente no momento exato da decisão de mudança, muitas de fora, alta intenção, exatamente o cliente do produto. Engajar os decision-moments/pain posts ali (ex.: "não consigo decidir entre LES/Brooklyn/Harlem"); pular só os "me recomenda um bairro". [Antes eu pulava a sala inteira — erro; o problema era o tipo de post, não a sala.]
- Fora do escopo de verdade: r/personalfinance, r/legaladvice, qualquer sala fora de NYC.

## Arquivos
- `copy-bank.md` — banco de frases curado, por dor. **É o entregável que alimenta as copies.**
- `raw/` — capturas cruas dos threads (fonte original, citável).
- `raw/_TEMPLATE.md` — molde de captura.
