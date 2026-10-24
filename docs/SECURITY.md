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
- ⬜ RLS sur toutes les tables, aucune politique permissive par défaut (Phase 1, puis chaque migration).
- ⬜ Tests pgTAP par politique : isolation société A / B, chauffeur limité à ses trajets, voyageur à ses réservations (Phase 1+).
- ⬜ `service_role` uniquement côté serveur (`src/lib/supabase/admin.ts` avec `import 'server-only'`).
- ⬜ Server Actions : session + rôle + appartenance + Zod ; `company_id` toujours déduit de la session / de l'appartenance, jamais du client.
- ⬜ UUID partout, références publiques aléatoires (anti-IDOR).

### 2.2 Authentification
- ⬜ Supabase Auth, politique de mot de passe forte, vérification e-mail.
- ⬜ MFA TOTP obligatoire `platform_admin` (contrôle `aal2` dans le layout admin et dans `is_platform_admin()`), proposée aux owners.
- ⬜ Rate limiting (connexion, inscription, réinitialisation, recherche, réservation) ; Turnstile sur formulaires publics.
- ⬜ Cookies `HttpOnly`, `Secure`, `SameSite=Lax` ; `expo-secure-store` sur mobile.

### 2.3 Application web
- ⬜ CSP stricte (nonces), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (géolocalisation et caméra désactivées sur le web).
- ⬜ Interdiction de `dangerouslySetInnerHTML` sur contenu utilisateur (règle ESLint).
- ⬜ CSRF natif des Server Actions conservé ; contrôle `Origin` sur route handlers sensibles.

### 2.4 Fichiers
- ⬜ Buckets privés `company-documents`, `receipts`, chemins `{company_id}/...`, URL signées courtes (60 s à 5 min).
- ⬜ Validation MIME réel (magic bytes), extension, taille max 10 Mo ; compression côté client.

### 2.5 Paiements
- ⬜ Page hébergée, aucune donnée carte.
- ⬜ Vérification signature / hash de chaque callback, idempotence (`provider_ref` et `idempotency_key` uniques), montant recalculé côté serveur.
- ⬜ Journal des transactions expurgé.

### 2.6 Données personnelles (loi 09-08, CNDP)
- ⬜ Minimisation, consentement CGU / confidentialité, opt-in marketing séparé.
- ⬜ Pages légales fr / en / ar marquées `À VALIDER` (juriste).
- ⬜ Géolocalisation limitée aux trajets en cours, information du chauffeur, purge 90 jours.
- ⬜ Export et anonymisation de compte.
- ⬜ Déclaration CNDP du traitement et du transfert hors Maroc (ADR-008) : **À VÉRIFIER**.

### 2.7 Secrets et chaîne d'approvisionnement
- 🟡 `.gitignore` excluant `.env*` (hors `.env.example`) : en place (Phase 0).
- 🟡 `.env.example` documenté : version initiale (Phase 0).
- ⬜ Hook pre-commit gitleaks, `pnpm audit` en CI, Dependabot.
- ⬜ Logs sans PII ni jetons ; Sentry `beforeSend` filtrant.

### 2.8 Sauvegarde et continuité
- ⬜ Sauvegardes Supabase, PITR en production payante.
- ⬜ Export pg_dump chiffré périodique vers stockage externe ; restauration testée (RUNBOOK).
- ⬜ Environnements local / staging / production séparés.

## 3. Audits

| Date | Portée | Rapport |
|---|---|---|
| (aucun) | | |

Lancer `/audit-securite` pour produire un rapport dans `docs/sessions/`.
