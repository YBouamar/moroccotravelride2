# Session 2026-10-25 : intégration des réponses de cadrage

## Objectif

Intégrer les réponses de Yassine aux questions Q1 à Q10 de la Phase 0, sans démarrer l'étape 2.

## Réalisé

- Kit de logos officiel (SVG vectoriels et PNG transparents : couleur, négatif, blanc, symbole, icônes d'app, favicons) déplacé vers `assets/brand/logos/{svg,png,favicon}` ; ancien dossier imbriqué supprimé après vérification de la copie ; fichiers v1 à fond blanc archivés dans `assets/brand/v1/`.
- Police identifiée par comparaison des formes (le texte des SVG est vectorisé) : Montserrat.
- ADR-001, 008 et 011 marqués REMPLACÉS ; ADR-002, 004, 005 et 007 ACCEPTÉS ; nouveaux ADR-012 (paiement hors ligne et compensation), 013 (VPS Contabo), 014 (kit de logos et police), 015 (qualité sans dépôt distant).
- Docs mises à jour : BUSINESS_RULES, ARCHITECTURE, DATA_MODEL, UX, SECURITY, RUNBOOK, TESTING, BACKLOG, PROJECT_OVERVIEW, PROGRESS, CLAUDE.md (racine et apps), README, `.env.example`.

## Décisions

Voir ADR-012 à ADR-015.

## Problèmes

- Le dossier source des logos était verrouillé par Windows pendant le déplacement : contourné par copie, vérification puis suppression.
- Ambiguïté sur le paiement en espèces (qui reçoit l'argent et comment) : questions Q11 à Q14.

## Prochaine étape

Étape 2 (Phase 1a, socle monorepo), sur feu vert de Yassine.
