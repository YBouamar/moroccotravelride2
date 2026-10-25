# apps/web : spécificités

> Créée à l'étape 3. Commandes : `pnpm --filter @mtr/web dev | build | test | e2e`.

## Structure

- `src/app/[locale]/(public)` marketplace · `(auth)` · `(saas)/app` transporteur · `(admin)/admin` back-office (MFA `aal2`).
- `src/app/api` : healthcheck et futurs webhooks de paiement en ligne (vérification de signature, idempotence).
- `src/features/<domaine>` : `components/`, `actions.ts`, `queries.ts`, `schemas.ts`.
- `src/lib/supabase/{server,admin}.ts` : `admin.ts` (service role) commence par `import 'server-only'`. Pas de client navigateur : toute l'authentification passe par le serveur (cookies HttpOnly).
- `src/messages/{fr,en,ar}.json` : toutes les chaînes visibles. Clés hiérarchiques.
- `public/brand/` : copies des logos depuis `assets/brand/logos/` par script (ne pas éditer à la main).

## Règles locales

- Chaque Server Action : `requireSession()`, `requireMembership(role[])`, `schema.parse(input)` ; jamais de `company_id` venant du client.
- Server Components par défaut ; `'use client'` seulement pour l'interactivité, TanStack Query pour les écrans interactifs du SaaS.
- Tailwind : couleurs via tokens uniquement, propriétés logiques (`ms-`, `pe-`, `start-`) pour le RTL.
- Bouton principal : `bg-accent text-primary` (contraste 5,80). Jamais `text-accent` sur fond clair.
- Logos (SVG) : `MTR_horizontal_couleur` en-tête public, `MTR_horizontal_negatif` barre latérale SaaS / admin, `MTR_vertical_couleur` pages auth ; `favicon.ico`, `MTR_icone_navy_180` (`apple-icon`), 192 / 512 (manifeste).
- Build : `output: 'standalone'` pour l'image Docker du VPS (ADR-013).

## Pièges connus

- Next.js 16 : le middleware s'appelle `src/proxy.ts` (plus `middleware.ts`).
- ESLint : la config racine doit venir **après** `eslint-config-next`, sinon le parseur Next casse les règles typescript-eslint.
- Les pages reçoivent `locale: string` : passer par `asLocale()` (`src/i18n/as-locale.ts`) avant `setRequestLocale`.
- `X-Frame-Options: DENY` empêche d'afficher le site dans une iframe (voulu).
- `packages/ui/theme.css` est généré : ne jamais l'éditer, lancer `pnpm --filter @mtr/ui gen:css`.
- Les logos de `public/brand/` et les icônes de `src/app/` sont des copies ignorées par git (`pnpm brand`).
- Nouvelle chaîne visible : l'ajouter dans les **trois** fichiers de `src/messages/` (un test le vérifie).
- Formulaires publics : Turnstile + `consumeRateLimit` dans la Server Action ; le jeton Turnstile est à usage unique (remonter le widget après une erreur, `useAuthForm`).
- `redirect()` dans une Server Action doit rester hors d'un `try` (il lève une exception de navigation).
- `getByRole('alert')` en E2E : Next.js a son propre `role=alert` (annonceur de route), filtrer par texte.
- `next start` avertit avec `output: 'standalone'` : sans effet en local ; en production, lancer `server.js` du dossier standalone (image Docker, Phase 7).
