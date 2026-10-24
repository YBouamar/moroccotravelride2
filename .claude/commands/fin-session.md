---
description: Clôturer la session (docs à jour, journal, vérifications, message de commit)
---

Clôture de session MoroccoTravelRide. Aucun tiret cadratin dans ce que tu écris.

1. Liste les changements de la session (`git status`, `git diff --stat`).
2. Si le monorepo existe, lance `pnpm lint`, `pnpm typecheck`, `pnpm test` (et `pnpm db:test` si des migrations ont changé). Signale tout échec avec la sortie, ne le masque pas.
3. Mets à jour `docs/PROGRESS.md` : date, phase / étape, fait, en cours, bloqué, prochaine étape précise, questions ouvertes.
4. Crée `docs/sessions/AAAA-MM-JJ-<sujet>.md` (date du jour) : objectif, réalisé, fichiers modifiés, décisions, problèmes, prochaine étape.
5. Mets à jour les docs impactées : `DATA_MODEL.md` (migrations), `DECISIONS.md` (nouveaux choix), `UX.md` (écrans), `SECURITY.md` (mesures), `BUSINESS_RULES.md`, `TESTING.md`, `RUNBOOK.md`, `BACKLOG.md`, `CLAUDE.md` si une convention ou commande a changé (rester sous 150 lignes).
6. Si plus de 15 journaux existent dans `docs/sessions/`, résume les plus anciens par mois dans `docs/sessions/ARCHIVE.md`.
7. Propose un ou plusieurs messages de commit Conventional Commits (un par unité logique). Ne commite que si Yassine le demande.
