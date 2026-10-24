# Runbook d'exploitation

> Statut : initial (Phase 0). Les procédures marquées ⬜ seront rédigées et **testées** au fil des phases (restauration testée en Phase 7 au plus tard).

## 1. Prérequis poste de développement

| Outil | Version | État constaté le 2026-10-24 |
|---|---|---|
| Node.js | 24 LTS | ✅ 24.22.1 |
| pnpm | 12.x | ⬜ à installer : `corepack enable && corepack prepare pnpm@latest --activate` |
| Docker Desktop | récent | ✅ 29.8.2 |
| Supabase CLI | 2.x | ⬜ à installer (via `pnpm add -D supabase` dans le repo, recommandé) |
| Git | récent | ✅ 2.56 |
| gitleaks | récent | ⬜ à installer (hook pre-commit) |

## 2. Variables d'environnement

Référence : [`.env.example`](../.env.example). Stockage : Vercel (web), secrets Supabase (edge functions), EAS (mobile). Les variables `NEXT_PUBLIC_*` et `EXPO_PUBLIC_*` sont publiques par nature : n'y mettre aucun secret.

## 3. Déploiement ⬜

- Web : push sur `main` puis déploiement Vercel automatique (préview par PR).
- Base : `supabase db push` lancé par la CI sur staging, puis production après validation.
- Edge functions : `supabase functions deploy`.
- Mobile : `eas build` puis `eas submit`.

## 4. Sauvegarde et restauration ⬜

- Sauvegardes automatiques Supabase (quotidiennes), PITR en production payante.
- Export hebdomadaire `pg_dump` chiffré (age / gpg) vers stockage externe.
- Procédure de restauration sur un projet de test, chronométrée, à documenter ici avec la date du dernier test.

## 5. Incidents ⬜

Contacts, accès d'urgence, désactivation de la marketplace (`platform_settings.marketplace_open = false`), rotation des clés, communication voyageurs.

## 6. Checklist de lancement ⬜ (Phase 7)
