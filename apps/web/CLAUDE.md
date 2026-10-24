# apps/web : spécificités

> Application non encore initialisée (création en étape 3, Phase 1b). Ce fichier fixe les règles locales dès maintenant.

## Structure

- `src/app/[locale]/(public)` marketplace · `(auth)` · `(saas)/app` transporteur · `(admin)/admin` back-office (MFA `aal2`).
- `src/app/api` : webhooks paiement uniquement (vérification de signature, idempotence).
- `src/features/<domaine>` : `components/`, `actions.ts`, `queries.ts`, `schemas.ts`.
- `src/lib/supabase/{server,browser,admin}.ts` : `admin.ts` (service_role) commence par `import 'server-only'`.
- `src/messages/{fr,en,ar}.json` : toutes les chaînes visibles. Clés hiérarchiques.
- `public/brand/` : dérivés des logos générés depuis `assets/brand/` (ne pas éditer à la main).

## Règles locales

- Chaque Server Action : `requireSession()`, `requireMembership(role[])`, `schema.parse(input)` ; jamais de `company_id` venant du client.
- Server Components par défaut ; `'use client'` seulement pour l'interactivité, TanStack Query pour les écrans interactifs du SaaS.
- Tailwind : couleurs via tokens uniquement, propriétés logiques (`ms-`, `pe-`, `start-`) pour le RTL.
- Bouton principal : `bg-accent text-primary` (contraste 5,80). Jamais `text-accent` sur fond clair.
- Logos : `logo_horiz` dans les en-têtes, `logo_vertical` sur les pages auth, `favicon` pour les icônes (`app/icon.png`, `apple-icon.png`).

## Pièges connus

(aucun pour l'instant)
