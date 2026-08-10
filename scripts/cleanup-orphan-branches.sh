#!/usr/bin/env bash
# Limpeza dos 26 branches órfãos (linhagem pré-reescrita, jan–jun/2026).
# Auditados em 2026-08-10 (PROJECT_BRIEF §13): nenhum conteúdo exclusivo além de
# 2 arquivos de onboarding obsoletos, um favicon.ico antigo e 4 mockups — já
# preservados em docs/mockups/archive/.
#
# O script primeiro cria uma tag archive/<branch> para cada um (deleção 100%
# reversível) e só então apaga o branch remoto. Rodar da raiz do repo:
#   bash scripts/cleanup-orphan-branches.sh
set -euo pipefail

BRANCHES=(
  claude/card-transit
  claude/collect-partial-tolerance
  claude/copy-cleanup
  claude/decision-card-redesign
  claude/design-identity
  claude/design-skill-home
  claude/fix-apify-no-price
  claude/flow-questions
  claude/flow-redesign
  claude/giveup-ledger-fix
  claude/housing-type-categorization
  claude/onboarding-aha-mockup
  claude/onboarding-teaser-build
  claude/onboarding-teaser-mockup
  claude/rent-stab-lookup
  claude/repaint-exit-signin-subscribe
  claude/scraper-actor-hardcode
  claude/scraper-parseforge-migration
  claude/scraper-saswave
  claude/suspicious-bardeen-a21924
  claude/truth-panel-direction
  claude/update-brief-incident-2026-05-19
  hotfix/decision-apply-nav
  hotfix/decision-tempdebug-ts
  hotfix/vercel-build-decision
  listing-uuid-null-944a7
)

git fetch origin --prune

echo "==> 1/3: criando tags archive/* (backup reversível)"
for b in "${BRANCHES[@]}"; do
  if git rev-parse -q --verify "refs/remotes/origin/$b" >/dev/null; then
    git tag -f "archive/$b" "origin/$b"
  else
    echo "    (já não existe: $b)"
  fi
done

echo "==> 2/3: subindo as tags"
git push origin --tags

echo "==> 3/3: deletando os branches remotos"
for b in "${BRANCHES[@]}"; do
  git rev-parse -q --verify "refs/remotes/origin/$b" >/dev/null && git push origin --delete "$b"
done

git fetch origin --prune
echo "==> Pronto. Para restaurar qualquer um: git push origin archive/<branch>:refs/heads/<branch>"
