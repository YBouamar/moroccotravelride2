# Session 2026-10-25 : étape 4, base de données et RLS

## Objectif

Phase 1c : Supabase local, tables d'identité et de sociétés, RLS testée.

## Réalisé

- Dépôt GitHub : toujours 403.
- `supabase init`, démarrage local (Docker), auth durcie dans `config.toml`, analytics locale désactivée.
- Migrations : référentiels (6 villes, 6 aéroports, 5 types de véhicules), identité et sociétés (profils, sociétés, membres, documents, fonctions de sécurité, triggers de garde, `create_company`, RLS), paramètres plateforme.
- 42 tests pgTAP au vert ; contre-test volontairement faux confirmé en échec.
- `pnpm db:types`, types exportés par `@mtr/db`, test de cohérence des énumérations.
- `@mtr/shared` : matrice de permissions, schéma Zod des paramètres.
- CI : job base de données (tests pgTAP + types à jour).

## Décisions

ADR-019. Questions Q19 (visibilité marketplace) et Q20 (capacités indicatives).

## Problèmes

Aucun bloquant. Point de vigilance : les politiques s'appuient sur `auth.jwt() ->> 'aal'` ; à vérifier avec de vraies sessions MFA à l'étape 5.

## Prochaine étape

Étape 5 (authentification, fin de Phase 1) après validation.
