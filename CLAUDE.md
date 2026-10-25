# MoroccoTravelRide : mémoire principale

Plateforme marocaine de transport touristique, deux piliers de valeur égale :

- **Pilier A, Marketplace** : réservation en ligne de transferts intra-ville et inter-villes auprès de sociétés de transport touristique agréées. Commission plateforme (20 % par défaut).
- **Pilier B, SaaS de gestion** multi-entreprises pour transporteurs : trajets, chauffeurs, véhicules, facturation, paiements (Standard 150 MAD/mois), + dépenses, app chauffeur, localisation (V2 400 MAD/mois), + parc, échéances, consommation (V3, sur devis).

Stade : MVP, fondateur solo (Yassine). Priorité absolue : **simple à maintenir par une seule personne**, services managés, pas de microservices.

## Où lire quoi

| Besoin | Fichier |
|---|---|
| État courant, prochaine étape, questions ouvertes | [docs/PROGRESS.md](docs/PROGRESS.md) |
| Produit | [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) |
| Règles métier (ACTÉ / À CONFIRMER) | [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md) |
| Décisions (ADR) | [docs/DECISIONS.md](docs/DECISIONS.md) |
| Architecture, versions | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Schéma, RLS | [docs/DATA_MODEL.md](docs/DATA_MODEL.md) |
| Parcours, identité visuelle | [docs/UX.md](docs/UX.md) |
| Sécurité | [docs/SECURITY.md](docs/SECURITY.md) |
| Tests, comptes démo | [docs/TESTING.md](docs/TESTING.md) |
| Exploitation | [docs/RUNBOOK.md](docs/RUNBOOK.md) |
| Vocabulaire fr/en/ar | [docs/GLOSSARY.md](docs/GLOSSARY.md) |
| Idées reportées, dette | [docs/BACKLOG.md](docs/BACKLOG.md) |
| Journaux de session | [docs/sessions/](docs/sessions/) |

## Stack

pnpm workspaces + Turborepo · Next.js (App Router, TS strict) · Tailwind + shadcn/ui + lucide-react · React Hook Form + Zod · TanStack Query · Supabase (Postgres, Auth, Storage, Realtime, Edge Functions, pg_cron) · Expo + expo-router (app chauffeur) · next-intl / i18next (fr défaut, en, ar RTL) · MapLibre + OSM · Resend + React Email · @react-pdf/renderer · paiement hors ligne (virement au transporteur ou espèces au chauffeur ; le transporteur reverse la commission chaque mois) + abstraction `PaymentProvider` pour une future carte en ligne · Turnstile · Upstash · Sentry · Vitest, Playwright, pgTAP · CI locale (`pnpm check`, hook pre-commit), workflow GitHub prêt · **Hébergement : VPS Contabo** (Docker, Supabase auto-hébergé, Next.js standalone, Coolify) · EAS pour les builds mobiles.

## Arborescence (cible)

```
apps/web       Next.js : (public) marketplace, (auth), (saas)/app, (admin)/admin
apps/driver    Expo : app chauffeur
packages/db        types générés Supabase, helpers
packages/shared    Zod, constantes, calculs purs (commission, 24 h, TVA, états), permissions
packages/ui        tokens de design
packages/payments  PaymentProvider + adaptateurs
supabase/          migrations, functions, seed.sql, tests pgTAP
assets/brand/logos/  kit officiel svg/ png/ favicon/ (ne pas modifier) ; v1/ archivé
```

## Commandes

```
pnpm install            # dépendances
pnpm dev                # web + mobile via turbo
pnpm check              # format + lint + typecheck + test + build (gate locale)
pnpm lint | typecheck | test | build | format
pnpm db:start           # supabase start (Docker requis)
pnpm db:reset           # migrations + seed
pnpm db:test            # supabase test db (pgTAP)
pnpm db:types           # régénère packages/db/src/types.ts (étape 4)
pnpm e2e                # Playwright (build prod + tests desktop et mobile)
```

Commandes de session : `/debut-session`, `/fin-session`, `/decision`, `/audit-securite`.

## Règles non négociables

1. **Phase par phase** ; arrêt et validation de Yassine à la fin de chaque phase (et de chaque étape demandée).
2. **Ne jamais deviner une règle métier** : poser la question ou appliquer le défaut documenté et l'inscrire `À CONFIRMER` dans DECISIONS.md.
3. Une tâche n'est finie que si **docs/PROGRESS.md est à jour**.
4. Petits commits testés, Conventional Commits (`feat(saas): ...`, `fix(booking): ...`).
5. **Aucun texte utilisateur en dur** : tout passe par l'i18n.
6. **Jamais de tiret cadratin** dans textes, docs, libellés : deux-points, virgules, parenthèses.
7. Pas de logique métier uniquement côté client ; la logique pure vit dans `packages/shared` et est testée.
8. **RLS sur toutes les tables**, chaque politique couverte par un test pgTAP. L'UI n'est jamais un contrôle d'accès.
9. Montants en **centimes (bigint)**, jamais de float. Dates en `timestamptz` UTC, affichage `Africa/Casablanca`.
10. Aucun taux de commission codé en dur dans un composant ; commission figée sur la réservation à sa création.
11. Clé `service_role` uniquement côté serveur. Aucun secret commité. Aucun `company_id` reçu du client n'est cru.
12. Factures émises immuables (corrections par avoir) ; pas de suppression physique de factures émises ni de réservations payées.
13. Pas de chiffre de marché ou de règle juridique inventé : marquer `À VÉRIFIER`.
14. Pas de dépendance ajoutée sans justification dans DECISIONS.md.

## Conventions

- Fichiers `kebab-case`, composants `PascalCase`, SQL `snake_case`, clés i18n hiérarchiques (`booking.search.submit`).
- Code et commentaires en anglais ; documentation `docs/` en français.
- Composant de plus de ~200 lignes : découper. Organisation par domaine dans `features/`.
- CSS : propriétés logiques (`ms-`, `me-`, `start`, `end`) pour le RTL.
- Couleurs uniquement via tokens (voir UX.md) ; `accent` (#21B6A8) jamais en texte sur fond clair (contraste 2,5).

## Identité visuelle (résumé, détail dans UX.md)

Bleu nuit `#102A43` · Turquoise profond `#087E8B` · Turquoise clair `#21B6A8` · Fond `#F4F8FA` · Blanc `#FFFFFF`. Logos dans `assets/brand/logos/` : `MTR_horizontal_couleur` (fond clair), `_negatif` (fond bleu nuit), `_blanc` (photo, dégradé), `MTR_vertical_*` (auth, splash, PDF), `MTR_symbole_*`, `MTR_icone_app_*`, `favicon/`. Polices : Montserrat (titres), Inter (texte), Noto Sans Arabic. Signature « Move smarter. Manage better. » dans les traductions.
