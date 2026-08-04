# WakeMind — Product Discovery & Strategic Validation

**Status:** Discovery memo. No code, no PRD, no architecture. The only question answered here is whether this deserves to be built.
**Date:** August 2026
**Note:** This document is unrelated to The Steady One product. It lives here only because this session's branch was designated for it.

---

## 0. Verdict up front

**No.** I would not spend the next six months building WakeMind as specified.

I would spend **three weeks** testing a materially different version of it, because one assumption inside the brief is wrong in a way that invalidates the current MVP, and one assumption is right in a way nobody in this category has exploited.

- **Wrong:** the intervention is scheduled at the exact moment the user is least capable of performing it.
- **Right:** every competitor is trying to wake the body. Nobody owns the first decision of the day. That lane is genuinely empty.

The rest of this document is the evidence.

---

## 1. Is this actually a painful problem?

### Frequency: very high. This part of the thesis survives.

| Finding | Source |
|---|---|
| Snooze pressed on ~**56% of 3 million nights** analyzed | [Nature, Scientific Reports 2025](https://www.nature.com/articles/s41598-025-99563-y) |
| ~**45%** of subjects snooze on **>80% of mornings**; heavy users lose ~**20 min/day** | [Nature, Scientific Reports 2025](https://www.nature.com/articles/s41598-025-99563-y) |
| **30–60%** habitual snoozers depending on population; **57%** in the Notre Dame cohort | [Notre Dame News](https://news.nd.edu/news/hitting-the-snooze-button-youre-far-from-alone-study-shows/) |
| **55%** oversleep at least once a week; **75% of those** have been late to work | [The Ladders / eachnight survey](https://eachnight.com/sleep-studies/wake-up-call/) |
| Mean sleep inertia duration **15.8 min**; anxious participants **+14.3 min longer** (n=2,355) | [PLOS One 2025, nationwide study](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0337992) |
| Cognitive performance is **worst in the first 3 minutes** after waking; impairment can equal or exceed **40 hours of sleep deprivation** | [Sleep inertia: current insights, Nature and Science of Sleep](https://www.dovepress.com/sleep-inertia-current-insights-peer-reviewed-fulltext-article-NSS) |

### Intensity: much lower than frequency.

This is the trap. High-frequency, low-intensity problems are the graveyard of consumer apps. People snooze every day and complain about it approximately never — until the day it costs them something. The cost event ("I missed the 8am," "I got a warning from my manager") happens maybe monthly, and by then the app that could have prevented it is three screens deep and muted.

**Emotionally**, the real charge is not "I dismissed my alarm unconsciously." It is guilt and self-distrust: the promise you made to yourself last night, broken before you were awake enough to defend it. That is a stronger emotional hook than the mechanism the brief leads with, and it is not being used.

### Who experiences it most (this is your ICP signal, from data, not guesses)

Late chronotypes, women, people lower in conscientiousness, and younger adults ([Notre Dame](https://news.nd.edu/news/hitting-the-snooze-button-youre-far-from-alone-study-shows/); [Sundelin et al., J Sleep Research 2024](https://onlinelibrary.wiley.com/doi/10.1111/jsr.14054)). Anxiety extends inertia by ~14 minutes ([PLOS One 2025](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0337992)).

**Score: 6/10.** Universal and daily, but rarely acute. It is an irritation, not a wound.

---

## 2. Are you solving the correct problem?

**Partly. And the part you're missing is the part that decides the outcome.**

Snoozing has three separable causes:

**(a) Biology — sleep debt and chronotype misalignment.** The alarm is ringing at a time the body has not finished sleeping. No app fixes this. Anything you build sits on top of it.

**(b) Automaticity — the mechanism in your brief.** Real and well documented. Dismissing an alarm is an over-learned motor sequence the motor cortex can execute while the prefrontal cortex is still offline — which is precisely why people have no memory of doing it. Your insight here is correct.

**(c) Avoidance — the one you have not accounted for, and the one that will hurt you.** Research on morning avoidance finds it does **not** correlate with lower motivation; it correlates with **higher emotional labor demands** ([BetterSleep](https://bettersleep.org/blog/the-psychology-of-the-snooze-button-why-we-hit-it-and-how-to-break-the-cycle/); [Integrative Psych](https://www.integrative-psych.org/resources/the-habit-of-snoozing-alarms-understanding-the-causes-consequences-and-solutions)). Snoozing is avoidance coping. People snooze to postpone the day, not to postpone consciousness.

**Now put (c) next to your MVP.** Your product's core action is: *at the moment of peak grogginess and peak avoidance, show the user every obligation they have today, one card at a time, and refuse to stop until they acknowledge all of them.*

For the segment that snoozes out of avoidance — which the research says is a large share — **you have built an anxiety amplifier and attached it to a siren.** The most likely negative review of WakeMind is not "it didn't work." It is *"it made my mornings worse."* That is a churn mode, not a bug.

**The deeper problem** is not "people decide on autopilot." It is: **people wake up into an undifferentiated pile of obligations and their first instinct is to hide from it.** The winning product makes the morning feel *smaller*. Yours makes it feel bigger.

---

## 3. The fatal design error: you scheduled cognition at the cognitive trough

This is the single most important finding in this memo.

Your flow requires the user, within seconds of waking, to: read multiple event cards, comprehend them, evaluate them against each other, and **select the most important one**. That is comprehension, evaluation, and prioritization — three executive functions — demanded at the exact minute the prefrontal cortex is documented to be the *last* brain region to come back online.

The empirical work on this is not ambiguous:

- Performance is **worst in the first three minutes** after waking, with sustained attention and alertness the most impaired domains ([PLOS One](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0079688); [Dovepress review](https://www.dovepress.com/sleep-inertia-current-insights-peer-reviewed-fulltext-article-NSS)).
- Analysis of **42.9 million alarm events from 211,273 users** found cognitive-load tasks (math) impose different and worse dynamics than physical-load tasks, and that **physical load produces better waking performance** ([MDPI, Applied Sciences 2020](https://www.mdpi.com/2076-3417/10/11/3993)).
- In a dedicated wake-up-task behavior-change trial, **82.5% (33/40)** of respondents reported waking late or staying half-asleep, and the researchers attributed most failures to *"respondents' lowered ability due to sleep inertia"* ([JMIR Formative Research 2022](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9529170/)).

Meanwhile the intervention you actually want — **implementation intentions**, if-then plans that pre-commit behavior — has one of the most robust effect sizes in behavioral science: **d = 0.65 across 94 tests and 8,000+ participants** ([Gollwitzer & Sheeran 2006](https://www.researchgate.net/publication/37367696_Implementation_Intentions_and_Goal_Achievement_A_Meta-Analysis_of_Effects_and_Processes)), replicated across 642 tests in the 2024 update. But implementation intentions are formed **in advance, while rested**. Their entire mechanism is that they *remove* the need for deliberation in the moment.

**You have inverted the mechanism.** You are asking for deliberation in the moment and offering no pre-commitment.

**The fix is not a feature. It is a reordering:**

> Conscious processing happens **the night before.** The morning is **recall and confirmation only.**

Night: "Tomorrow, the one thing that matters is the 9:00 with Ana. To be calm, you're up by 7:20." (30 seconds, fully awake, high-quality decision.)
Morning: one line, one button. *"9:00 — Ana. Up by 7:20. That's in 4 minutes."*

Same insight. Correct timing. Roughly a tenth of the cognitive load. And it turns the alarm into the enforcement arm of a promise the user made while they were still someone worth trusting.

---

## 4. Positioning

Reject all six of your options as primary. Here is the honest split:

- **What you sell:** *calm, not discipline.* "Wake up knowing the one thing that matters." A morning **decision** assistant — not an assistant that does things, one that resolves the first decision of the day so the user doesn't have to make it while impaired.
- **What you list yourself as:** an **alarm clock.** This is a distribution reality, not a brand choice. The alarm keyword is how anyone finds you. Alarmy does 500k downloads/month largely on that keyword.

Do **not** position as productivity. Productivity positioning attracts people who already have their mornings handled and repels the segment that actually has the problem. Do **not** position as habit-building — that is a promise you cannot keep in six months and it invites comparison to a category with brutal retention.

The line to own, in the user's language: **"your alarm should know what day it is."**

---

## 5. ICP

**Primary — ADHD adults (25–40).** This is the strongest wedge in the research and it is not close.

The pain is described in ADHD literature in almost exactly your terms: *"the transition from sleep to wakefulness demands peak executive function at the exact moment when those systems are offline"* ([ADD Resource Center](https://www.addrc.org/breaking-free-from-morning-struggles-adhd-friendly-strategies-for-on-time-wake-ups/)). Combined with time blindness — difficulty perceiving elapsed time and estimating task duration ([ADDitude](https://www.additudemag.com/slideshows/stop-wasting-time/)) — this segment does not need to be convinced the problem exists. They will read your landing page and say "that's literally me."

They also: already pay for external scaffolding, self-identify publicly, cluster in dense findable communities, and treat "I forgot I had a thing today" as a diagnosis rather than an embarrassment — which means they will *post about it*, which is your growth engine.

**Secondary — meeting-dense knowledge workers with morning anxiety.** Calendar density is what makes your product non-empty. Anxiety is what makes waking hard (+14.3 min inertia). Highest willingness to pay.

**Who will not pay:**
- **Students.** Broke, and their snoozing is sleep debt. You cannot fix biology with a UI.
- **Heavy sleepers who want volume.** Alarmy owns them, and your product is quiet.
- **People with sparse calendars.** This is the one nobody flags and it is severe: on a day with nothing scheduled, **your app is a blank screen with a button.** That is two days a week, minimum, for most people, plus vacations, plus anyone whose life doesn't live in a calendar. A product that is empty 30% of the time cannot hold a subscription. Solve this or accept the ceiling.

---

## 6. Competitive landscape

**Direct — mission alarms (the incumbent category):**
- **Alarmy** — ~$500K/month, ~500K downloads/month; $11.2M revenue in 2021 with 292.6% three-year growth; $5–9/month ([Indie Hackers](https://www.indiehackers.com/post/alarmy-the-11-million-alarm-clock-app-c74024c017); [Apptopia](https://apptopia.com/ios/app/1163786766/about)). Crucially, **Alarmy already ships a time-and-weather voice briefing and a "Wake Up Check"** ([Alarmy](https://alar.my/en)). They are one sprint from your calendar feature.
- **Wayk** — launched Feb 2026. **25M TikTok views, #15 App Store, 100K downloads in 30 days**, now 500K+ downloads at 4.7 stars ([First1000](https://read.first1000.co/p/how-an-alarm-app-got-25-million-views); [MWM](https://mwm.ai/apps/wayk-wake-up-early/6758021281)). Missions: photograph the sky, pushups, find an object.

**What they do well:** the demo. Every one of these products is *visually funny in six seconds.* That is the entire growth model.
**What they miss:** all of them address the body. None address what the day actually contains. Your insight is genuinely unoccupied here.

**Direct — the calendar-alarm graveyard. Read this section twice.**

OnTimer, Calalarm, Alarmate, Today Planned, Calendar Alarm, Calendar Alarm Clock Reminder, AlarmCal, Alarm Clock: Calendar & Tasks, Cannot Ignore, Workday & Holiday Real Alarm (which already ships an *on-device AI morning briefing with weather and your first calendar event*).

**A dozen apps have already built "your calendar, in your alarm." Not one of them broke out.** This is the most important competitive fact in the memo and it argues directly against your MVP: the feature you are leading with has been shipped repeatedly and the market has repeatedly not cared. Your differentiation cannot be *the calendar is in the alarm*. It has to be the emotional outcome.

**Indirect, and dangerous:**
- **Apple.** iOS already shows a **"Good Morning" screen with weather and your calendar** after you dismiss the alarm under Sleep Focus ([MacRumors](https://www.macrumors.com/how-to/wake-up-to-weather-forecast-iphone-lock-screen/); [AppleToolBox](https://appletoolbox.com/how-to-set-up-good-morning-on-iphone-lock-screen/)). Your v1 differentiator is a feature the OS ships for free. That it hasn't changed anyone's behavior is your opening — passive display does nothing — but you must be able to explain the difference in one sentence, and "ours is interactive" is not a sentence that sells.
- **Sleep Cycle** — 878K paying subscribers, publicly traded, and **declining 2% QoQ** ([Sleep Cycle Q2 2025](https://sleepcycle.com/newsroom/press-release/sleep-cycle-interim-report-april-june-2025-strong-margin-and-growth-in-partnerships)). A useful ceiling estimate for a best-in-class sleep-adjacent subscription app.

**Where the real opening is:** not "we show your calendar." It is **"we tell you the time you actually have to be up, and the one thing you have to be up for."** Which brings us to the MVP.

---

## 7. Product critique — the MVP is inverted

You put the only genuinely valuable computation in v2 and the low-value ceremony in v1.

**The computation "given my calendar, my prep time, and my commute, when do I actually have to be up?" is the only thing an alarm can tell me that I do not already know.** You listed commute, traffic, and prediction as *future* work. Meanwhile v1 asks me to read a list I could have read myself, and answer a question I don't want to answer at 6:30am. That is backwards.

**Cut, without hesitation:**
- Apple Calendar and Outlook. Google only. (Also: each provider is a separate review and compliance burden — see risks.)
- The four-question onboarding. You gate the product behind questions whose only output is one sentence of copy. Every question before first value costs activation.
- "Which commitment is most important today?" **at wake time.** Highest cognitive cost, worst possible moment. Move to the night before or delete.
- Card-by-card acknowledgment of every event. This is a chore, and it is the single mechanic most certain to become autopilot tapping within two weeks.

**Keep:**
- The alarm. The calendar read. One screen. The terminal "I'm up."
- **"To arrive calmly at your first commitment, you should get up now."** This is the best line in the brief. It converts an abstract schedule into a *deadline*, and deadlines are the actual behavioral lever. Build the product around this sentence.

**Add exactly one thing:** the **night-before 20-second commitment.** One tap to name tomorrow's one thing. That is your implementation intention, formed while the user is awake and competent.

**On your stated hypothesis** — *"can making users consciously process today's commitments reduce automatic snoozing?"* — as written it is not testable by your MVP, because there is no control. You will ship it, see people using it, and learn nothing. The cheapest valid test is **within-user randomization**: on random mornings the app shows the full flow, on others a plain dismiss. Measure snoozes per morning and minutes from first ring to confirmed up. Same users, same lives, same sleep debt. Two weeks, ~60 people, and you will know.

I would also test the **reordered** version (night-before commitment + one-line morning) as a third arm, because I expect it to beat both.

---

## 8. Psychology — aligned in principle, wrong in execution, and habituation will kill it

**In favor:** implementation intentions (d=0.65). Commitment devices. Effort justification — having invested effort in a wake-up flow makes going back to sleep feel like a loss. Prospective memory failure at wake is real, and surfacing the day does address it.

**Against, and heavier:**

1. **Timing.** Covered in §3. You are demanding executive function from a brain that hasn't loaded it yet.
2. **Habituation is close to certain.** Novelty effects last **1–3 weeks** before responsiveness collapses; habituation drives users to tune out static interventions the way they tune out banner ads ([Stanford HabitLab, CSCW 2018](https://hci.stanford.edu/publications/2018/habitlab/habitlab-cscw18.pdf)). In behavior-change apps, **50% of users disengage — 7+ consecutive days of no use — by day 22** ([JMIR](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7762688/)). Your cards are static by design. Users will learn the tap sequence and execute it the same way they currently execute the dismiss gesture: without reading, without remembering. **You will have rebuilt the exact problem you set out to solve, with more steps.** Stanford's finding is that *rotation* is the only known mitigation — the intervention must vary. Design that in from day one or accept a ~3-week half-life.
3. **Reactance.** An app that refuses to let you go back to sleep until you have acknowledged your obligations will be experienced by a meaningful share of users as nagging. Alarmy gets away with it because the user asked for a fight. You are not offering a fight, you are offering a lecture.
4. **The avoidance problem.** §2. For avoidant snoozers, your flow is a reason to snooze.

---

## 9. Business model

**Yes, the category supports subscriptions** — Alarmy proves it at $5–9/month and ~$6M/year run rate. But note *what* Alarmy sells: **insurance against oversleeping.** Fear. WakeMind does not sell fear, and calm converts worse than fear.

Benchmarks to plan against ([RevenueCat State of Subscription Apps](https://www.revenuecat.com/state-of-subscription-apps-2025); [Adapty](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)):
- Health & Fitness D30 retention **8–12%**, leaders **25%**
- Median trial→paid **39.9%**, top decile **68.3%**
- Revenue per install after 60 days **~$0.63** vs $0.31 overall median

**Recommendation:** $4.99/month, $29.99/year, push annual hard, plus a lifetime unlock (~$39) as a hedge — Alarmy's own IAPs sit at $4.99–$7.49, so the category is price-anchored low. **No premium tier at MVP.** Feature-tiering a product this thin just teaches users the free version is the product.

**Realistic outcome if it works:** a $1–5M ARR business. Good indie outcome, not a venture outcome, unless it expands from "alarm" into "the first hour of your day."

**Score: 6/10.**

---

## 10. Growth — and the structural virality problem nobody has told you

**Wayk is both the playbook and the warning.** They hit 25M views in 30 days with, per their own account, a UGC team ready on day one, a deliberately raw unedited format, and a template copied from an adjacent viral app (Pushscroll, the screen-time blocker that makes you do pushups) ([First1000](https://read.first1000.co/p/how-an-alarm-app-got-25-million-views)).

**Why that worked:** the demo is *physically absurd and visible in six seconds.* Someone does pushups at 6am in their underwear to silence a siren. That is content.

**Why WakeMind will not replicate it:** your demo is **a person calmly reading a list.** There is nothing to film. This is a structural virality deficit, not a creative-execution problem, and it is the risk I would weight second-highest after §3.

Creators will not enjoy demonstrating it. They will enjoy demonstrating *the consequence*: the reaction shot of realizing there's a 7am. So build for that shot.

**Getting to 10,000 — what I would actually do:**
1. **Own the ADHD morning niche first.** TikTok and community-native content, not ads. This audience does the storytelling for you and the pain needs zero explanation.
2. **UGC operation staffed before launch day.** Wayk's stated lesson: an app with no social proof dies quietly.
3. **Make the artifact shareable, not the mechanic.** A morning receipt — "reviewed my day 34 mornings straight, snoozed 3 times" — is screenshot-able. The flow is not.
4. **Lead with the one hook that survives a six-second video:** *"my alarm knows I have a 9am."*
5. Do not buy installs until you can show D7 retention above ~20%. Paid on an unretained alarm app is setting money on fire.

**Score: 3/10 on virality.** This is the honest number and it is the one I would most expect you to argue with.

---

## 11. Every major risk

**Behavioral (highest)**
1. Cognition demanded at the cognitive trough. §3. Potentially fatal to the mechanic as designed.
2. Habituation — tap-through autopilot within 1–3 weeks, recreating the original problem.
3. Avoidant snoozers get worse, not better. "It made my mornings more stressful."
4. Reactance and abandonment: users revert to the stock Clock app, which is one swipe away and always will be.

**Product**
5. **Empty-calendar days.** The app is a blank screen on weekends, holidays, and for anyone whose life isn't calendared. Unsolved, this caps retention structurally.
6. Calendar quality: most people's calendars are half-wrong, full of declined invites, all-day noise, and other people's meetings. Your product's perceived intelligence is capped by the messiest data source in consumer software.
7. Sparse value on the first run. A new user with an empty calendar sees nothing, ever, and churns on day one.

**Platform / technical**
8. **AlarmKit constrains exactly the surface you need.** iOS 26 finally gave third parties real alarms — silent-mode-piercing, Lock Screen, Dynamic Island ([MacRumors](https://www.macrumors.com/2025/06/11/ios-26-third-party-alarm-apps/)). But the alert UI is deliberately restrictive; developers describe it as offering "less and less customization"; Live Activities are required to display alarm UI when the device is unlocked ([Jacob Bartlett](https://blog.jacobstechtavern.com/p/adhd-vs-alarmkit); [Apple Developer Forums](https://developer.apple.com/forums/thread/792814)). **Your rich card flow does not live on the lock screen.** Between the siren and your beautiful experience sits a Face ID unlock and a tap — and that gap is where the user goes back to sleep. Prototype this specific transition before anything else.
9. AlarmKit also **lowered the moat for everyone else.** The hard part of building an alarm app just became easy. Expect a flood.
10. Android: exact alarms are **denied by default since Android 14** ([Android Developers](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms)), plus the long-standing OEM battery-optimization problem that silently kills alarms on Xiaomi/Samsung/Huawei. Alarm apps live and die on this and the reviews are merciless.
11. **Reliability is existential.** One missed alarm is a one-star review and an uninstall. This is a higher reliability bar than almost any other consumer category, and you'd be clearing it as a first-time alarm developer.

**Compliance / legal**
12. **Google Calendar read is a sensitive OAuth scope.** Verification is mandatory, and restricted-scope access requires a **CASA assessment ($500–$4,500 depending on tier) with re-verification every 12 months** ([Google](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification); [Deepstrike](https://deepstrike.io/blog/google-casa-security-assessment-2025)). Recurring cost and recurring risk for a pre-revenue product.
13. **Calendar OAuth during onboarding is an activation cliff.** You are asking a stranger for their entire schedule before they have received anything. Expect a large drop here and design around it.
14. Privacy optics: "an alarm clock that reads my calendar" is a sentence that makes people uneasy, and one bad news cycle in this category is unrecoverable.

**Market / competitive**
15. Apple already occupies this moment with the Good Morning screen and can deepen it in one release.
16. Alarmy can ship your v1 as a feature in a sprint — they already have the briefing infrastructure.
17. A dozen calendar-alarm apps already exist and none broke out. That is a market verdict, not an absence of competition.

**Monetization / retention**
18. Selling calm converts worse than selling fear, in a category where fear is the proven wedge.
19. D30 of 8–12% is the category norm; a thin product will land at the bottom of it.
20. Low structural virality means paid acquisition, which requires retention you may not have.

**Founder**
21. **Split focus.** You are already running an active product (The Steady One). Two consumer products, one founder, no technical background. This belongs on the risk list and it is not a small entry.

---

## 12. What you're missing — only the changes that move PMF

**A. Move the thinking to the night before.** The largest single improvement available. Restated because it is the memo. (§3)

**B. Show one thing, not all things.** Every competitor adds friction. The counter-position is **subtraction**: "You have one hard thing today: the 9:00. Everything else can wait." Psychologically correct for avoidant snoozers, differentiated, and it makes the morning smaller. This is the product I would actually want to use.

**C. Sell the deadline, not the schedule.** *"Be up by 7:20 or you're rushing"* is information the user does not have. *"You have a 9:00"* is information they do have. Only one of those is worth paying for. Pull commute and prep math forward out of v2 — that computation **is** the product; the card ceremony is packaging.

**D. Reconsider the whole framing: the wedge may be the alarm *time*, not the alarm *flow*.** "Your alarm sets itself from your calendar" is one sentence, immediately understood, immediately valuable, works while the user is asleep, requires zero morning cognition, and is not owned by anyone despite a dozen attempts at the adjacent idea. It is also demonstrable in six seconds, which fixes your virality problem. If I were forced to bet on one version of WakeMind, it would be this one.

**E. Solve the empty day before launch, not after.** On a day with nothing scheduled the app must still say something worth waking up to. Otherwise you have built a weekday-only product with weekend churn baked in.

**F. Design rotation in from day one.** Vary the flow, the copy, the ask. Stanford's HabitLab result is that rotation is the only known defense against habituation, and habituation is the mechanism most likely to kill you.

**G. ADHD as the beachhead, calm as the brand, alarm as the keyword.** Three different things, and you need all three to be different on purpose.

---

## 13. Scores

| Dimension | Score | Note |
|---|---|---|
| **Problem Severity** | **6/10** | Daily and universal, but low intensity and mostly biological |
| **Product Idea** | **5/10** | Genuine insight, inverted execution |
| **PMF Potential** | **4/10** as specified · **6.5/10** reordered | The gap between those numbers is this entire memo |
| **Differentiation** | **4/10** | The mechanism is novel; the *perceived* product is "calendar in an alarm," which a dozen apps already are |
| **Business Potential** | **5/10** | Real category, low ceiling, likely $1–5M ARR at success |
| **Virality Potential** | **3/10** | Structurally undemonstrable. Wayk got 25M views because pushups film well. Reading does not. |
| **Subscription Potential** | **6/10** | Category proven at $5–9/mo; this instance sells the weaker emotion |
| **Founder–Market Fit** | **6/10** | See below |

**On founder–market fit specifically:** you are already building a product whose thesis is that people avoid decisions they are capable of making, and need help trusting their own judgment. WakeMind is the same thesis applied to a different hour of the day. That is a real, non-obvious alignment and it is the most encouraging thing in this analysis. What holds the score down is not fit — it is capacity. Two consumer products at once, no technical background, and a category whose table stakes include never, ever failing to ring.

---

## 14. Final answer

**Would I personally spend the next six months building this?**

# No.

Not this version, and not for six months.

Six months is the wrong unit. You have not yet established that the mechanic works, and the specific way you have designed it contradicts what the literature says about the moment it operates in. Building for six months to find that out is exactly the outcome you said you wanted to avoid.

**What I would do instead — three weeks, roughly this shape:**

1. **Week 1 — kill or keep the mechanic.** Recruit ~60 habitual snoozers, weighted to ADHD adults. Within-user randomization across three arms: plain dismiss, your full card flow, and the reordered version (night-before commitment + one-line morning). Measure snoozes per morning and minutes from first ring to confirmed up. This does not require the app you described; it requires the smallest thing that can ring and log.
2. **Week 2 — kill or keep the surface.** Prototype the AlarmKit path end to end on a real iPhone. Specifically: siren fires on the lock screen, and the user reaches your flow. If that transition requires an unlock and a tap, measure how many people complete it at 6:30am. If that number is bad, the product as designed cannot exist on iOS and everything above is moot.
3. **Week 3 — kill or keep the story.** Post ten pieces of content on the *reaction*, not the mechanic, into the ADHD morning niche. If nothing moves, you have your virality answer for free and you know the business needs paid acquisition — which changes the economics before you have spent anything.

**I would change my answer to yes on evidence of all three:** the reordered arm beats plain dismiss on snoozes by a clear margin; the lock-screen-to-flow transition completes reliably; and one of the ten posts gets meaningful organic reach.

**And if I could only fund one sentence of this idea**, it would not be "an alarm that makes you review your day."

It would be: **"an alarm that sets itself from your calendar, and tells you the one thing you're getting up for."**

That version requires no cognition at the cognitive trough, is valuable on the first morning, demos in six seconds, and is not owned by anyone. That is the one I would build.

---

## Sources

Sleep inertia & snoozing: [Nature Scientific Reports 2025 (3M nights)](https://www.nature.com/articles/s41598-025-99563-y) · [PLOS One 2025 nationwide sleep inertia study](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0337992) · [Sundelin et al., J Sleep Research 2024](https://onlinelibrary.wiley.com/doi/10.1111/jsr.14054) · [Notre Dame News](https://news.nd.edu/news/hitting-the-snooze-button-youre-far-from-alone-study-shows/) · [Sleep inertia: current insights](https://www.dovepress.com/sleep-inertia-current-insights-peer-reviewed-fulltext-article-NSS) · [Morning sleep inertia in alertness and performance, PLOS One](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0079688)

Wake-up tasks: [Analysis of a Wake-Up Task-Based Mobile Alarm App (MDPI, 42.9M events)](https://www.mdpi.com/2076-3417/10/11/3993) · [Using Wake-Up Tasks for Morning Behavior Change (JMIR)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9529170/)

Behavior change: [Gollwitzer & Sheeran 2006 meta-analysis](https://www.researchgate.net/publication/37367696_Implementation_Intentions_and_Goal_Achievement_A_Meta-Analysis_of_Effects_and_Processes) · [Stanford HabitLab, CSCW 2018](https://hci.stanford.edu/publications/2018/habitlab/habitlab-cscw18.pdf) · [Engagement decay in behavior change apps (JMIR)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7762688/) · [Snooze button psychology (BetterSleep)](https://bettersleep.org/blog/the-psychology-of-the-snooze-button-why-we-hit-it-and-how-to-break-the-cycle/) · [Integrative Psych on snoozing](https://www.integrative-psych.org/resources/the-habit-of-snoozing-alarms-understanding-the-causes-consequences-and-solutions)

ADHD: [ADD Resource Center](https://www.addrc.org/breaking-free-from-morning-struggles-adhd-friendly-strategies-for-on-time-wake-ups/) · [ADDitude on time blindness](https://www.additudemag.com/slideshows/stop-wasting-time/)

Market & competition: [Alarmy on Indie Hackers](https://www.indiehackers.com/post/alarmy-the-11-million-alarm-clock-app-c74024c017) · [Apptopia — Alarmy](https://apptopia.com/ios/app/1163786766/about) · [Alarmy features](https://alar.my/en) · [First1000 — how Wayk got 25M views](https://read.first1000.co/p/how-an-alarm-app-got-25-million-views) · [Wayk on MWM](https://mwm.ai/apps/wayk-wake-up-early/6758021281) · [Sleep Cycle Q2 2025](https://sleepcycle.com/newsroom/press-release/sleep-cycle-interim-report-april-june-2025-strong-margin-and-growth-in-partnerships) · [OnTimer](https://www.ontimer.app/calendar-alarm-app) · [eachnight oversleeping survey](https://eachnight.com/sleep-studies/wake-up-call/)

Platform & compliance: [MacRumors on AlarmKit](https://www.macrumors.com/2025/06/11/ios-26-third-party-alarm-apps/) · [My ADHD vs the AlarmKit API](https://blog.jacobstechtavern.com/p/adhd-vs-alarmkit) · [Apple Developer Forums — AlarmKit lock screen](https://developer.apple.com/forums/thread/792814) · [Apple Good Morning screen](https://appletoolbox.com/how-to-set-up-good-morning-on-iphone-lock-screen/) · [Android 14 exact alarms](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms) · [Google sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) · [Google CASA costs](https://deepstrike.io/blog/google-casa-security-assessment-2025)

Benchmarks: [RevenueCat State of Subscription Apps](https://www.revenuecat.com/state-of-subscription-apps-2025) · [Adapty Health & Fitness benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)
