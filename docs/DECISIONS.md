# Journal des décisions (ADR)

Format court. On ne supprime jamais une décision : on la marque `REMPLACÉE PAR ADR-XXX`.
Statuts : **ACCEPTÉE**, **À CONFIRMER** (hypothèse par défaut appliquée en attendant Yassine), **REMPLACÉE**.

---

## ADR-001 : Flux de paiement marketplace

- **Date** : 2026-10-24 · **Statut** : REMPLACÉE PAR ADR-012
- **Contexte** : le voyageur paie en ligne. Deux modèles : (a) la plateforme encaisse tout puis reverse 80 % ; (b) le transporteur encaisse directement et la plateforme lui facture sa commission.
- **Décision par défaut** : (a) encaissement par la plateforme, reversements périodiques (`carrier_payouts`, `commission_ledger`).
- **Alternatives** : (b) paiement direct ; (c) split de paiement natif chez le prestataire (rarement disponible au Maroc, À VÉRIFIER avec CMI).
- **Conséquences** : (a) peut constituer un **encaissement pour compte de tiers**, potentiellement soumis à un statut réglementé (établissement de paiement, Bank Al-Maghrib) et a des effets fiscaux (TVA sur le montant total ou sur la commission). **À faire valider par un juriste / expert-comptable avant la mise en production.** Le code isole ce choix : `PaymentProvider` (technique) + `SettlementStrategy` (`platform_collects | direct_to_carrier`) côté métier, pour basculer sans réécrire le tunnel.

## ADR-002 : Acceptation des réservations par le transporteur

- **Date** : 2026-10-24 · **Statut** : ACCEPTÉE (Yassine, 2026-10-25)
- **Décision par défaut** : après paiement, statut `pending_carrier` avec échéance `accept_deadline = now() + 2 h` (paramétrable). Refus ou échéance dépassée : `cancelled_by_carrier`, file admin pour réaffectation ou remboursement. Une tâche pg_cron détecte les échéances dépassées.
- **Alternatives** : confirmation instantanée (transporteur engagé par sa grille) ; diffusion à plusieurs transporteurs (premier qui accepte).
- **Conséquences** : délai d'incertitude pour le voyageur (communiqué clairement) ; nécessite des notifications rapides au transporteur. Si la réservation est à 24 h, l'échéance de 2 h reste compatible.

## ADR-003 : Tarification par grille

- **Date** : 2026-10-24 · **Statut** : À CONFIRMER
- **Décision par défaut** : `price_grids` (company, ville départ, ville arrivée, type de véhicule, prix en centimes). Pas de prix au km, pas de majoration nuit / week-end dans le MVP.
- **Conséquences** : simple, prévisible, suffisant pour les transferts aéroport et axes inter-villes. Les suppléments (nuit, bagages hors gabarit, sièges enfant) vont au backlog.

## ADR-004 : Politique d'annulation voyageur

- **Date** : 2026-10-24 · **Statut** : ACCEPTÉE (Yassine, 2026-10-25), y compris le partage de la somme retenue au prorata du taux de commission
- **Décision par défaut** : plus de 48 h avant : remboursement 100 % ; entre 48 h et 24 h : 50 % ; moins de 24 h : 0 %. Seuils et pourcentages dans `platform_settings.cancellation_policy` (JSON versionné), figés sur la réservation à sa création.
- **Question liée** : la commission est-elle conservée par la plateforme en cas d'annulation partiellement remboursée ? Défaut proposé : la somme retenue est partagée selon le même taux de commission.

## ADR-005 : Encaissement des abonnements SaaS

- **Date** : 2026-10-24 · **Statut** : ACCEPTÉE (Yassine, 2026-10-25) : essai gratuit de 14 jours sur l'offre V2
- **Décision par défaut** : facture d'abonnement générée, paiement par virement, activation manuelle par l'admin. Essai gratuit proposé : 14 jours (À CONFIRMER). Paiement récurrent en ligne : phase ultérieure (backlog).

## ADR-006 : Montants en centimes et arrondis

- **Date** : 2026-10-24 · **Statut** : ACCEPTÉE (règle d'arrondi À CONFIRMER)
- **Décision** : tous les montants en `bigint` centimes. Taux stockés en `numeric(5,4)` (ex. 0.2000). Commission arrondie au centime le plus proche (arrondi bancaire non retenu, half-up). La part transporteur est toujours `total - commission`.
- **Implémentation (2026-10-25)** : côté TypeScript, montants en `number` entiers sûrs (`Number.isSafeInteger`) et taux en **points de base entiers** (20 % = 2000 bps = `numeric` 0.2000 en base) ; produit intermédiaire calculé en `bigint`. Voir `packages/shared/src/money.ts`.

## ADR-007 : TVA paramétrable

- **Date** : 2026-10-24 · **Statut** : ACCEPTÉE (Yassine, 2026-10-25) : TVA paramétrable sans valeur imposée ; taux réels À VÉRIFIER par un comptable
- **Décision par défaut** : taux par défaut défini par société, surchargeable par ligne ; calcul et arrondi par ligne. Aucun taux codé en dur. Les taux applicables (transport touristique, commission plateforme, abonnement SaaS) sont à faire valider par un expert-comptable.

## ADR-008 : Région d'hébergement et transfert de données (CNDP)

- **Date** : 2026-10-24 · **Statut** : REMPLACÉE PAR ADR-013
- **Contexte** : Supabase et Vercel n'ont pas de région au Maroc. Héberger en UE (ex. Francfort `eu-central-1` ou Paris `eu-west-3`) constitue un **transfert de données hors du Maroc**, à déclarer / autoriser auprès de la CNDP (loi 09-08). Démarches et délais : À VÉRIFIER.
- **Décision par défaut** : région UE la plus proche (Paris `eu-west-3` si disponible côté Supabase, sinon Francfort), Vercel fonctions en `cdg1` (Paris). Déclaration CNDP à prévoir avant la production.
- **Alternatives** : hébergeur marocain (perte des services managés, contraire à la contrainte « fondateur solo »).

## ADR-009 : Monorepo pnpm + Turborepo, Next.js App Router, Supabase

- **Date** : 2026-10-24 · **Statut** : ACCEPTÉE (imposée par le cadrage) ; partie hébergement (Vercel, Supabase managé) REMPLACÉE PAR ADR-013
- **Décision** : stack de la section 4 du cadrage. Versions relevées le 2026-10-24 dans [ARCHITECTURE.md](ARCHITECTURE.md), à figer en Phase 1 après test de compatibilité.
- **Point d'attention (résolu le 2026-10-25)** : TypeScript 7.0.2 est la dernière stable, mais typescript-eslint 8.72 exige `typescript < 6.1`. TypeScript est donc figé en **6.0.3** ; montée en 7.x quand typescript-eslint la supportera (Dependabot le signalera).

## ADR-010 : Identité visuelle et accessibilité des couleurs

- **Date** : 2026-10-24 · **Statut** : ACCEPTÉE ; partie logos REMPLACÉE PAR ADR-014 ; complétée par ADR-018 (bandeau, anneau de focus)
- **Contexte** : palette de la présentation de marque. Mesures de contraste (WCAG 2.1) : bleu nuit sur blanc 14,64 ; turquoise profond sur blanc 4,81 ; turquoise profond sur fond clair 4,50 ; **turquoise clair sur blanc 2,52 (échec)** ; blanc sur turquoise clair 2,52 (échec) ; bleu nuit sur turquoise clair 5,80.
- **Décision** :
  - Bouton d'action principal : fond `accent` #21B6A8 + **texte bleu nuit** #102A43 (5,80, AA).
  - Bouton secondaire / liens : `secondary` #087E8B ; texte blanc sur `secondary` (4,81, AA texte normal). Liens `secondary` sur `background` uniquement en taille ≥ 16 px (4,50 limite).
  - `accent` jamais utilisé comme couleur de texte sur fond clair ; usage autorisé en texte sur fond bleu nuit (5,80) et en éléments décoratifs (icônes ≥ 3:1 non requis pour la décoration, bordures actives).
  - Logos : fichiers fournis utilisés tels quels comme sources dans `assets/brand/` ; variantes dérivées générées en Phase 1 (favicon carré, icônes d'app, tailles web).
- **Conséquences** : les fichiers fournis ont un fond blanc opaque (pas de transparence) : utilisables sur fond clair uniquement. Pour l'en-tête sombre et le mode sombre, une version à fond transparent (idéalement SVG) est demandée (question Q8).

## ADR-011 : Emplacement des visuels de marque

- **Date** : 2026-10-24 · **Statut** : REMPLACÉE PAR ADR-014
- **Décision** : les sources sont déplacées de la racine vers `assets/brand/` (`logo_horiz.png`, `logo_vertical.png`, `favicon.png`, `presentation-marque.png`). Elles ne sont jamais modifiées ; les dérivés (redimensionnés, recadrés) sont générés par script en Phase 1 vers `apps/web/public/brand/` et `apps/driver/assets/`.
- **Usage** : logo horizontal = en-têtes web (marketplace, SaaS, admin), e-mails, PDF ; logo vertical = pages d'authentification, onboarding, splash mobile, bon de réservation ; favicon = favicon web, icône PWA, icône et adaptive icon de l'app chauffeur, avatar par défaut, notifications.

## ADR-012 : Modes de paiement marketplace (hors ligne) et compensation

- **Date** : 2026-10-25 · **Statut** : REMPLACÉE PAR ADR-016
- **Contexte** : Yassine retient deux modes de paiement pour le voyageur, sans carte bancaire en ligne au lancement.
- **Décision** :
  1. **Virement bancaire** sur l'un des comptes bancaires **du transporteur** : le transporteur reçoit 100 % et **doit 20 %** (commission figée) à la plateforme.
  2. **Espèces** : la plateforme reçoit 100 % et **doit 80 %** (part transporteur figée) au transporteur.
- **Modélisation** :
  - `bookings.payment_method` : `bank_transfer_to_carrier | cash_to_platform` (+ `online_card` réservé pour plus tard).
  - `bookings.payment_status` indépendant du statut de réservation : `unpaid | paid | partially_refunded | refunded`. Le paiement est **déclaré puis confirmé** par l'encaisseur (transporteur pour le virement, admin pour les espèces), avec référence et justificatif facultatif.
  - Chaque réservation payée écrit une ligne dans `commission_ledger` avec le sens de la dette (`carrier_owes_platform` ou `platform_owes_carrier`) et le montant.
  - **Compensation périodique** (défaut : mensuelle, À CONFIRMER) : un relevé `carrier_settlements` par transporteur calcule le solde net (80 % des espèces moins 20 % des virements) ; selon le signe, la plateforme vire au transporteur ou lui facture le solde.
  - Comptes bancaires du transporteur (RIB) stockés sur la société, affichés au voyageur après acceptation de la réservation.
- **Points À CONFIRMER** (questions Q11 à Q13 de PROGRESS.md) : à qui et quand le voyageur remet-il les espèces ; à quel moment le virement doit être reçu ; paiement par carte en ligne abandonné ou seulement reporté.
- **Défauts appliqués en attendant** : la réservation est confirmée par le transporteur **sans prépaiement** ; virement attendu avant la prise en charge ; espèces remises le jour du trajet ; carte en ligne **reportée** (l'abstraction `PaymentProvider` reste en place avec l'adaptateur mock, CMI au backlog).
- **Conséquences** :
  - Le tunnel de réservation ne redirige plus vers une page de paiement : il se termine par une demande de réservation et les instructions de paiement.
  - Risque de **non-présentation** (no-show) sans prépaiement et risque de **recouvrement** des 20 % : à surveiller (indicateurs en Phase 6).
  - La politique d'annulation (ADR-004) ne s'applique en remboursement que si un paiement a déjà été reçu.
  - La plateforme qui reçoit des espèces pour le compte du transporteur reste un cas d'encaissement pour compte de tiers : À VÉRIFIER avec un juriste / expert-comptable.

## ADR-013 : Hébergement sur un VPS Contabo (auto-hébergement)

- **Date** : 2026-10-25 · **Statut** : ACCEPTÉE (Yassine, 2026-10-25), y compris Coolify ; dossier CNDP reporté par Yassine
- **Contexte** : Yassine héberge sur un VPS Contabo au lieu de Vercel et de Supabase managé.
- **Décision proposée** : tout sur le VPS en conteneurs Docker :
  - **Supabase auto-hébergé** (docker compose officiel : Postgres, Auth, Storage, Realtime, Edge Runtime, Studio). Le code applicatif ne change pas : mêmes clients, mêmes migrations, même CLI en local.
  - **Next.js** en mode `standalone` dans une image Docker.
  - **Coolify** (PaaS open source) pour les déploiements, les certificats HTTPS (Let's Encrypt), les variables d'environnement et les sauvegardes planifiées vers un stockage objet externe. Alternative plus légère : docker compose + Caddy, déployé à la main.
  - Datacenter Contabo **UE** (latence correcte vers le Maroc) ; transfert hors Maroc à déclarer plus tard à la CNDP.
  - Builds mobiles : EAS (service cloud d'Expo) inchangé, ce n'est pas de l'hébergement.
- **Alternatives** : Supabase managé + VPS pour le web seulement (moins d'exploitation, mais Yassine a choisi le VPS) ; Postgres seul sans Supabase (réécriture de l'auth, du stockage et du temps réel : rejeté).
- **Conséquences** :
  - L'exploitation devient notre responsabilité : mises à jour système et Supabase, pare-feu, SSH par clé, fail2ban, supervision, **sauvegardes et restauration** (pas de PITR managé). Ces points passent dans RUNBOOK.md et SECURITY.md.
  - Dimensionnement minimal du VPS (Supabase complet + Next.js) : À VÉRIFIER au moment de la commande (ordre de grandeur : 8 Go de RAM ou plus).
  - Staging : second jeu de conteneurs sur le même VPS ou un petit VPS séparé (À CONFIRMER plus tard).

## ADR-014 : Kit de logos officiel et typographie

- **Date** : 2026-10-25 · **Statut** : ACCEPTÉE (kit) ; police À CONFIRMER
- **Décision** :
  - Sources officielles : `assets/brand/logos/` (`svg/`, `png/`, `favicon/`), fournies par Yassine, vectorielles et transparentes. Les fichiers de la v1 (`logo_horiz.png`, `logo_vertical.png`, `favicon.png`, fond blanc) sont archivés dans `assets/brand/v1/` et ne sont plus utilisés.
  - Variantes : `couleur` (fond clair), `negatif` (fond sombre : symbole en couleur, « Morocco » en blanc), `blanc` (monochrome blanc, sur photo ou dégradé), `symbole` (sans texte), `icone_app` (`navy` ou `blanc`, angles arrondis), favicons 32 / 180 / 192 / 512 et `favicon.ico`.
  - SVG utilisés en priorité sur le web (net à toutes les tailles, léger) ; PNG pour l'app mobile, les e-mails et les PDF.
  - **Police** : le texte des SVG est vectorisé, le nom de la police n'est donc pas lisible dans les fichiers. Par comparaison des formes (M à jambages droits, « a » à deux étages, « R » à jambe droite, capitales géométriques espacées), le mot-symbole correspond très probablement à **Montserrat** (SemiBold / Bold) et la signature à Montserrat Medium. Choix : **Montserrat** pour les titres, **Inter** pour le texte courant, **Noto Sans Arabic** pour l'arabe ; toutes sous licence libre (SIL OFL), auto-hébergées.

## ADR-015 : Contrôles qualité sans dépôt GitHub distant

- **Date** : 2026-10-25 · **Statut** : ACCEPTÉE (Yassine, 2026-10-25) : dépôt privé **GitHub** (confirmé), créé avant la Phase 2 ; accès de Claude via le serveur MCP GitHub (jeton personnel saisi par Yassine) et push via Git Credential Manager
- **Contexte** : pas de dépôt GitHub pour l'instant, donc pas de GitHub Actions.
- **Décision par défaut** : le workflow CI est écrit dès l'étape 2 (prêt à servir), et les mêmes contrôles tournent en local : script `pnpm check` (lint, typecheck, tests, build) et hook pre-commit (gitleaks, lint des fichiers modifiés).
- **Recommandation** : créer un dépôt **privé** (GitHub ou GitLab, gratuit) avant la Phase 2. Il sert aussi de **sauvegarde hors site du code**, aujourd'hui présent sur un seul poste, et Coolify peut déployer directement depuis ce dépôt.

## ADR-016 : Le transporteur encaisse dans les deux modes de paiement

- **Date** : 2026-10-25 · **Statut** : ACCEPTÉE (Yassine, 2026-10-25) ; remplace ADR-012
- **Contexte** : précisions de Yassine sur le paiement en espèces et le virement.
- **Décision** :
  1. **Virement** : le voyageur vire sur un compte bancaire du transporteur, **avant le trajet**.
  2. **Espèces** : le voyageur paie **le chauffeur** pendant le trajet ; le chauffeur remet l'argent au dirigeant de la société de transport.
  3. Dans les deux cas, **le transporteur encaisse 100 %** et doit la commission figée (20 % par défaut) à la plateforme.
  4. **Fin de mois** : un relevé de commissions par transporteur ; le dirigeant règle la plateforme **en espèces ou par virement instantané**. L'admin enregistre le règlement.
  5. Paiement par carte en ligne **reporté** (formalités administratives) ; l'abstraction `PaymentProvider` reste en place avec l'adaptateur mock.
- **Modélisation** :
  - `bookings.payment_method` : `bank_transfer` | `cash_to_driver` (+ `online_card` réservé pour plus tard) ; `payment_status` : `unpaid | paid | partially_refunded | refunded`, indépendant du statut de réservation.
  - `booking_payments` : paiement **confirmé par le transporteur** (owner, manager ou accountant ; pour les espèces, le chauffeur peut déclarer l'encaissement depuis l'app V2, le transporteur valide).
  - `commission_ledger` : une ligne `carrier_owes_platform` par réservation payée (le sens `platform_owes_carrier` est conservé pour le futur paiement en ligne).
  - `commission_statements` (remplace `carrier_settlements`) : relevé mensuel par transporteur, statut `draft | issued | paid | overdue`, règlements enregistrés (`cash | instant_transfer | bank_transfer`, référence, date).
  - Une réservation terminée dont le paiement n'a pas été confirmé apparaît en alerte chez le transporteur et chez l'admin (risque de commission non déclarée).
- **Conséquences** :
  - La plateforme ne reçoit jamais l'argent du voyageur : la question de l'**encaissement pour compte de tiers disparaît** au lancement. Restent À VÉRIFIER : facturation de la commission au transporteur (facture mensuelle de la plateforme, TVA) et plafonds légaux de paiement en espèces.
  - La politique d'annulation (ADR-004) s'applique au remboursement par le transporteur s'il a déjà reçu un virement ; la commission due suit le prorata.
  - Risque principal : **commissions non déclarées** ou impayées. Mesures : rapprochement réservations terminées / paiements confirmés, relances automatiques du relevé, suspension marketplace (`marketplace_enabled = false`) si relevé impayé (15 jours après l'échéance, paramétrable, validé par Yassine le 2026-10-25).

## ADR-017 : Outillage du monorepo (étape 2)

- **Date** : 2026-10-25 · **Statut** : ACCEPTÉE
- **Décision** : dépendances de développement à la racine, versions exactes (pas de `^`) pour des builds reproductibles, mises à jour proposées par Dependabot :
  - `turbo` : orchestration et cache des tâches lint / typecheck / test / build (imposé par le cadrage).
  - `typescript` 6.0.3 : voir ADR-009.
  - `eslint`, `@eslint/js`, `typescript-eslint`, `globals`, `eslint-config-prettier` : lint (interdiction de `any`, imports de types cohérents) sans conflit avec Prettier. ESLint ramené de 10.13 à **9.39.5** le 2026-10-26 (ADR-020).
  - `prettier` : formatage unique.
  - `vitest` : tests unitaires (imposé par le cadrage).
  - `@types/node` 24 : types de la version de Node utilisée.
  - `husky` + `lint-staged` : hook pre-commit (gitleaks puis lint et formatage des seuls fichiers modifiés), indispensable tant qu'il n'y a pas de CI distante (ADR-015).
  - `supabase` (CLI) : base locale, migrations, tests pgTAP, génération de types ; installé dans le dépôt pour que la version soit la même partout.
- **Outils système** : pnpm 12.15.0 (installé par `npm i -g`, corepack nécessitant des droits administrateur sur ce poste) ; gitleaks 8.30.1 (winget).
- **Paquets internes** (`@mtr/shared`, `@mtr/db`, `@mtr/ui`, `@mtr/payments`) : exportent directement leurs sources TypeScript, sans étape de build ; Next.js (`transpilePackages`) et Metro les compileront. Moins de configuration pour un développeur seul.

## ADR-018 : Application web (étape 3)

- **Date** : 2026-10-25 · **Statut** : ACCEPTÉE
- **Dépendances ajoutées** (`apps/web`, versions exactes) :
  - `next` 16.4.3, `react` / `react-dom` 19.3.1 : imposés par le cadrage ; `output: 'standalone'` pour l'image Docker du VPS.
  - `next-intl` 4.14.9 : i18n fr / en / ar, préfixe de langue dans l'URL, détection de la langue du navigateur, clés typées depuis `fr.json`.
  - `tailwindcss` / `@tailwindcss/postcss` 4.3.3 : styles, branchés sur les variables CSS générées par `@mtr/ui` (`theme.css`).
  - `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot` : socle des composants façon shadcn/ui (copiés dans `src/components/ui`, pas de dépendance à une bibliothèque de composants).
  - `lucide-react` : icônes (imposé par le cadrage).
  - `eslint-config-next` : règles Next.js, React, accessibilité (jsx-a11y).
  - `@playwright/test` 1.64.1 : E2E, avancé de l'étape 5 pour vérifier le RTL et l'absence de débordement mobile ; utilise Edge installé en local, Chromium en CI.
- **Choix techniques** :
  - Thème : `packages/ui/theme.css` est généré depuis `tokens.ts` et vérifié par un instantané Vitest ; une seule source pour les couleurs (web, mobile, PDF, e-mails).
  - Logos : copiés depuis `assets/brand/logos/` par `scripts/copy-brand.mjs` avant `dev` et `build` ; les copies sont ignorées par git.
  - Polices auto-hébergées par `next/font` (téléchargées au build, aucun appel à Google à l'exécution) ; l'arabe bascule sur Noto Sans Arabic via `:root[dir='rtl']`.
  - Scripts d'installation refusés (`allowBuilds` dans `pnpm-workspace.yaml`) pour `@parcel/watcher`, `@swc/core`, `unrs-resolver` : leurs binaires précompilés suffisent.
  - Composants dialogue et toast reportés à l'étape 5 (premiers formulaires).
- **Accessibilité, corrections issues des tests de contraste** (complète ADR-010) :
  - Le texte bleu nuit sur le dégradé turquoise n'atteint que 3,05 : le bandeau d'accueil est sur fond bleu nuit, texte blanc (14,64), bouton turquoise clair à texte bleu nuit (5,80). Le dégradé reste décoratif.
  - L'anneau de focus utilise le turquoise profond (4,81 sur blanc) et non le turquoise clair (2,52, sous le minimum de 3:1 des composants d'interface).

## ADR-019 : Socle base de données et RLS (étape 4)

- **Date** : 2026-10-25 · **Statut** : ACCEPTÉE (sauf points À CONFIRMER ci-dessous)
- **Décisions** :
  - Fonctions de sécurité (`is_member`, `has_role`, `is_platform_admin`, `shares_company`) dans un schéma `private` non exposé par l'API, en `security definer` avec `search_path` vide : elles lisent les appartenances sans récursion RLS et ne sont pas appelables en RPC.
  - `is_platform_admin()` exige `aal2` (MFA validée dans la session) : un admin connecté sans MFA n'a aucun droit d'admin.
  - Règles par colonne impossibles en RLS (statut, visibilité marketplace et commission d'une société ; validation des documents ; drapeau admin d'un profil) : **triggers de garde** qui refusent la modification par les rôles API non admin.
  - Une société se crée uniquement par la fonction `create_company`, qui crée la société (`pending`) et son propriétaire en une transaction ; aucune insertion directe.
  - Une société garde toujours au moins un propriétaire actif (trigger).
  - Données de référence (villes, aéroports, types de véhicules) et paramètres plateforme dans les **migrations** (nécessaires en production), `seed.sql` réservé aux données de démonstration.
  - Paramètres en points de base (`default_commission_bps` = 2000), validés par Zod (`@mtr/shared`, nouvelle dépendance `zod` 4.6.7, imposée par le cadrage).
  - Auth locale durcie : MFA TOTP activée, mot de passe de 10 caractères minimum avec minuscules, majuscules et chiffres, confirmation d'e-mail obligatoire, ré-authentification pour changer de mot de passe.
- **À CONFIRMER** :
  - ~~`marketplace_enabled` réservé à l'admin~~ : tranché par Yassine (Q19, 2026-10-25), voir ADR-020.
  - Capacités indicatives des types de véhicules (berline 3, 4x4 4, van 7, minibus 17, autocar 50) : **validées** par Yassine (Q20, 2026-10-25).

## ADR-020 : Authentification, sécurité web et squelette de l'app chauffeur (étape 5)

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE
- **Visibilité marketplace (Q19)** : le transporteur (propriétaire ou gérant) active ou désactive lui-même `marketplace_enabled` ; la suspension (`marketplace_suspended_at`, `marketplace_suspension_reason`) est réservée à l'admin et seul l'admin peut la lever. Visible sur la marketplace = `verified` + `marketplace_enabled` + non suspendu.
- **Authentification web entièrement côté serveur** : Server Actions et route handler, cookies de session `HttpOnly`, `SameSite=Lax`, `Secure` en production ; aucun client Supabase dans le navigateur. Conséquence : le futur suivi en direct (Phase 4) passera par un jeton transmis par le serveur ou un client navigateur dédié (à décider alors).
- **`src/proxy.ts`** (Next.js 16) : nonce CSP par requête, rafraîchissement de session, redirection vers la connexion pour `/app`, `/admin`, `/mfa`, `/reset-password` ; contrôles fins (appartenance, admin + MFA) dans les layouts, RLS comme garde réelle.
- **CSP stricte** : scripts uniquement avec nonce (`strict-dynamic`), `frame-ancestors 'none'`, `object-src 'none'` ; `style-src 'unsafe-inline'` accepté (styles injectés par Next.js et next/font, sans exécution de code).
- **Anti-abus** : Cloudflare Turnstile vérifié côté serveur sur connexion, inscription et mot de passe oublié (clés de test en local, refus systématique en production sans clé) ; **limitation des tentatives dans Postgres** (`consume_rate_limit`, fenêtres fixes, sujets salés et hachés, refus si la vérification échoue) plutôt qu'Upstash : pas de service externe de plus sur le VPS. Limites : connexion 20 / 15 min par IP et 8 / 15 min par e-mail, inscription 5 / h par IP, mot de passe oublié 5 / h par IP, MFA 10 / 15 min par utilisateur. Supabase Auth garde ses propres limites.
- **Inscription transporteur** : compte créé avec la société en métadonnées ; la société est créée par `create_company` (statut `pending`) à la première requête connectée après confirmation de l'e-mail. Réponses identiques que l'adresse existe ou non (pas d'énumération de comptes).
- **E-mails d'authentification** : modèles trilingues (`supabase/templates`, langue des métadonnées) pointant vers `/api/auth/confirm` (jeton à usage unique). Ils seront remplacés par Resend + React Email (crochet d'envoi Supabase) en Phase 3. Le texte de ces modèles est hors des fichiers i18n (exception documentée à la règle 5).
- **MFA admin** : enrôlement TOTP et vérification par Server Actions ; la page `/mfa` est réservée aux admins pour l'instant (proposition aux propriétaires : backlog).
- **App chauffeur** : Expo SDK 58 (React 19.3.0, React Native 0.88), expo-router ; session dans SecureStore découpée en morceaux (limite Android d'environ 2 Ko par entrée) ; accès réservé aux membres actifs de rôle `driver` ; i18next + react-i18next, RTL appliqué par le style `direction` de la vue racine (bascule en arabe sans redémarrage) ; icône, écran de démarrage et logos lus directement dans le kit officiel.
- **Dépendances ajoutées** : web : `@supabase/supabase-js`, `@supabase/ssr`, `react-hook-form`, `@hookform/resolvers`, `zod`, `server-only` ; chauffeur : `expo` et modules Expo (router, secure-store, localization, splash-screen, constants, linking, status-bar, system-ui), `react-native`, `react-native-safe-area-context`, `react-native-screens`, `@supabase/supabase-js`, `i18next`, `react-i18next` ; partagé : `zod`. Toutes imposées ou induites par le cadrage.
- **Hygiène des dépendances** : ESLint 9.39.5 (les plugins de `eslint-config-next` ne déclarent pas encore ESLint 10) ; `react-dom` aligné sur React 19.3.0 dans l'app chauffeur ; zod forcé en 4.6.7 partout (version corrigée ; `@expo/cli` tirait une 3.x vulnérable) ; exception d'audit documentée pour **node-forge** (GHSA-86w9-cpqp-85rv) : outil de développement Expo uniquement (signature de code d'Expo Updates, non utilisée), jamais embarqué dans l'app, aucune version corrigée publiée. À réexaminer à chaque mise à jour d'Expo.

## ADR-021 : Abonnements, verrouillage des fonctions et journal d'audit (étape 6)

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE (points À CONFIRMER signalés)
- **Offres en base** : `plans` (Standard 150 MAD, V2 400 MAD, V3 sur devis = prix `null`) et `plan_features` (chaque offre inclut la précédente : 6 fonctions Standard, 4 de plus en V2, 3 de plus en V3). Lecture publique (page de comparaison), écriture admin.
- **Un abonnement par société** (`subscriptions`, clé = `company_id`), créé par trigger à la création de la société avec l'essai défini dans `platform_settings.saas_trial` (14 jours V2). Seul l'admin le modifie (activation manuelle après virement, ADR-005) ; tout changement est audité.
- **`private.has_feature(company, feature)`** : vrai si l'offre contient la fonction et que l'abonnement est `active` ou `past_due`, ou `trial` non expiré. Servira de garde RLS aux tables V2 / V3. Même règle en TypeScript (`isSubscriptionUsable`, testée) pour l'affichage.
- **Interface** : sections hors offre visibles mais verrouillées (cadenas + offre requise, lien vers la page Abonnement, BR-104) ; composant `<FeatureGate>` pour les pages ; bandeaux « essai : X jours restants » et « essai ou abonnement terminé ».
- **Journal d'audit** (`audit_logs`) : en ajout seul, alimenté uniquement par triggers (`private.audit_changes`) sur sociétés (statut, visibilité, suspension, commission, raison sociale, ICE), abonnements, membres et validation des documents ; seules les colonnes réellement modifiées sont stockées, sans donnée sensible. Lecture : admin (tout), propriétaire (sa société).
- **Back-office** : vue d'ensemble chiffrée, liste des sociétés filtrable par statut, fiche société (vérifier / suspendre / remettre en attente, suspension marketplace avec motif, commission spécifique en %, abonnement, historique traduit). Actions sensibles derrière une confirmation explicite (`<dialog>` natif).
- **Points tranchés** par Yassine le 2026-10-26 (Q21 à Q23) : voir ADR-022, qui remplace les défauts initialement appliqués.

## ADR-022 : Lecture seule, délai de grâce et coordonnées de paiement (Q21 à Q23)

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE (Yassine)
- **Q21, lecture seule** : un essai ou un abonnement terminé (essai expiré, `cancelled`) rend la société **en lecture seule** : ses données restent consultables, rien ne peut être créé ni modifié. Convention pour toutes les tables du SaaS : politiques **SELECT** = appartenance seule ; **INSERT / UPDATE / DELETE** = appartenance + `private.has_feature()` (qui signifie désormais « accès en écriture »). Interface : bandeau « lecture seule », `canWrite` dans le contexte société pour désactiver les actions.
- **Q22, paiement en retard** : un abonnement `past_due` garde l'accès complet pendant **15 jours** (`platform_settings.subscription_grace_days`, modifiable par l'admin) à partir de `past_due_since` (renseigné par trigger). Ensuite `has_feature` refuse l'écriture et une tâche **pg_cron quotidienne** (02:15 UTC) passe l'abonnement en `cancelled`. Bandeau « Paiement en retard : X jours avant la résiliation ».
- **Q23, coordonnées de paiement** : banque, titulaire, RIB (24 chiffres), e-mail et téléphone de la plateforme dans `platform_settings.subscription_payment_info`, saisis par l'admin dans la nouvelle page **Paramètres** (qui règle aussi le délai de grâce) et affichés sur la page Abonnement des transporteurs. Ces données sont destinées aux clients : lisibles publiquement comme les autres paramètres.

## ADR-023 : Onboarding transporteur, véhicules, chauffeurs et documents (étape 7)

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE (points À CONFIRMER signalés)
- **Assistant en 4 étapes** (`/app/onboarding`) : informations de la société, agrément et documents, premier véhicule, premier chauffeur. L'avancement est **calculé** à partir des données (aucun indicateur stocké) par `onboardingProgress` (`@mtr/shared`, testé). Carte de rappel sur le tableau de bord tant que ce n'est pas terminé. Réservé au propriétaire et au gérant.
- **Tables `vehicles` et `drivers`** créées dès maintenant (nécessaires à l'onboarding ; listes complètes à l'étape 8), avec la convention RLS d'ADR-022. Les chauffeurs sont lisibles par les rôles de bureau (propriétaire, gérant, dispatcheur, comptable) et par le chauffeur lui-même ; un compte lié doit appartenir à la même société. Immatriculation normalisée (majuscules, espaces simples), unique par société, lettres latines ou arabes admises.
- **Lecture seule (Q21)** : les informations de la société et les documents restent modifiables même en lecture seule (indispensables pour être vérifié et souscrire) ; véhicules et chauffeurs exigent un abonnement valide.
- **Documents** : bucket privé `company-documents`, un dossier par société (`{company_id}/...`), 10 Mo maximum, PDF / JPEG / PNG / WEBP. Dépôt par Server Action : **type réel détecté par les premiers octets** (jamais l'extension ni le type annoncé par le navigateur), taille vérifiée, 20 dépôts par heure et par utilisateur, fichier supprimé si l'enregistrement en base échoue. Seuls les documents en attente peuvent être supprimés. L'admin consulte un document par **lien signé valable 5 minutes**, puis l'approuve ou le refuse avec un motif (visible par le transporteur) ; dépôts et décisions sont audités.
- **Configuration Next.js** : `experimental.serverActions.bodySizeLimit` et `experimental.proxyClientMaxBodySize` à 11 Mo (le proxy met aussi le corps des requêtes en tampon).
- **Q24 tranchée** (Yassine, 2026-10-26) : champs obligatoires confirmés ; les dates expirées **ne sont plus refusées** à la saisie, voir ADR-024.

## ADR-024 : Documents expirés et dates au fuseau marocain

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE (Yassine pour la règle métier)
- **Règle (Q24)** : un agrément ou un permis de conduire expiré est **accepté à la saisie** et signalé par un avertissement. **Un chauffeur ne peut pas effectuer de prestation sans permis valide** le jour du trajet : `canDriverPerformTrip` (`@mtr/shared`, testé) sera appliqué à l'affectation des trajets (étape 9), côté serveur et en base. Une société à l'agrément expiré n'apparaît pas sur la marketplace (BR-016).
- **Fuseau horaire** : les données de fuseau (tz database, 2026e) montrent que le Maroc **alterne entre UTC+0 et UTC+1** selon la période (le 26 octobre 2026 est en UTC+0, juillet 2026 en UTC+1). Aucun décalage n'est donc écrit en dur : `casablancaDate()` (date du jour au Maroc) et `casablancaEndOfDay()` (fin de journée marocaine en UTC) s'appuient sur `Africa/Casablanca`. Corrigé au passage : la fin d'essai saisie par l'admin utilisait `+01:00` en dur. Les serveurs et les images Docker doivent garder des données de fuseau à jour (Node et Postgres embarquent les leurs).

## ADR-025 : Listes du SaaS (étape 8)

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE
- **Recherche, filtres, tri et pagination côté serveur**, pilotés par l'URL (`?q=&status=&sort=&page=`) via un simple formulaire GET : fonctionne sans JavaScript, liens partageables, bouton retour du navigateur respecté. 20 lignes par page (`PAGE_SIZE`), tri par liste blanche de colonnes.
- **Recherche sûre** : `likePattern` (`@mtr/shared`, testé) échappe `%`, `_` et `\\` et retire les séparateurs de filtres PostgREST (`,`, parenthèses) avant l'`ilike`.
- **Export CSV** (`/api/export/{vehicles|drivers|clients}`) : mêmes filtres que la page, société lue dans la session, requête faite avec le client RLS de l'utilisateur, séparateur `;` et BOM UTF-8 (Excel en français, arabe), protection contre l'injection de formules (cellules commençant par `= + - @` préfixées d'une apostrophe), 5 000 lignes au plus, `Cache-Control: private, no-store`.
- **Pas de suppression physique** : véhicule actif / en maintenance / inactif, chauffeur et client actif / inactif, après confirmation explicite. L'historique (trajets, factures) reste intact.
- **Clients** : B2B (agence, hôtel) avec ICE facultatif mais vérifié (15 chiffres) et B2C (particulier, sans ICE). Le dispatcheur peut gérer les clients (il en crée en saisissant des trajets), pas la flotte ni les chauffeurs.
- **Seed** : 3 véhicules, 2 chauffeurs (dont un au permis expiré) et 3 clients pour Atlas. Les UUID fixes respectent la variante RFC 4122 (`8`, `9`, `a` ou `b`), sinon `z.uuid()` les refuse.

## ADR-026 : Trajets, planning et conflits (étape 9)

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE
- **Les règles vivent en base** (trigger `private.check_trip`), l'interface ne fait que les refléter :
  - machine à états BR-113 : `planned` et `assigned` suivent l'affectation (chauffeur **et** véhicule renseignés = affecté), puis `in_progress`, `completed` ; annulation (avec motif) depuis tout état ouvert ; un trajet terminé ou annulé est verrouillé ;
  - **permis (Q24)** : chauffeur actif avec un permis valide le jour du trajet (date marocaine du départ), **jamais dérogeable** ;
  - véhicule en maintenance ou inactif : refusé ;
  - **conflits BR-114** : chauffeur ou véhicule déjà pris sur un créneau qui se chevauche (intervalles semi-ouverts, trajets annulés et terminés ignorés) ou passagers au-delà des places : bloquant, sauf dérogation cochée par un **propriétaire ou gérant** avec un motif. Le dispatcheur ne peut pas déroger (42501). La dérogation, son auteur et son motif sont dans le journal d'audit ;
  - un verrou consultatif par société sérialise les contrôles pour que deux affectations simultanées ne passent pas toutes les deux.
- **Codes d'erreur métier** : SQLSTATE `MT001` à `MT006` levés par le trigger, traduits par `fromDbError` en messages i18n.
- **Heures** : saisies en heure du Maroc (`datetime-local`), converties en UTC par `casablancaLocalToUtc` (décalage lu deux fois pour rester exact autour d'un changement d'heure), affichées avec le fuseau `Africa/Casablanca`.
- **Planning** : vue semaine (7 colonnes, empilées sur mobile) et vue jour (une ligne par chauffeur, les trajets non affectés en premier), navigation par l'URL. Liste des trajets filtrable par texte, statut et période.
- **Prix** : saisi en MAD (`800` ou `800,50`), converti en centimes sans passer par un nombre flottant (`parseMoneyInput`).
- **Tests e2e** : les connexions de toute la suite viennent de 127.0.0.1 ; le helper de test remet à zéro les compteurs `login-*` avant chaque connexion, les limites de production restent inchangées.

## ADR-027 : Facturation, avoirs et paiements (étape 10)

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE (points À CONFIRMER / À VÉRIFIER signalés)
- **Numérotation (BR-107)** : attribuée à l'émission par `public.issue_invoice`, format `AAAA-NNNNNN` par société et par année (format À CONFIRMER). Le compteur est une ligne verrouillée jusqu'à la fin de la transaction : deux émissions simultanées attendent leur tour et une émission annulée rend son numéro, donc ni trou ni doublon. Supprimer un brouillon ne consomme aucun numéro.
- **Immutabilité (BR-108)** : une facture émise ne peut plus changer (trigger, `MT007`), ses lignes non plus ; seuls le statut de paiement et le montant encaissé évoluent. Jamais de suppression d'une facture émise (RLS : brouillons seulement, trigger en seconde barrière).
- **Avoir** : avoir **total** uniquement dans le MVP (série `AV-AAAA-NNNNNN`), qui passe la facture à `cancelled`. Avoirs partiels : BACKLOG. Un avoir reste possible sur une facture déjà payée ; le remboursement éventuel se fait hors plateforme (À CONFIRMER).
- **Mentions (BR-109)** : ICE, IF, RC et adresse du vendeur obligatoires pour émettre (`MT009`), ICE obligatoire pour un client B2B (`MT010`), TP et agrément imprimés s'ils existent. Ces informations sont **figées** dans la facture à l'émission. Liste exhaustive des mentions légales : **À VÉRIFIER** avec un comptable.
- **TVA (BR-110, BR-111, ADR-007)** : taux choisi ligne par ligne, prérempli par un taux par défaut que la société saisit elle-même (aucune valeur imposée). Calcul et arrondi au centime supérieur à partir de 0,5 **par ligne**, totaux = somme des lignes, récapitulatif par taux. Même calcul en base (trigger) et dans `@mtr/shared` (testé).
- **Facturer des trajets** : les trajets terminés pas encore portés sur une facture vivante (brouillon ou émise) sont proposés, une ligne par trajet au prix convenu ; ceux d'une facture annulée par avoir redeviennent facturables.
- **Paiements** : virement, espèces, chèque, autre ; jamais au-delà du reste à payer ni sur une facture non émise (`MT008`), date non future ; le statut passe à partiellement payée puis payée. Un paiement saisi par erreur peut être supprimé (journalisé). Rôles : propriétaire, gérant, comptable.
- **PDF** : `@react-pdf/renderer` 4.9.0 (dépendance prévue dans la stack, CLAUDE.md) : génération côté serveur sans navigateur headless, adaptée à un VPS modeste et à une maintenance solo. Le document est celui du transporteur (ses mentions, MoroccoTravelRide seulement en pied de page). Polices intégrées Helvetica : PDF en français ou en anglais ; l'interface arabe reçoit un PDF français (PDF arabe avec police intégrée et mise en page RTL : BACKLOG). Les brouillons portent un filigrane.

## ADR-028 : Ports de Supabase en local (553xx)

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE
- **Contexte** : sous Windows, Hyper-V réserve dynamiquement des plages de ports ; après un redémarrage, la plage 54117 à 54616 couvrait les ports par défaut de Supabase local (54321 à 54324) et `pnpm db:start` échouait. Le correctif (`net stop winnat`) demande les droits administrateur.
- **Décision** : ports locaux déplacés de 543xx à **553xx** dans `supabase/config.toml` (API 55321, Postgres 55322, Studio 55323, Mailpit 55324). `.env.example`, les helpers E2E et la documentation suivent. Sur le poste de Yassine, `apps/web/.env.development.local` et `.env.production.local` (non commités) surchargent l'URL ; à terme, mettre `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321` dans `apps/web/.env.local` et adapter `EXPO_PUBLIC_SUPABASE_URL` de l'app chauffeur.
- **Production** : sans effet (Supabase auto-hébergé sur le VPS avec sa propre configuration).

## ADR-029 : Tableau de bord du jour et recette de la Phase 2 (étape 11)

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE (seuils À CONFIRMER)
- **Contenu selon le rôle** (même matrice que la RLS) : trajets du jour et nombre de trajets à affecter sur les 7 prochains jours (rôles trajets), reste à encaisser et factures en retard (propriétaire, gérant, comptable), alertes (permis expirés ou expirant sous 30 jours, agrément de la société expiré ou expirant sous 60 jours, véhicules en maintenance). Chaque indicateur mène à la page où l'on agit. Le chauffeur est renvoyé vers l'app chauffeur.
- **Seuils** : 30 jours pour les permis, 60 jours pour l'agrément (À CONFIRMER ; ils deviendront des réglages avec les échéances de la Phase 5).
- **Recette Phase 2** : scénario E2E de bout en bout (trajet planifié et affecté, démarré, terminé, facturé avec la TVA choisie, émis avec numéro, payé) en plus des scénarios par domaine.
- **Affichage** : heures au format 24 h dans les cartes de trajet (en arabe, les marqueurs matin et soir se mélangeaient aux chiffres latins).

## ADR-030 : Grilles tarifaires et recherche publique (étapes 12 et 13)

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE (BR-008 reste À CONFIRMER)
- **Grille** : un prix tout compris par transporteur, départ, arrivée et type de véhicule (villes et aéroports traités comme des lieux). Option « créer aussi le retour au même prix ». Un prix est désactivé, jamais supprimé ; les réservations gardent leur prix figé.
- **Indépendance du SaaS** : la marketplace (pilier A) ne dépend pas de l'abonnement SaaS : un transporteur en lecture seule côté SaaS reste visible s'il remplit BR-016.
- **Éligibilité BR-016** en base (`private.is_marketplace_eligible`) : société vérifiée, visibilité activée, aucune suspension, agrément valide à la date marocaine, interrupteur global `marketplace_open`. Page « Marketplace » du transporteur : liste des conditions remplies ou manquantes et interrupteur de visibilité (Q19).
- **Recherche** : `public.search_offers` (security definer, autorisée aux anonymes, jamais d'accès direct aux tables) : offres actives des transporteurs éligibles qui ont un véhicule actif du type avec assez de places ; rien si la prise en charge est à moins de `min_booking_lead_hours` (BR-006, vérifié aussi côté page et à la réservation). 50 résultats au plus, triés par prix. Formulaire GET sans JavaScript, recherche partageable par l'URL ; même ville au départ et à l'arrivée autorisée (BR-007).
- **Accueil** : la page devient dynamique (lecture des lieux et des réglages) ; rendu statique : BACKLOG (Phase 7, SEO).

## ADR-031 : Réservation invité, acceptation et conversion en trajet (étapes 14 et 15)

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE (points À CONFIRMER signalés)
- **Tunnel invité (BR-014)** : sans compte ; Turnstile et 10 réservations par heure et par IP ; le serveur appelle `create_booking` avec le rôle service (jamais d'écriture anonyme directe). La fonction revérifie l'offre, l'éligibilité, le véhicule et le délai de 24 h, puis **fige** prix, taux (taux du transporteur sinon défaut plateforme), commission, part transporteur et politique d'annulation (BR-003). Critère de la Phase 3 vérifié en pgTAP et en E2E : 800 MAD donnent 160 MAD de commission et 640 MAD pour le transporteur.
- **Lien magique** : `/booking/{ref}?t=...`, jeton HMAC-SHA256 (référence, e-mail, expiration 30 jours après la prise en charge), comparé à temps constant, sans recherche en base pour rejeter un faux lien ; même message pour une référence inconnue et un lien invalide. Clé : `BOOKING_LINK_SECRET`, ou dérivée de `RATE_LIMIT_SALT` avec un libellé distinct.
- **Acceptation (BR-010)** : propriétaire, gérant ou dispatcheur, avant `accept_deadline` (2 h, paramétrable) ; l'acceptation crée le trajet (`origin = marketplace`, durée estimée choisie par le transporteur) qui apparaît au planning (BR-015). Refus avec motif. Sans réponse : annulation automatique (pg_cron toutes les 5 minutes, motif `expired`). Réaffectation par l'admin : supervision (étape 17).
- **Le trajet pilote la réservation** : affecté, en cours, terminé, annulé se répercutent ; un trajet terminé inscrit la commission au registre (`commission_ledger`).
- **Paiement hors ligne (ADR-016)** : virement (le RIB du transporteur est montré au voyageur une fois la réservation acceptée) ou espèces au chauffeur ; le propriétaire, le gérant ou le comptable confirme l'encaissement.
- **Annulation voyageur (BR-011)** : jusqu'au démarrage du trajet ; palier selon les heures restantes ; si rien n'a été payé, annulation sans frais ; si payé, remboursement selon le palier, part retenue partagée au taux figé (commission inscrite au registre), remboursement fait hors plateforme puis confirmé par le transporteur (À CONFIRMER).
- **E-mails** : file `email_outbox` (rôle service seulement), envoi après la réponse et reprise par `/api/cron/emails` (secret partagé `CRON_SECRET`, à planifier sur le VPS) ; API Resend par `fetch` sans dépendance ; sans clé, les e-mails restent « ignorés » dans la file (développement, tests). Modèles HTML simples traduits et échappés ; React Email : BACKLOG.

## ADR-032 : Relevés mensuels de commissions et supervision (étapes 16 et 17)

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE (échéance À CONFIRMER)
- **Registre** : chaque trajet marketplace terminé inscrit sa commission figée ; une annulation payée inscrit la commission sur la part retenue (ADR-031).
- **Relevé mensuel (BR-009b)** : généré le 1er du mois pour le mois précédent (mois marocain, pg_cron), ou à la main par l'admin depuis « Relevés de commissions » ; idempotent. Échéance : fin du mois + `statement_due_days` (10 jours, nouveau réglage, À CONFIRMER).
- **Règlement** : en espèces ou par virement instantané à la plateforme (coordonnées de la page Paramètres admin, Q23, montrées au transporteur dans « Commissions ») ; l'admin enregistre le paiement, partiel ou total, jamais au-delà du dû.
- **Retard et suspension (BR-009d, Q17)** : relevé non réglé après l'échéance : « en retard » ; `statement_suspension_days` (15 jours) plus tard, la visibilité marketplace est suspendue avec le motif ; seul l'admin la lève depuis la fiche société (Q19).
- **Supervision des réservations (étape 17)** : liste admin de toutes les réservations, filtrable par statut, avec le contact du voyageur pour proposer un autre transporteur après un refus ou une expiration. Réaffectation assistée (nouvelle réservation chez un autre transporteur en un clic) : BACKLOG.

## ADR-033 : Dépenses (étape 18, V2)

- **Date** : 2026-10-26 · **Statut** : ACCEPTÉE
- **Qui dépose** : les rôles de bureau (pour n'importe quel chauffeur ou véhicule) et les chauffeurs (en leur propre nom, imposé en base). **Qui décide (BR-115)** : propriétaire, gérant, comptable ; refus avec motif obligatoire ; une dépense validée ou refusée est définitive (pas de suppression : on refuse).
- **Justificatifs** : bucket privé `expense-receipts`, dossier de la société, 10 Mo, JPEG / PNG / WEBP / PDF, type réel lu dans les premiers octets, consultation par lien signé de 5 minutes (RLS sur le stockage : rôles de bureau et auteur du dépôt).
- **Hors ligne** : `client_ref` unique généré par l'app chauffeur : rejouer la file après une coupure ne crée jamais de doublon (étape 19).
- **Offre** : écriture avec la V2 (`has_feature('expenses')`), lecture conservée en lecture seule (Q21).
