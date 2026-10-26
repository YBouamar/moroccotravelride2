# Runbook d'exploitation

> Statut : initial (Phase 0). Les procédures marquées ⬜ seront rédigées et **testées** au fil des phases (restauration testée en Phase 7 au plus tard).

## 1. Prérequis poste de développement

| Outil | Version | État constaté le 2026-10-24 |
|---|---|---|
| Node.js | 24 LTS | ✅ 24.22.1 |
| pnpm | 12.15.0 | ✅ installé via `npm i -g pnpm@12.15.0` (corepack demande des droits administrateur) |
| Docker Desktop | récent | ✅ 29.8.2 |
| Supabase CLI | 2.122.0 | ✅ dépendance du dépôt (`pnpm exec supabase`) |
| Git | récent | ✅ 2.56 |
| gitleaks | 8.30.1 | ✅ `winget install Gitleaks.Gitleaks` (redémarrer le terminal pour le PATH) |

### Supabase local

`pnpm db:start` puis : API `http://127.0.0.1:55321`, Studio `http://127.0.0.1:55323`, e-mails de test (Mailpit) `http://127.0.0.1:55324`, Postgres `postgresql://postgres:postgres@127.0.0.1:55322/postgres`. Clés locales affichées par `pnpm exec supabase status` (clés de démonstration publiques, jamais utilisées ailleurs). Arrêt : `pnpm db:stop`.

## 2. Variables d'environnement

Référence : [`.env.example`](../.env.example). Les variables `NEXT_PUBLIC_*` sont **intégrées au build** de Next.js : l'image Docker doit être construite avec les valeurs de l'environnement visé. En production : vraies clés Turnstile, `RATE_LIMIT_SALT` aléatoire (32 octets ou plus), SMTP de Supabase Auth configuré (Resend), modèles `supabase/templates` repris dans la configuration du Supabase auto-hébergé.

### App chauffeur en local

`pnpm --filter @mtr/driver dev` puis Expo Go (téléphone) ou un émulateur. L'app ne peut pas joindre `127.0.0.1` : dans `apps/driver/.env.local`, mettre `http://10.0.2.2:55321` (émulateur Android) ou l'IP du PC sur le réseau local (téléphone). Compte de test : driver.atlas@moroccotravelride.test.

Référence initiale : Stockage : variables d'environnement Coolify (web et Supabase sur le VPS), EAS (mobile). Jamais dans le dépôt. Les variables `NEXT_PUBLIC_*` et `EXPO_PUBLIC_*` sont publiques par nature : n'y mettre aucun secret.

## 3. Hébergement et déploiement 🟡 (ADR-013, ADR-038)

Cible : un VPS Contabo (datacenter UE), Docker, géré par **Coolify**. Fichiers prêts dans le dépôt, déploiement réel en attente du VPS, du domaine et des clés.

1. **Serveur** : Ubuntu LTS, utilisateur non root, SSH par clé uniquement (root et mot de passe désactivés), ufw (80, 443, SSH), fail2ban, unattended-upgrades (SECURITY.md §2.9).
2. **Coolify** installé sur le VPS ; tableau de bord accessible par tunnel SSH ou VPN, jamais exposé publiquement.
3. **Supabase auto-hébergé** : modèle Supabase de Coolify ; **tous les secrets régénérés** (JWT, clés anon et service role, mot de passe Postgres, identifiants du tableau de bord) ; Studio et Postgres non exposés ; reprendre la configuration Auth de `supabase/config.toml` (mot de passe 10 caractères avec minuscules, majuscules, chiffres, confirmation d'e-mail, modèles d'e-mails de `supabase/templates`, URL du site).
4. **Migrations** : `supabase db push --db-url <url>` à travers un tunnel SSH, d'abord sur staging, puis production ; ne jamais lancer le seed de démonstration en production.
5. **Web** : Coolify déploie `docker-compose.prod.yml` (image `apps/web/Dockerfile`, Next.js standalone, utilisateur non root, système de fichiers en lecture seule, contrôle de santé). Variables : `NEXT_PUBLIC_*` en arguments de build, secrets serveur (`SUPABASE_SECRET_KEY`, `RATE_LIMIT_SALT`, `TURNSTILE_SECRET_KEY`, `CRON_SECRET`, `BOOKING_LINK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`) dans les secrets Coolify. Le service `outbox-cron` vide la file d'e-mails toutes les 2 minutes.
6. **Journaux du proxy** : garder la rotation et une durée courte ; aucune donnée sensible attendue dans les URL (jeton de réservation dans le fragment, ADR-037).
7. **Mobile** : `eas build --profile production` puis `eas submit` (renseigner les vraies URL dans `apps/driver/eas.json`, comptes Google Play et App Store).
8. **Domaine** : enregistrements A vers l'IP du VPS, certificats Let's Encrypt par Coolify, `NEXT_PUBLIC_SITE_URL` mis à jour (liens d'e-mails, plan du site, URL canoniques).

Construction locale vérifiée le 2026-10-26 : image construite, conteneur en lecture seule servant les pages avec les en-têtes de sécurité, utilisateur non root.

## 4. Sauvegarde et restauration 🟡

- `scripts/backup.sh` (cron quotidien 02:15 UTC) : `pg_dump` + archive du volume Storage, chiffrés avec age (clé publique seule sur le serveur), envoyés par rclone vers un stockage objet **hors du VPS**, rétention 30 jours, sommes de contrôle.
- `scripts/restore.sh <horodatage>` : restauration sur un environnement **vierge** (refuse une base non vide sauf `FORCE=1`, demande une confirmation), vérification des sommes de contrôle.
- Instantané du VPS avant toute mise à jour majeure.
- **Date du dernier test de restauration : aucun pour l'instant** (à faire sur le VPS de staging, chronométré, puis noter la date ici).

## 5. Incidents

- **Couper la marketplace** : `update public.platform_settings set value = 'false' where key = 'marketplace_open';` (la recherche et la réservation s'arrêtent, le SaaS continue).
- **Clé compromise** : régénérer la clé dans Supabase ou le service concerné, mettre à jour le secret Coolify, redéployer ; pour `BOOKING_LINK_SECRET`, tous les liens de réservation deviennent invalides (prévenir les voyageurs concernés).
- **Restauration** : `scripts/restore.sh` sur un serveur vierge, puis bascule DNS.
- **Accès d'urgence** : console Contabo ; contacts et communication voyageurs à compléter.

## 6. Checklist de lancement

| Point | Statut |
|---|---|
| Domaine acheté, DNS et HTTPS | ⬜ Yassine |
| VPS de production et de staging préparés (§3), secrets Supabase régénérés | ⬜ Yassine |
| Migrations appliquées sur staging puis production, sans seed de démonstration | ⬜ |
| Compte administrateur créé, MFA activée, coordonnées de paiement saisies (Admin > Paramètres) | ⬜ Yassine |
| Clés réelles : Turnstile, Resend (domaine d'envoi vérifié), Sentry (DSN), `CRON_SECRET`, `BOOKING_LINK_SECRET` | ⬜ Yassine |
| Serveur de tuiles ou fournisseur de cartes (politique OpenStreetMap) | ⬜ |
| Déclaration CNDP (traitement, transfert hors Maroc) | ⬜ Yassine |
| Pages légales rédigées et validées par un juriste ; mentions de facture validées par un comptable (BR-109) | ⬜ Yassine |
| Sauvegarde quotidienne active et restauration testée (date ci-dessus) | ⬜ |
| Supervision : Sentry, contrôle de disponibilité externe, alertes disque et certificats | ⬜ |
| App chauffeur testée sur appareils réels, publiée (EAS) | ⬜ Yassine |
| Dépôt GitHub créé, CI activée, Dependabot actif | ⬜ Yassine |
| `pnpm check`, `pnpm db:test`, `pnpm e2e` verts sur le commit déployé | ✅ en local |

## Supabase local : « ports are not available » (Windows)

Après un redémarrage, Hyper-V peut réserver une plage de ports qui couvre ceux de Supabase local (55321 à 55324 depuis ADR-028, qui a déplacé les ports hors de la plage 54117 à 54616 réservée en octobre 2026). Vérification : `netsh interface ipv4 show excludedportrange protocol=tcp`. Correctif dans un PowerShell **administrateur** : `net stop winnat` puis `net start winnat`, puis `pnpm db:start`.
