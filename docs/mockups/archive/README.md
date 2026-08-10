# Mockups arquivados (linhagem pré-reescrita, jun/2026)

Estes 4 mockups existiam **apenas** em branches órfãos (`claude/flow-redesign`,
`claude/flow-questions`, `claude/onboarding-teaser-mockup`), que não compartilham
histórico com o `main` porque o repositório foi reescrito em algum ponto.

Foram copiados para cá em 2026-08-10, antes de aqueles branches serem deletados,
para que o registro de design não se perdesse (CLAUDE.md: mudança visual → mockup primeiro).

| Arquivo | O que é |
|---|---|
| `flow-A-broadsheet.html` | Direção visual do quiz/flow em Dark Broadsheet |
| `flow-B-housing-type.html` | Pergunta de tipo de moradia |
| `flow-C-qualification.html` | Pergunta de qualificação (o estressor nº 1) |
| `onboarding-teaser.html` | Truth Panel bloqueado — a alavanca de conversão do onboarding |

**Status: histórico, não é a UI atual.** Não implemente a partir daqui sem revalidar
com o founder — o flow em produção mudou desde então. Servem como referência de
direção visual e das perguntas que já foram testadas.

A limpeza dos branches órfãos é feita por `scripts/cleanup-orphan-branches.sh`,
que primeiro preserva cada um como tag `archive/*` e só então deleta — a
linhagem completa continua recuperável via `git push origin archive/<branch>:refs/heads/<branch>`.
