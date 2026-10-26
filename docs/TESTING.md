# Stratégie de test

## 1. Pyramide

| Niveau | Outil | Portée | Obligatoire |
|---|---|---|---|
| Unitaire | Vitest | Tout `packages/shared` : commission, règle des 24 h, annulation, numérotation, TVA, transitions d'état, permissions | Oui, couverture visée 100 % des fonctions métier |
| Base de données | pgTAP (`supabase test db`) | Chaque politique RLS, triggers (immutabilité facture, localisation `in_progress`), fonctions SQL | Oui, une politique = au moins un test positif et un négatif |
| Composants / actions | Vitest + Testing Library | Server Actions critiques (validation, refus d'accès), composants à logique | Ciblé |
| E2E | Playwright | Réservation complète (paiement mock), acceptation transporteur, création et émission de facture, isolation entre deux sociétés, bascule RTL | Oui (scénarios listés) |

## 2. Commandes

```
pnpm check           # format + lint + typecheck + tests + build (avant tout commit important)
pnpm test            # Vitest sur tous les paquets (turbo, avec cache)
pnpm db:start        # Supabase local (Docker)
pnpm db:reset        # réapplique migrations + seed
pnpm db:test         # pgTAP
pnpm e2e             # Playwright : build de production + tests ordinateur et mobile
```

État au 2026-10-25 :

- **144 tests unitaires** : `@mtr/shared` 71 (commission, arrondis, montants affichés, permissions, paramètres et RIB, authentification, accès en écriture et délai de grâce, conversions de taux, schémas société / véhicule / chauffeur, détection du type réel des fichiers, avancement de l'onboarding, validité des documents, dates au fuseau marocain) ; `@mtr/ui` 28 ; `@mtr/db` 3 (énumérations) ; `@mtr/web` 31 (traductions, CSP, redirections sûres, affichage de l'historique) ; `@mtr/driver` 11.
- **92 tests pgTAP** (`pnpm db:test`) : RLS partout, isolation entre sociétés, rôles, colonnes admin, MFA admin, profils, référentiels, paramètres, visibilité et suspension marketplace, limitation des tentatives, essai automatique, `has_feature`, abonnements réservés à l'admin, journal d'audit, délai de grâce de 15 jours et résiliation planifiée, lecture seule, véhicules et chauffeurs, stockage privé des documents. Un test volontairement faux a été lancé pour vérifier qu'ils savent échouer.
- **42 tests E2E** (Playwright), dont onboarding complet (profil, faux PDF refusé, vrai PDF déposé, véhicule, chauffeur, immatriculation en double refusée, permis expiré accepté avec avertissement), validation des documents par l'admin, admin (enrôlement MFA réel avec code TOTP calculé, vérification d'une société, commission, abonnement, historique, coordonnées de paiement) et abonnements (fonctions verrouillées, comparaison des offres, jours d'essai, lecture seule, paiement en retard) : langues et RTL, 404, débordement mobile, en-têtes de sécurité (ordinateur + mobile) ; **authentification** (ordinateur) : connexion et déconnexion, isolation entre sociétés, mauvais mot de passe, retour à la page demandée, MFA admin exigée, admin invisible pour un non-admin, inscription confirmée par e-mail (Mailpit) avec société en attente, erreurs de formulaire accessibles, mot de passe oublié de bout en bout, nonce CSP. Prérequis : `pnpm db:start` et `pnpm db:reset` (comptes de démonstration).

`pnpm e2e` construit l'application de production puis lance les tests (Edge installé en local, Chromium en CI).

## 3. Données de démonstration (`supabase/seed.sql`, Phase 1 à 3)

3 sociétés fictives (une `verified` Standard, une `verified` V3 (Atlas : flotte, chauffeurs, clients, trajets, grilles, échéances, pleins), une `pending` en essai V2), véhicules et chauffeurs, grilles sur Casablanca, Marrakech, Fès, Agadir, Tanger, Rabat, réservations dans tous les statuts. Aucune donnée réelle.

## 4. Comptes de démonstration (local uniquement)

Créés par `supabase/seed.sql` (`pnpm db:reset`). Mot de passe commun : **Demo-Mtr-2026** (local uniquement, jamais réutilisé ailleurs).

| E-mail | Rôle | Société |
|---|---|---|
| admin@moroccotravelride.test | Admin plateforme (MFA à configurer à la première connexion) | |
| owner.atlas@moroccotravelride.test | Propriétaire | Atlas Transport Touristique SARL (vérifiée, Casablanca) |
| manager.atlas@moroccotravelride.test | Gérant | Atlas Transport Touristique SARL |
| driver.atlas@moroccotravelride.test | Chauffeur (app mobile, langue arabe) | Atlas Transport Touristique SARL |
| owner.sahara@moroccotravelride.test | Propriétaire (langue anglaise) | Sahara Tours SARL (vérifiée, Marrakech) |
| owner.oasis@moroccotravelride.test | Propriétaire | Oasis Mobility SARL (en attente, Agadir) |

Les e-mails envoyés en local (confirmation, mot de passe oublié) arrivent dans Mailpit : http://127.0.0.1:55324.

## 5. CI

Tant qu'il n'y a pas de dépôt distant (ADR-015) : `pnpm check` en local et hook pre-commit. Ensuite, GitHub Actions bloquante : lint, typecheck, tests unitaires, pgTAP (Supabase dans le runner), build, gitleaks, `pnpm audit`. E2E sur PR vers `main`.

## Test de charge léger (Phase 7)

`node scripts/load-test.mjs <url> <secondes> <concurrence>` : pages publiques en boucle (accueil fr / en / ar, pages villes, CGU), débit, latences p50 / p95 / p99, statuts, erreurs réseau. Aucune dépendance.

Mesure du 2026-10-26 sur le poste de développement (build de production local, Supabase sous Docker sur la même machine) : 30 s, 20 connexions simultanées, **1 439 requêtes (48 / s), p50 424 ms, p95 528 ms, p99 679 ms, 0 erreur**. Ordre de grandeur seulement : à refaire sur le VPS de production avant son ouverture au public (pas de staging au lancement, ADR-039) (cible indicative : p95 sous 800 ms à 20 connexions).
