# Roteiros — dia de gravação 2026-07-04

## Série: "Steady Rules" — uma regra de alugar em NYC por episódio

3 vídeos de 30-60s, gravados no mesmo dia. Falas em INGLÊS (frases curtas, fáceis de
falar). Direções de gravação em português. Fatos verificados no copy bank
(`docs/reddit-insights/copy-bank.md`) com fontes oficiais.

**Por que série:** no TikTok/Reels cada vídeo nasce órfão (algoritmo mostra pra
estranhos, não pros seus seguidores). O formato repetido cria reconhecimento mesmo
sem follow; a numeração puxa o estranho pro perfil pra ver os outros episódios.

### Formato fixo dos 3 (e de todos os episódios futuros)

- **ABERTURA (os 3 primeiros segundos, olhando pra câmera):**
  "Steady Rule number [N] for renting in New York:" + a regra em uma frase.
- **CORPO:** o desenvolvimento (abaixo, por episódio).
- **ASSINATURA (fechamento fixo, nunca muda):** "Know your lines."
  É o mecanismo da marca, verbatim, o mesmo que a pessoa encontra no site e no quiz.
- **END-CARD:** Heed (1 segundo, elemento de marca sutil) + "The Steady One".

**Regra de marca nos 3:** tom calmo, sem música agitada, sem corte frenético, sem
urgência. Você é o "yoga teacher, not salesperson". Nunca mencionar afiliado/receita.

### Padrões de edição (do ep 1 em diante — feedback do founder 2026-07-06)

1. **Legenda menor, em coluna.** No ep 1 a legenda foi de ponta a ponta. Ajustado na
   skill (`render.py` SUB_FORCE_STYLE): FontSize 18→14 + MarginL/MarginR=90, coluna
   centralizada ~70% da largura, nunca encosta na borda. Confirmar no preview do ep 2.
2. **Montagens animadas sincronizadas com a fala** (estilo onboarding do app). Quando o
   founder LISTA coisas, os itens montam na tela item a item conforme ele fala, no visual
   da marca: fundo navy `#0A2540`, card `bg-white/[0.07]` borda `white/20` arredondado,
   check verde `#00A651` aparecendo com easing (ease_out_cubic), um item por vez (nunca
   dois revelando juntos). Sync: o item aterrissa na palavra falada. Segurar frame final
   ≥1s. Ferramenta: overlay PNG/PIL ou HyperFrames; ver skill video-use §Animations.
   - **Ep 2 (scam) — lista dos 3 red flags:** ✓ "Pay before anyone's inside" → ✓ "'First
     month' line = the trick" → ✓ "Paying to hold before you apply". Monta enquanto ele
     fala cada um.
   - **Ep 3 (dealbreakers) — lado-a-lado:** "Natural light: HARD NO" vs "Natural light:
     don't care" aparecendo conforme ele conta os dois renters.
   - **Ep 1 (se repostar):** dois cards "Exclusive right to represent" + "Commission
     agreement" ao citar.

---

## Setup (uma vez, antes de gravar)

- Luz: de frente para uma janela, de dia. Nada de luz atrás de você.
- Celular na vertical, altura dos olhos, apoiado (não segurar na mão).
- Fundo simples e arrumado. Roupa lisa, sem estampa.
- Fale MAIS DEVAGAR do que parece natural. Pausa de 1 segundo entre blocos (facilita cortar).
- Grave cada vídeo 2-3 vezes inteiro. Escolha o melhor take depois.
- A abertura numerada e a assinatura final são IGUAIS nos 3. Decore essas duas: são a marca.
- Legendas sempre (CapCut auto-captions, revisar erros). Maioria assiste sem som.

---

## Episódio 1 (Rule #1) — "You don't owe a broker fee unless YOU hired the broker" (FARE Act + workaround)

**Duração alvo:** ~60s. **Por quê este:** fato verificado que quase ninguém sabe.
**Decisão 2026-07-03:** reescrito da v1 ("landlord pays") porque na PRÁTICA o inquilino
ainda paga — brokers contornam o FARE Act te fazendo assinar exclusividade/comissão.
A v1 soava desconectada da realidade e convidava o comentário "yeah right, I still paid".
A v2 usa essa tensão como o miolo do vídeo: mais honesta, mais street-smart, e é a
inteligência calma que É a marca (não recitar a lei). Papel: confiança + compartilhamento.
Fusão: absorve a regra futura "never sign an exclusive just to tour". Fatos no copy bank
(FARE Act workaround, verificado DCWP/NYC.gov).

**ABERTURA:**
> "Steady Rule number one for renting in New York: you don't owe a broker fee unless you hired the broker."

**CORPO:**
> "Since June 2025, the FARE Act says whoever hires the broker pays. Landlord lists the apartment, landlord pays. Simple."
>
> "So why are people still paying broker fees? Because they get you to sign for it."
>
> "A broker sends you a form before you've even seen the place. 'Exclusive right to represent.' A commission agreement. You sign it, and now, on paper, you hired them. The fee is yours again."
>
> "So here's the line: never sign an exclusive or a commission agreement just to tour an apartment. Seeing a place does not require representation."
>
> "If someone pushes paperwork on you before you've seen the apartment, that's the tell."
>
> "And a straight illegal fee, you can still report. Call 311, or go to the DCWP website."

**ASSINATURA (fixa):**
> "Know your lines."

**Legenda do post:**
"Rule #1: you don't owe a broker fee unless YOU hired the broker. The FARE Act says the landlord pays, but brokers get you to sign an 'exclusive' so the fee lands back on you. Never sign just to tour. Report illegal fees via 311. #nycapartments #nycrenting #brokerfee"

---

## Episódio 2 (Rule #2) — "Nobody pays before a real person is inside" (o golpe dos $500)

**Duração alvo:** ~60s. **Por quê este:** temos o script real de um golpista, palavra
por palavra, minerado do Reddit. Golpe é assunto que todo mundo salva e manda pro amigo.
Papel: alcance.

**ABERTURA:**
> "Steady Rule number two for renting in New York: nobody pays anything before a real person has been inside the apartment."

**CORPO (lendo do papel ou da tela, como quem lê uma prova):**
> "This is a real message from a real scammer. Word for word."
>
> "'The first step is a 500 dollar good faith deposit. This takes the unit off the market and cancels all tours. Then it is applied to the first month's rent.'"
>
> "Three red flags in two sentences."
>
> "One. You never pay before a human being has walked inside that apartment."
>
> "Two. 'It becomes your first month's rent' is there to calm you down. That is the trick."
>
> "Three. Paying to 'hold' a unit before you even apply? That is not how renting works here."
>
> "One thing that is real: you can check any broker's license for free, on the state site. It's called eAccessNY. If the name isn't there, walk away."

**ASSINATURA (fixa):**
> "Know your lines."

**Legenda do post:**
"Rule #2: nobody pays before a real person is inside the apartment. A real scammer's script, word for word. Verify any broker at eAccessNY, it's free. #nycrentalscam #nycapartments #renterstips"

---

## Episódio 3 (Rule #3) — "Decide your lines before you tour" (a tese + CTA)

**Duração alvo:** ~45s. **Por quê este:** é o vídeo da marca e o único com CTA. Se um
dos 3 trouxer gente pro quiz, será este. Papel: conversão.

**ABERTURA:**
> "Steady Rule number three for renting in New York: decide your lines before you tour, not inside the apartment you already love."

**CORPO:**
> "Real example. For one renter, no natural light is a hard no. She needs her plants to survive the city. Another renter, same question: doesn't care about light at all. He wants space and a dishwasher."
>
> "Same factor. Opposite answers. Both right."
>
> "Other people's list is not your list."
>
> "And here's the trap: when the apartment is beautiful, your limits get flexible. People say it out loud. 'I can be flexible on this, especially if the place is nice.'"
>
> "So decide your lines on paper, when you're calm. I built a free guide for exactly this. Seven questions, two minutes. Link in my bio."

**ASSINATURA (fixa):**
> "Know your lines."

**Legenda do post:**
"Rule #3: decide your lines before you tour, not inside the apartment you already love. One renter's hard no is another's don't-care. Free 7-question guide in bio. #nycapartments #apartmenthunting #firstapartment"

---

## Banco de episódios futuros (a série é infinita — do copy bank)

Não gravar agora. Prova de que "Steady Rules" tem combustível pra meses:
- Rule: "A 2-year lease doesn't cost more this year." (Rent Freeze 2026, 0% em 1 e 2 anos)
- Rule: "'Complaint closed' does not mean the problem was fixed." (como ler um registro HPD)
- Rule: "There's no magic credit score that approves you." (é o quadro todo: 40x + crédito + guarantor)
- Rule: "An apartment doesn't vanish over a weekend." (anti-FOMO, mito refutado pela pesquisa)
- Rule: "Your dealbreakers come from how you live, not a checklist." (tamanho nasce de uma rotina)

---

## Links de bio (configurar ANTES de postar)

Um link por plataforma, para o funil dizer qual rede trouxe cada visita:

- TikTok: `https://thesteadyone.com/flow?utm_source=tiktok&utm_medium=bio&utm_campaign=steady_rules`
- Instagram: `https://thesteadyone.com/flow?utm_source=instagram&utm_medium=bio&utm_campaign=steady_rules`
- YouTube: `https://thesteadyone.com/flow?utm_source=youtube&utm_medium=bio&utm_campaign=steady_rules`

## Calendário de postagem (NÃO postar os 3 no mesmo dia)

| Dia | Episódio | Onde |
|---|---|---|
| Seg 6/jul | Rule #1 (FARE Act) | TikTok + IG Reels + Shorts (mesmo arquivo) |
| Qua 8/jul | Rule #2 (scam) | TikTok + IG Reels + Shorts |
| Sex 10/jul | Rule #3 (tese + CTA) | TikTok + IG Reels + Shorts |

## Como avaliar (2 semanas, ~20/jul)

Olhar em `funnel_events`: visitas com `utm_campaign=steady_rules` vs visitas de
`utm_source=reddit` no mesmo período. Vídeo só entra na rotina se superar o Reddit.
Views e likes não contam; visita ao site conta.
