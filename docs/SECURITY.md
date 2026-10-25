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
- 🟡 Tests pgTAP : isolation société A / B, rôles internes (gérant, chauffeur), colonnes admin, dernier propriétaire, profils, référentiels, admin sans MFA refusé (42 assertions, étape 4). Chauffeur / trajets et voyageur / réservations : Phases 2 et 3.
- ✅ Clé service role (`SUPABASE_SECRET_KEY`) uniquement côté serveur (`src/lib/supabase/admin.ts`, `server-only`), utilisée seulement pour la limitation des tentatives ; jamais dans l'app chauffeur ni dans une variable `NEXT_PUBLIC_` / `EXPO_PUBLIC_`.
- 🟡 Server Actions d'authentification : validation Zod côté serveur, langue et redirection validées (`safeNextPath`, anti redirection ouverte). Actions métier (rôle + appartenance) : Phase 2.
- 🟡 UUID sur toutes les tables créées ; références publiques aléatoires en Phase 3.

### 2.2 Authentification
- 🟡 Configuration locale (`supabase/config.toml`) : mot de passe de 10 caractères minimum avec minuscules, majuscules et chiffres, confirmation d'e-mail, ré-authentification pour changer de mot de passe. À reproduire sur le VPS. Écrans : étape 5.
- ✅ MFA TOTP : `is_platform_admin()` exige `aal2` (pgTAP), le layout admin redirige vers `/mfa` sans aal2 (E2E), enrôlement et vérification par Server Actions. Proposition aux propriétaires : backlog.
- ✅ Limitation des tentatives (Postgres, ADR-020) et Turnstile vérifié côté serveur sur connexion, inscription, mot de passe oublié. Recherche et réservation : Phase 3.
- ✅ Cookies de session `HttpOnly`, `SameSite=Lax`, `Secure` en production (aucun jeton lisible par le navigateur) ; session mobile dans SecureStore (trousseau iOS / keystore Android).

### 2.3 Application web
- ✅ HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (géolocalisation, caméra, micro, paiement désactivés), en-tête `X-Powered-By` supprimé : `apps/web/next.config.ts`, testés par Playwright.
- ✅ CSP stricte à nonce par requête (`src/proxy.ts`, `src/lib/security/csp.ts`), testée (unitaire + E2E).
- ⬜ Interdiction de `dangerouslySetInnerHTML` sur contenu utilisateur (règle ESLint).
- ⬜ CSRF natif des Server Actions conservé ; contrôle `Origin` sur route handlers sensibles.

### 2.4 Fichiers
- ⬜ Buckets privés `company-documents`, `receipts`, chemins `{company_id}/...`, URL signées courtes (60 s à 5 min).
- ⬜ Validation MIME réel (magic bytes), extension, taille max 10 Mo ; compression côté client.

### 2.5 Paiements (hors ligne, ADR-016)
- ⬜ Aucune donnée de carte (pas de paiement en ligne au lancement).
- ⬜ Confirmation d'un paiement voyageur réservée au transporteur (owner, manager, accountant) ; déclaration d'encaissement espèces par le chauffeur affecté uniquement ; enregistrement des règlements de relevés réservé à `platform_admin` ; tout est journalisé dans `audit_logs`.
- ⬜ Montants dus (commission, part transporteur) calculés côté serveur depuis les valeurs figées de la réservation, jamais lus depuis le client.
- ⬜ RIB des transporteurs : accès restreint, affiché au voyageur uniquement pour sa réservation confirmée.
- ⬜ Le jour où la carte en ligne arrive : vérification de signature des callbacks, idempotence, montant recalculé (exigences d'origine conservées).

### 2.6 Données personnelles (loi 09-08, CNDP)
- ⬜ Minimisation, consentement CGU / confidentialité, opt-in marketing séparé.
- ⬜ Pages légales fr / en / ar marquées `À VALIDER` (juriste).
- ⬜ Géolocalisation limitée aux trajets en cours, information du chauffeur, purge 90 jours.
- ⬜ Export et anonymisation de compte.
- ⬜ Déclaration CNDP du traitement et du transfert hors Maroc (VPS en UE, ADR-013) : reportée par Yassine, **à faire avant la mise en production**.

### 2.7 Secrets et chaîne d'approvisionnement
- 🟡 `.gitignore` excluant `.env*` (hors `.env.example`) : en place (Phase 0).
- 🟡 `.env.example` documenté : version initiale (Phase 0).
- ✅ Hook pre-commit gitleaks (fichiers indexés) ; historique analysé le 2026-10-25 : aucune fuite.
- 🟡 `pnpm audit` : 0 vulnérabilité non traitée au 2026-10-26 (zod forcé en version corrigée ; exception documentée pour node-forge, outil de dev Expo, ADR-020). Dependabot configuré, actif dès que le dépôt GitHub existe.
- ⬜ Logs sans PII ni jetons ; Sentry `beforeSend` filtrant.

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
| (aucun) | | |

Lancer `/audit-securite` pour produire un rapport dans `docs/sessions/`.
