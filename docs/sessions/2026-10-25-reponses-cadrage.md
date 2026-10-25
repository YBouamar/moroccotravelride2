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

## Complément (réponses Q11 à Q16)

- Espèces remises au chauffeur puis au dirigeant ; virement avant le trajet : le transporteur encaisse toujours 100 % et règle la commission chaque mois en espèces ou virement instantané. ADR-016 remplace ADR-012 ; modèle de données, flux, UX, sécurité et règles mis à jour.
- Carte en ligne reportée (formalités), relevé mensuel, Coolify et dépôt privé actés.
- Nouvelles questions mineures : Q17 (délai de suspension pour relevé impayé), Q18 (GitHub ou GitLab).

## Complément (Q17, Q18)

- Q17 : suspension marketplace 15 jours après l'échéance d'un relevé impayé (BR-009d ACTÉ).
- Q18 : GitHub. Aucun MCP GitHub n'était installé. Le serveur officiel (`https://api.githubcopilot.com/mcp/`) refuse l'OAuth automatique de Claude Code (pas d'enregistrement dynamique de client) : il faut un jeton personnel, saisi par Yassine lui-même. Commande : `claude mcp add --transport http --scope user github https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer <JETON>"`. Le push utilisera Git Credential Manager (déjà installé).

## Prochaine étape

Étape 2 (Phase 1a, socle monorepo), sur feu vert de Yassine.
