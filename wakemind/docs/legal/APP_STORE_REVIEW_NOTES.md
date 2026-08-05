# App Store review notes

Prepared in advance. Reviewers reject what they cannot quickly understand, and
this app asks for two sensitive permissions and deliberately makes itself hard
to dismiss.

## What the app does

An alarm clock that asks you to confirm a note you wrote the previous evening
before it stops ringing.

## Permissions

- **Calendar (EventKit)** — to show today's commitments and suggest a wake time.
  Read-only. Never leaves the device. Requested at the point of use, not at launch.
- **Microphone** — optional, to record a five-second voice note to yourself.
  Stored on-device, deleted after playback. Never uploaded.

## Anticipated questions

**"Can the user always stop the alarm?"** Yes. Holding the stop control for 3
seconds ends it unconditionally, without completing anything (ADR-0008). This is
present in every build and is never gated.

**"What is the anonymous data?"** Counts and durations only, opt-in, no content.
See the privacy policy.

**"Why does it need iOS 26?"** It uses AlarmKit, which is the only reliable way
to schedule an alarm that sounds through Silent and Focus.

## Demo account

None required — no accounts exist (ADR-0005). To review the morning flow without
waiting overnight, set an alarm two minutes out.
