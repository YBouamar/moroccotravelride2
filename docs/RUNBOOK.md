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

Référence : [`.env.example`](../.env.example). Stockage : variables d'environnement Coolify (web et Supabase sur le VPS), EAS (mobile). Jamais dans le dépôt. Les variables `NEXT_PUBLIC_*` et `EXPO_PUBLIC_*` sont publiques par nature : n'y mettre aucun secret.

## 3. Hébergement et déploiement ⬜ (ADR-013)

Cible : un VPS Contabo (datacenter UE), Docker, géré par **Coolify** (À CONFIRMER).

- **Préparation du serveur** : Ubuntu LTS, utilisateur non root, SSH par clé, ufw, fail2ban, unattended-upgrades (voir SECURITY.md §2.9).
- **Supabase auto-hébergé** : docker compose officiel, secrets régénérés, Studio accessible par tunnel SSH uniquement.
- **Web** : image Docker Next.js `standalone`, déployée par Coolify depuis le dépôt git (ou image construite localement tant qu'il n'y a pas de dépôt distant).
- **Base** : `supabase db push --db-url` à travers un tunnel SSH, staging puis production.
- **Edge functions** : copiées dans le volume `functions` du conteneur Edge Runtime.
- **Mobile** : `eas build` puis `eas submit` (service cloud d'Expo).
- **Domaine** : aucun pour l'instant ; DNS (enregistrements A vers l'IP du VPS) et certificats Let's Encrypt à configurer quand il sera acheté.

## 4. Sauvegarde et restauration ⬜

- `pg_dump` quotidien chiffré (age) + archive des volumes Storage, envoyés vers un stockage objet externe au VPS ; rétention 30 jours.
- Instantané du VPS avant toute mise à jour majeure.
- Procédure de restauration sur un serveur vierge, chronométrée, à documenter ici avec la date du dernier test.

## 5. Incidents ⬜

Contacts, accès d'urgence au VPS (console Contabo), désactivation de la marketplace (`platform_settings.marketplace_open = false`), rotation des clés, restauration, communication voyageurs.

## 6. Checklist de lancement ⬜ (Phase 7)

Inclut : domaine et HTTPS, déclaration CNDP, pages légales validées, sauvegarde restaurée avec succès, supervision active.
