# Architecture

## 1. Vue d'ensemble

```mermaid
flowchart LR
  subgraph Clients
    T[Voyageur<br/>navigateur mobile]
    S[Transporteur<br/>navigateur desktop]
    A[Admin plateforme]
    D[Chauffeur<br/>app Expo]
  end
  subgraph Vercel
    W[apps/web<br/>Next.js App Router<br/>SSR + Server Actions]
    API[Route handlers<br/>webhooks paiement]
  end
  subgraph Supabase
    PG[(PostgreSQL + RLS)]
    AU[Auth + MFA]
    ST[Storage privé]
    RT[Realtime]
    EF[Edge Functions + pg_cron]
  end
  PAY[CMI<br/>page hébergée]
  RS[Resend]
  SE[Sentry]
  T & S & A --> W
  D --> AU & PG & ST & RT
  W --> PG & AU & ST
  PAY -- callback signé --> API --> PG
  W -- redirection --> PAY
  EF --> PG & RS
  W --> RS
  W & D -.-> SE
```

Principe : **un seul backend managé (Supabase)**, une seule application web qui sert les trois espaces (marketplace publique, SaaS, admin) via des groupes de routes, une application mobile pour les chauffeurs. Pas de serveur applicatif séparé.

## 2. Monorepo

| Paquet | Rôle | Consommé par |
|---|---|---|
| `apps/web` | Marketplace, SaaS, admin, webhooks | Vercel |
| `apps/driver` | App chauffeur Expo | EAS |
| `packages/shared` | Schémas Zod, constantes métier, calculs purs, machines à états, matrice de permissions | web, driver, edge functions |
| `packages/db` | Types générés Supabase, helpers de requêtes typés | web, driver |
| `packages/ui` | Tokens de design (couleurs, typo, espacements, rayons) exportés en CSS variables et en objet TS | web, driver, e-mails, PDF |
| `packages/payments` | Interface `PaymentProvider`, adaptateurs `mock` et `cmi` | web (route handlers) |

Règle de dépendance : `apps/*` dépendent de `packages/*` ; `packages/shared` ne dépend d'aucun autre paquet interne ; aucune dépendance d'un paquet vers une app.

## 3. Organisation de `apps/web`

- `src/app/[locale]/(public)` : accueil, recherche, résultats, tunnel de réservation, gestion de réservation, pages légales, pages villes / axes (SEO).
- `src/app/[locale]/(auth)` : connexion, inscription transporteur, mot de passe, MFA.
- `src/app/[locale]/(saas)/app` : espace transporteur (layout avec barre latérale, sélecteur de société si multi-appartenance).
- `src/app/[locale]/(admin)/admin` : back-office (MFA exigé par le layout et par RLS via `aal2`).
- `src/app/api` : webhooks (`/api/payments/[provider]/callback`), cron sécurisés si nécessaire.
- `src/features/<domaine>` : `components/`, `actions.ts` (Server Actions), `queries.ts`, `schemas.ts` (réexport depuis shared).
- `src/lib` : clients Supabase (`server`, `browser`, `admin` service_role serveur uniquement), `auth.ts` (session, rôle, société courante), `permissions.ts`, `rate-limit.ts`, `feature-gate.ts`.

## 4. Flux principaux

### 4.1 Réservation marketplace

```mermaid
sequenceDiagram
  participant V as Voyageur
  participant W as Next.js
  participant DB as Postgres
  participant P as Prestataire paiement
  participant C as Transporteur
  V->>W: recherche (villes, date, passagers)
  W->>DB: grilles actives des sociétés vérifiées
  V->>W: choix + infos passager (Turnstile)
  W->>W: contrôle 24 h, recalcul prix + commission (shared)
  W->>DB: booking pending_payment (commission figée)
  W->>P: création session de paiement (montant serveur, clé d'idempotence)
  V->>P: paiement sur page hébergée
  P->>W: callback signé
  W->>W: vérification signature + montant + idempotence
  W->>DB: payment_transaction + booking pending_carrier + échéance
  W-->>V: e-mail de confirmation (Resend)
  C->>W: accepter / refuser
  W->>DB: booking confirmed + création trip (origin marketplace)
```

### 4.2 Localisation chauffeur (V2)

App chauffeur : démarrage du trajet (statut `in_progress`) puis envoi des positions dans `driver_locations` (insert autorisé par RLS seulement si le trajet du chauffeur est `in_progress`) ; le gestionnaire s'abonne au canal Realtime filtré par `company_id`. Fin du trajet : arrêt de la tâche de fond. Purge par pg_cron.

### 4.3 Feature gating

`plan_features(plan_code, feature_key)` ; fonction SQL `has_feature(company_id, key)` utilisée par les politiques RLS des tables V2/V3 ; helper serveur `hasFeature()` et composant `<FeatureGate>` pour l'UI.

## 5. Versions relevées (npm, 2026-10-24)

À figer en Phase 1 après vérification de compatibilité croisée (voir ADR-009).

| Paquet | Dernière stable |
|---|---|
| node (local) | 24.22.1 |
| pnpm | 12.15.0 (non installé localement) |
| turbo | 2.11.10 |
| next | 16.4.3 |
| react | 19.3.1 |
| typescript | 7.0.2 (compatibilité à valider) |
| tailwindcss | 4.3.3 |
| next-intl | 4.14.9 |
| @supabase/supabase-js | 2.118.0 |
| @supabase/ssr | 0.12.7 |
| supabase (CLI) | 2.122.0 (non installé localement) |
| zod | 4.6.7 |
| react-hook-form | 7.91.0 |
| @tanstack/react-query | 5.104.5 |
| expo | 58.0.19 |
| expo-router | 58.0.26 |
| i18next | 26.5.10 |
| resend | 6.34.1 |
| @react-pdf/renderer | 4.9.0 |
| maplibre-gl | 6.15.0 |
| vitest | 5.0.5 |
| @playwright/test | 1.64.1 |

Outils locaux constatés : Node 24, git 2.56, Docker 29.8 (requis pour `supabase start`).

## 6. Environnements

| Environnement | Web | Backend | Données |
|---|---|---|---|
| local | `pnpm dev` | `supabase start` (Docker) | `seed.sql` fictif |
| staging | Vercel preview | projet Supabase staging | fictives |
| production | Vercel production | projet Supabase production | réelles |

Jamais de données réelles en local. Migrations appliquées par CI (`supabase db push`) sur staging puis production.
