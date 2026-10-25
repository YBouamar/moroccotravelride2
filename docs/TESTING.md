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

- **49 tests unitaires** : `@mtr/shared` 16 (commission, arrondis, permissions, paramètres plateforme) ; `@mtr/ui` 20 (contrastes AA, synchronisation de `theme.css`) ; `@mtr/db` 2 (énumérations base identiques aux constantes) ; `@mtr/web` 11 (mêmes clés fr / en / ar, aucun texte vide, aucun tiret cadratin, sens d'écriture).
- **42 tests pgTAP** (`pnpm db:test`) : RLS partout, isolation entre sociétés, rôles, colonnes admin, MFA admin, profils, référentiels et paramètres. Un test volontairement faux a été lancé pour vérifier qu'ils savent échouer.
- **20 tests E2E** (Playwright, ordinateur + mobile Pixel 7) : redirection selon la langue du navigateur, bascule fr / ar / en avec RTL, conservation de la page au changement de langue, 404 localisée, absence de débordement horizontal, en-têtes de sécurité.

`pnpm e2e` construit l'application de production puis lance les tests (Edge installé en local, Chromium en CI).

## 3. Données de démonstration (`supabase/seed.sql`, Phase 1 à 3)

3 sociétés fictives (une `verified` Standard, une `verified` V2, une `pending`), véhicules et chauffeurs, grilles sur Casablanca, Marrakech, Fès, Agadir, Tanger, Rabat, réservations dans tous les statuts. Aucune donnée réelle.

## 4. Comptes de démonstration (local uniquement)

Mot de passe commun local : défini dans `seed.sql` et rappelé ici à sa création (jamais réutilisé ailleurs).

| E-mail | Rôle | Société |
|---|---|---|
| (créés en Phase 1) | | |

## 5. CI

Tant qu'il n'y a pas de dépôt distant (ADR-015) : `pnpm check` en local et hook pre-commit. Ensuite, GitHub Actions bloquante : lint, typecheck, tests unitaires, pgTAP (Supabase dans le runner), build, gitleaks, `pnpm audit`. E2E sur PR vers `main`.
