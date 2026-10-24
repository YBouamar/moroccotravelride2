---
description: Reprendre le projet en début de session (lecture du contexte, état, proposition de tâche)
---

Tu reprends le projet MoroccoTravelRide. Ne code rien avant la validation de Yassine.

1. Lis `CLAUDE.md`, puis `docs/PROGRESS.md`.
2. Lis les deux journaux les plus récents de `docs/sessions/` (tri par nom de fichier, ignore `ARCHIVE.md`).
3. Relève dans `docs/DECISIONS.md` toutes les entrées au statut `À CONFIRMER`.
4. Lance `git status` et `git log --oneline -10`.
5. Si le monorepo existe (`package.json` présent), lance `pnpm lint`, `pnpm typecheck` et `pnpm test` et note le résultat (ne corrige rien).
6. Résume en **10 lignes maximum** :
   - phase et étape en cours,
   - ce qui a été fait à la dernière session,
   - état du dépôt (fichiers non commités) et des tests,
   - décisions À CONFIRMER et questions ouvertes encore sans réponse,
   - **la prochaine tâche proposée**, précise et testable.
7. Attends la validation avant toute modification.
