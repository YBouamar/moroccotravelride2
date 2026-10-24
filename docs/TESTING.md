# Stratégie de test

## 1. Pyramide

| Niveau | Outil | Portée | Obligatoire |
|---|---|---|---|
| Unitaire | Vitest | Tout `packages/shared` : commission, règle des 24 h, annulation, numérotation, TVA, transitions d'état, permissions | Oui, couverture visée 100 % des fonctions métier |
| Base de données | pgTAP (`supabase test db`) | Chaque politique RLS, triggers (immutabilité facture, localisation `in_progress`), fonctions SQL | Oui, une politique = au moins un test positif et un négatif |
| Composants / actions | Vitest + Testing Library | Server Actions critiques (validation, refus d'accès), composants à logique | Ciblé |
| E2E | Playwright | Réservation complète (paiement mock), acceptation transporteur, création et émission de facture, isolation entre deux sociétés, bascule RTL | Oui (scénarios listés) |

## 2. Commandes (à partir de la Phase 1)

```
pnpm test            # Vitest sur tous les paquets (turbo)
pnpm db:test         # pgTAP, nécessite supabase start
pnpm e2e             # Playwright, nécessite web + supabase locaux
pnpm e2e --ui        # mode interactif
```

## 3. Données de démonstration (`supabase/seed.sql`, Phase 1 à 3)

3 sociétés fictives (une `verified` Standard, une `verified` V2, une `pending`), véhicules et chauffeurs, grilles sur Casablanca, Marrakech, Fès, Agadir, Tanger, Rabat, réservations dans tous les statuts. Aucune donnée réelle.

## 4. Comptes de démonstration (local uniquement)

Mot de passe commun local : défini dans `seed.sql` et rappelé ici à sa création (jamais réutilisé ailleurs).

| E-mail | Rôle | Société |
|---|---|---|
| (créés en Phase 1) | | |

## 5. CI

GitHub Actions bloquante : lint, typecheck, tests unitaires, pgTAP (Supabase dans le runner), build, gitleaks, `pnpm audit`. E2E sur PR vers `main`.
