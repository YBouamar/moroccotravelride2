# Session 2026-10-25 : étape 3, application web, design system, i18n

## Objectif

Phase 1b : application Next.js aux couleurs de la marque, trois langues avec RTL, coques public / SaaS / admin.

## Réalisé

- Nouvelle tentative de création du dépôt GitHub `moroccotravelride2` : toujours 403 (droits du jeton).
- `@mtr/ui` : génération de `theme.css` (variables clair / sombre, couleurs fixes de marque, rayons), vérifiée par instantané Vitest.
- `apps/web` : Next.js 16.4.3 (`standalone`), Tailwind 4, composants (bouton, carte, badge, champ, skeleton, état vide, logo), polices Montserrat / Inter / Noto Sans Arabic auto-hébergées, logos et favicons copiés depuis le kit, manifeste PWA.
- i18n next-intl : `/fr` (défaut), `/en`, `/ar` (RTL), détection de la langue du navigateur, sélecteur qui conserve la page, clés typées, 404 localisée.
- Pages : accueil marketplace, tableau de bord transporteur (état vide), vue d'ensemble admin (état vide).
- En-têtes de sécurité de base.
- Tests : 38 unitaires, 20 E2E Playwright (ordinateur + mobile), `pnpm check` 16/16, job E2E ajouté au workflow CI.

## Décisions

ADR-018 (dépendances web, thème généré, logos copiés, polices, corrections de contraste).

## Problèmes et corrections

- Texte bleu nuit sur dégradé turquoise : 3,05 seulement : bandeau passé sur fond bleu nuit.
- Turquoise clair insuffisant pour l'anneau de focus (2,52) : turquoise profond.
- En-tête trop large à 390 px : passage sur deux lignes, vérifié par test de débordement.
- pnpm 12 bloque les scripts d'installation inconnus : refus explicite pour trois paquets à binaires précompilés.
- Parseur ESLint de Next en conflit avec typescript-eslint : ordre des configs inversé.
- Prettier reformatait `theme.css` généré : exclu du formatage.

## Prochaine étape

Étape 4 (Phase 1c) après validation ; dépôt GitHub dès que le jeton est corrigé.
