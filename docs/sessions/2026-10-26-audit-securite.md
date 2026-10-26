# Audit de sécurité : 2026-10-26

Audit en lecture seule (aucune correction appliquée), demandé en début de Phase 7. Référentiel : [SECURITY.md](../SECURITY.md).

## Périmètre

- Base : 26 migrations (`supabase/migrations/`), 33 tables publiques, 20 fichiers pgTAP (223 assertions).
- Web : `apps/web/src` (Server Actions, route handlers `app/api/**`, proxy, CSP, en-têtes), après les étapes 8 à 27.
- App chauffeur : `apps/driver` (session, file hors ligne, localisation, envoi de justificatifs).
- Secrets et dépendances : historique git complet, `pnpm audit --prod`.

Commandes lancées : `pnpm db:test` (223 / 223 sur base fraîche), `gitleaks detect` (aucune fuite, 2,2 Mo d'historique), `pnpm audit --prod` (1 vulnérabilité haute déjà analysée et ignorée : node-forge, outil de dev Expo, ADR-020), recherches ciblées (`grep`) citées ci-dessous.

## Résumé

Aucun constat critique ni haut. Le socle est solide : RLS sur les 33 tables, règles métier sensibles appliquées en base (triggers et fonctions `security definer`), clé service role confinée au serveur, MFA admin exigée en base et dans l'interface, CSP à nonce, aucun puits XSS, aucune fuite de secret. Cinq constats moyens et huit bas, surtout de la couverture de tests et des durcissements prévus en Phase 7 (supervision, limitation de la recherche, contrôle du contenu des justificatifs envoyés par l'app chauffeur).

## Constats

| # | Gravité | Constat | Preuve | Recommandation |
|---|---|---|---|---|
| 1 | Moyenne | Justificatifs envoyés par l'app chauffeur : type réel non vérifié côté serveur (seul le `Content-Type` déclaré est filtré par le bucket), alors que le dépôt web lit les premiers octets. | `apps/driver/src/lib/device-queue.ts:41-45`, bucket `supabase/migrations/20261029090000_expenses.sql:129-131` | Faire passer le dépôt chauffeur par une route serveur qui appelle `detectDocumentType` (comme `features/expenses/actions.ts:47-53`), ou une Edge Function qui valide puis déplace le fichier. |
| 2 | Moyenne | Règle 8 : quatre tables sans test pgTAP dédié à leurs politiques : `booking_events`, `credit_notes`, `commission_statement_payments`, `plan_features`. | aucune mention dans `supabase/tests/database/` (recherche `public.<table>`) | Ajouter un test de lecture par rôle et d'écriture refusée pour chacune (les fonctions qui les alimentent sont, elles, testées). |
| 3 | Moyenne | Recherche publique sans limitation de débit : `search_offers` est appelable par les anonymes sans plafond (moissonnage des prix, charge). | `supabase/migrations/20261028090000_price_grids_and_search.sql:57-95`, `apps/web/src/app/[locale]/(public)/search/page.tsx` | Limiter par IP au niveau du proxy inverse (Traefik / Coolify) ou dans la page (`consumeRateLimit('search-ip', ...)`), et mettre la page en cache court. |
| 4 | Moyenne | Supervision des erreurs absente : Sentry n'est pas branché, donc pas de filtre `beforeSend` (PII) ni d'alerte. | aucune occurrence de `sentry` dans `apps/web/src` et `package.json` | Brancher Sentry (DSN à fournir) avec `beforeSend` qui retire e-mails, téléphones, jetons d'URL (`?t=`) et cookies. |
| 5 | Moyenne | Jeton du lien magique dans la chaîne de requête (`/booking/{ref}?t=...`) : il peut finir dans les journaux d'accès du proxy inverse et l'historique du navigateur. Les fuites par `Referer` sont bloquées (`strict-origin-when-cross-origin`). | `apps/web/src/features/booking/notify.ts:13-22`, `apps/web/next.config.ts:8` | Masquer `t` dans les journaux d'accès du VPS, ou échanger le jeton contre un cookie de courte durée à la première visite. |
| 6 | Basse | `expenses.receipt_path` accepte tout chemin du dossier de la société : un membre peut rattacher le fichier d'un autre dépôt de sa société. | contrainte `supabase/migrations/20261029090000_expenses.sql:20` | Imposer `{company_id}/{client_ref ou id}.ext` ou vérifier `storage.objects.owner_id` dans le trigger `guard_expense`. |
| 7 | Basse | RIB du transporteur lisible par tous les membres actifs, y compris le rôle chauffeur (politique de lecture des sociétés). | `supabase/migrations/20261028100000_bookings.sql` (colonnes `bank_name`, `bank_rib`), politique de lecture `companies` (membres) | Restreindre via une vue ou déplacer le RIB dans une table lisible par propriétaire, gérant et comptable. |
| 8 | Basse | Deux fichiers pgTAP dépendent de l'état de la base : ils échouent après une passe E2E qui laisse des relevés (`15_commission_statements`, `19_pilotage`). | échec reproduit puis succès après `pnpm db:reset` | Restreindre les assertions aux identifiants créés par le test (comme les autres fichiers). |
| 9 | Basse | Pas de règle ESLint interdisant `dangerouslySetInnerHTML` (aucun usage aujourd'hui). | recherche sans résultat dans `apps/web/src` et `apps/driver` | Activer `react/no-danger` en erreur. |
| 10 | Basse | Route handlers en GET avec cookies `SameSite=Lax` (exports CSV) : une navigation intersite peut les déclencher ; le contenu reste illisible pour un tiers. | `apps/web/src/app/api/export/[entity]/route.ts`, `apps/web/src/app/api/admin/export/[entity]/route.ts` | Contrôler `Sec-Fetch-Site` / `Origin` (même origine) sur ces routes. |
| 11 | Basse | La recherche publique renvoie l'identifiant interne des sociétés (`company_id`). | `supabase/migrations/20261028090000_price_grids_and_search.sql:63-71` | Acceptable (nécessaire aux notes) ; à défaut, renvoyer un identifiant public dédié. |
| 12 | Basse | Tuiles OpenStreetMap appelées depuis le navigateur du bureau : la zone consultée est connue du fournisseur ; politique d'usage à respecter (À VÉRIFIER). | `apps/web/src/lib/map.ts:6-8` | Serveur de tuiles ou fournisseur contractuel avant le lancement (BACKLOG P1). |
| 13 | Basse | Un journal d'erreur transmet l'objet d'erreur complet du vidage de la file d'e-mails (peut contenir une adresse dans un message d'erreur du fournisseur). | `apps/web/src/features/booking/notify.ts:90` | Ne journaliser que le message ou un code. |

## Mesures conformes

- **RLS** : les 33 tables publiques ont `enable row level security` et au moins une politique (test `00_rls_enabled`) ; `using (true)` uniquement sur les référentiels publics : villes, types de véhicules, paramètres, offres (`20261025210000_reference_data.sql:37-38`, `20261025210200_platform_settings.sql:19`, `20261026100000_subscriptions.sql:122-124`). Écritures sensibles fermées aux rôles API et passées par des fonctions qui vérifient rôle, offre et état (factures, avoirs, paiements, réservations, relevés, positions, avis).
- **Service role** : uniquement dans des modules `server-only` ou `'use server'` (`lib/supabase/admin.ts`, `lib/security/rate-limit.ts`, `lib/email/outbox.ts`, `features/booking/*`, `features/bookings/actions.ts`, `features/reviews/actions.ts`) ; absente de `apps/driver` et de toute variable `NEXT_PUBLIC_` / `EXPO_PUBLIC_`. Fonctions invité (`create_booking`, `cancel_booking_by_traveler`, `submit_review`, `booking_notification_recipients`) révoquées pour `anon` et `authenticated`.
- **Server Actions** : société toujours lue dans la session (`getCompanyContext`), jamais dans l'entrée ; identifiants validés par `z.uuid()` ; schémas Zod partagés. Seule exception : `company_id` envoyé par l'app chauffeur (`device-queue.ts:52`), couvert par la RLS (`has_role` sur la société) et le trigger qui impose le chauffeur courant.
- **Auth** : `is_platform_admin()` exige `aal2` (pgTAP) ; layout admin et exports admin vérifient `aal2` (`admin/layout.tsx:27`, `api/admin/export/[entity]/route.ts:28`) ; limitation des tentatives sur connexion, MFA, inscription, mot de passe oublié, réservation, annulation, avis, dépôts ; Turnstile sur les formulaires publics et la réservation ; cookies HttpOnly ; carte en direct rafraîchie par le serveur pour ne pas exposer de jeton.
- **En-têtes** : HSTS 2 ans, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (`apps/web/next.config.ts:7-15`) ; CSP à nonce avec `strict-dynamic`, origines limitées (Supabase, Turnstile, tuiles) et `worker-src blob:` (`src/lib/security/csp.ts`).
- **XSS** : aucun `dangerouslySetInnerHTML`, `eval` ni `innerHTML` ; e-mails construits avec échappement systématique (`lib/email/templates.ts`) ; CSV protégés contre l'injection de formules (`packages/shared/src/lists.ts`).
- **Fichiers** : buckets privés `company-documents` et `expense-receipts`, chemins préfixés par la société imposés par les politiques, liens signés de 5 minutes, type réel et taille contrôlés pour les dépôts web.
- **Paiements (hors ligne)** : prix, taux, commission et part transporteur figés en base à la création (`create_booking`) ; confirmations réservées aux rôles prévus ; relevés enregistrés par l'admin MFA ; jamais de montant lu depuis le client ; aucune donnée de carte.
- **Données personnelles** : positions acceptées seulement pour le trajet en cours du chauffeur (`record_driver_locations`, pgTAP), purge à 90 jours, positions illisibles par le comptable ; avis publiés avec le prénom seulement ; file d'e-mails purgée à 90 jours ; journaux applicatifs limités à des codes d'erreur.
- **Secrets** : `.env` et `.env.*` ignorés (seul `.env.example` suivi), gitleaks en pre-commit et sur tout l'historique, `CRON_SECRET` comparé à temps constant, lien magique HMAC comparé à temps constant.

## Suite proposée

Corriger 1 à 5 avant la mise en production (étapes 28 à 30), 6 à 13 au fil de l'eau. Aucune correction n'a été faite pendant cet audit.
