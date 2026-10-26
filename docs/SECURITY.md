# Sécurité

Légende : ✅ en place · 🟡 partiel · ⬜ à faire (phase prévue).

## 1. Matrice de permissions (référence)

Implémentée dans `packages/shared/src/permissions.ts` (UI) et **doublée par les politiques RLS** (sécurité réelle). L'UI n'est jamais un contrôle d'accès.

| Ressource / action | owner | manager | dispatcher | accountant | driver | traveler | platform_admin |
|---|---|---|---|---|---|---|---|
| Société : lire | ✔ | ✔ | ✔ | ✔ | nom seul | vue publique | ✔ |
| Société : modifier infos | ✔ | ✔ | | | | | ✔ (statut, commission) |
| Membres : gérer | ✔ | sauf owners | | | | | ✔ |
| Abonnement : gérer | ✔ | | | | | | ✔ |
| Véhicules, chauffeurs, clients | ✔ | ✔ | ✔ lecture + affectation | lecture | | | lecture |
| Trajets / planning | ✔ | ✔ | ✔ | lecture | ses trajets, statut | | lecture |
| Réservations marketplace (transporteur) | ✔ | ✔ | ✔ accepter / refuser | lecture | | | ✔ |
| Factures, paiements, avoirs | ✔ | ✔ | | ✔ | | | lecture |
| Dépenses | ✔ | ✔ valider | | ✔ valider | ses dépenses (créer) | | lecture |
| Localisation | ✔ lecture | ✔ lecture | ✔ lecture | | écrire pendant `in_progress` | | |
| Parc V3 | ✔ | ✔ | lecture | ✔ coûts | | | lecture |
| Ses réservations voyageur | | | | | | ✔ | ✔ |
| Paramètres plateforme, reversements | | | | | | | ✔ (MFA) |

## 2. État des mesures

### 2.1 Accès aux données
- ✅ RLS sur toutes les tables existantes (testé : aucune table publique sans RLS ni sans politique) ; à maintenir à chaque migration.
- ✅ Tests pgTAP : 237 assertions (isolation, rôles, offres, trajets, factures, réservations, relevés, dépenses, positions, V3, avis). Tests dédiés ajoutés pour `booking_events`, `credit_notes`, `commission_statement_payments`, `plan_features`, fichiers isolés des données des autres suites (corrections de l'audit 2026-10-26).
- ✅ Clé service role (`SUPABASE_SECRET_KEY`) uniquement côté serveur (modules `server-only` / `'use server'`) : limitation des tentatives, parcours invité vérifié par Turnstile ou lien magique signé, file d'e-mails ; jamais dans l'app chauffeur ni dans une variable `NEXT_PUBLIC_` / `EXPO_PUBLIC_` (audit 2026-10-26).
- ✅ Server Actions et route handlers : validation Zod, identifiants `z.uuid()`, société lue dans la session (jamais dans l'entrée), rôle vérifié puis revérifié par la RLS ; redirections validées (`safeNextPath`). Seul `company_id` venant d'un client : l'app chauffeur, couverte par la RLS et le trigger des dépenses.
- ✅ UUID sur toutes les tables ; références publiques aléatoires `MTR-XXXXXX` sans caractères ambigus (BR-013).

- ✅ Journal d'audit en ajout seul (triggers, aucune écriture directe possible, testé), sans donnée sensible ; lecture admin et propriétaire.
- ✅ Modifications d'abonnement réservées à l'admin MFA (RLS, testé).

### 2.2 Authentification
- 🟡 Configuration locale (`supabase/config.toml`) : mot de passe de 10 caractères minimum avec minuscules, majuscules et chiffres, confirmation d'e-mail, ré-authentification pour changer de mot de passe. À reproduire sur le VPS. Écrans : étape 5.
- ✅ MFA TOTP : `is_platform_admin()` exige `aal2` (pgTAP), le layout admin redirige vers `/mfa` sans aal2 (E2E), enrôlement et vérification par Server Actions. Proposition aux propriétaires : backlog.
- ✅ Limitation des tentatives (Postgres, ADR-020) et Turnstile vérifié côté serveur sur connexion, inscription, mot de passe oublié, réservation ; limites aussi sur annulation, avis, dépôts, ouverture de lien de réservation et recherche publique (60 par minute et par IP).
- ✅ Cookies de session `HttpOnly`, `SameSite=Lax`, `Secure` en production (aucun jeton lisible par le navigateur) ; session mobile dans SecureStore (trousseau iOS / keystore Android).

### 2.3 Application web
- ✅ HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (géolocalisation, caméra, micro, paiement désactivés), en-tête `X-Powered-By` supprimé : `apps/web/next.config.ts`, testés par Playwright.
- ✅ CSP stricte à nonce par requête (`src/proxy.ts`, `src/lib/security/csp.ts`), testée (unitaire + E2E).
- 🟡 Aucun `dangerouslySetInnerHTML`, `eval` ni `innerHTML` dans le code (audit 2026-10-26) ; e-mails échappés ; ⬜ règle ESLint `react/no-danger` à activer.
- 🟡 CSRF natif des Server Actions conservé ; route `/api/cron/emails` protégée par secret partagé comparé à temps constant ; ⬜ contrôle `Origin` / `Sec-Fetch-Site` sur les exports CSV (audit 2026-10-26, constat 10).

### 2.4 Fichiers
- ✅ Buckets privés `company-documents` et `expense-receipts`, chemins `{company_id}/...` imposés par les politiques Storage (testé), liens signés de 5 minutes.
- ✅ Type réel détecté par les premiers octets, taille 10 Mo vérifiée côté serveur (et par le bucket), 20 dépôts par heure et par utilisateur, pour le web comme pour l'app chauffeur (route `/api/driver/receipts`, le chauffeur n'écrit plus directement dans le bucket et ne rattache que son propre fichier). ⬜ Compression des images côté client (backlog).

### 2.5 Paiements (hors ligne, ADR-016)
- ✅ Aucune donnée de carte (pas de paiement en ligne au lancement).
- ✅ Confirmation d'un paiement ou d'un remboursement voyageur réservée au transporteur (owner, manager, accountant) ; règlements de relevés enregistrés par l'admin MFA ; historique dans `booking_events` et `audit_logs`. ⬜ Déclaration d'encaissement espèces par le chauffeur depuis l'app (BACKLOG).
- ✅ Prix, taux, commission et part transporteur figés en base à la création (`create_booking`), jamais lus depuis le client (pgTAP : 800 MAD donnent 160 / 640).
- 🟡 RIB des transporteurs affiché au voyageur uniquement sur sa réservation confirmée (lien magique) ; ⬜ encore lisible par tous les membres de la société, chauffeurs compris (audit 2026-10-26, constat 7).
- ⬜ Le jour où la carte en ligne arrive : vérification de signature des callbacks, idempotence, montant recalculé (exigences d'origine conservées).

### 2.6 Données personnelles (loi 09-08, CNDP)
- ⬜ Minimisation, consentement CGU / confidentialité, opt-in marketing séparé.
- ⬜ Pages légales fr / en / ar marquées `À VALIDER` (juriste).
- ✅ Géolocalisation limitée au trajet en cours du chauffeur (contrôle en base, pgTAP), information dans la demande d'autorisation de l'app, purge quotidienne à 90 jours (durée légale À VÉRIFIER).
- ⬜ Export et anonymisation de compte.
- ⬜ Déclaration CNDP du traitement et du transfert hors Maroc (VPS en UE, ADR-013) : reportée par Yassine, **à faire avant la mise en production**.

### 2.7 Secrets et chaîne d'approvisionnement
- ✅ `.gitignore` excluant `.env*` (hors `.env.example`) ; aucun fichier d'environnement suivi (audit 2026-10-26).
- ✅ `.env.example` documenté (Supabase, Turnstile, Resend, Sentry, lien magique, cron).
- ✅ Hook pre-commit gitleaks (fichiers indexés) ; historique complet analysé le 2026-10-26 : aucune fuite.
- 🟡 `pnpm audit` : 0 vulnérabilité non traitée au 2026-10-26 (zod forcé en version corrigée ; exception documentée pour node-forge, outil de dev Expo, ADR-020). Dependabot configuré, actif dès que le dépôt GitHub existe.
- 🟡 Journaux applicatifs limités à des codes d'erreur ; Sentry branché avec `beforeSend` filtrant (`src/lib/monitoring/scrub.ts`, testé), ⬜ DSN à fournir ; jeton du lien de réservation hors des URL vues par le serveur (fragment puis cookie HttpOnly).

### 2.8 Sauvegarde et continuité (auto-hébergement, ADR-013)
- ⬜ Pas de sauvegarde managée : `pg_dump` quotidien chiffré + sauvegarde des volumes Storage vers un stockage objet **hors du VPS**, rétention 30 jours.
- ⬜ Instantané (snapshot) du VPS avant chaque mise à jour majeure.
- ⬜ Restauration testée sur un environnement vierge, date du dernier test dans RUNBOOK.md.
- ⬜ Environnements local / staging / production séparés (bases et secrets distincts).

### 2.9 Serveur (VPS Contabo)
- ⬜ Accès SSH par clé uniquement, connexion root et mot de passe désactivés, port non standard facultatif, fail2ban.
- ⬜ Pare-feu (ufw) : seuls 80 / 443 (et SSH) ouverts ; Postgres, Studio Supabase et Coolify **jamais exposés publiquement** (accès par tunnel SSH ou VPN).
- ⬜ Mises à jour de sécurité automatiques (unattended-upgrades) ; montée de version Supabase planifiée et testée en staging.
- ⬜ Secrets Supabase auto-hébergé régénérés (JWT secret, clés anon et service_role, mot de passe Postgres, identifiants du tableau de bord) : **jamais les valeurs d'exemple du docker compose**.
- ⬜ Supervision : disponibilité (healthcheck externe), espace disque, mémoire, expiration des certificats.

## 3. Audits

| Date | Portée | Rapport |
|---|---|---|
| 2026-10-26 | Base (RLS, fonctions), web (actions, routes, en-têtes, CSP), app chauffeur, secrets, dépendances, après les étapes 8 à 27 : 0 critique, 0 haut, 5 moyens, 8 bas ; constats 1 à 6, 8 et 13 corrigés le même jour | [2026-10-26-audit-securite.md](sessions/2026-10-26-audit-securite.md) |

Lancer `/audit-securite` pour produire un rapport dans `docs/sessions/`.
