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
- **Point d'attention** : TypeScript 7 (compilateur natif) est la dernière version stable ; si l'écosystème (Next.js, ESLint, Expo) n'est pas encore compatible, on figera la dernière 5.x / 6.x compatible et on le notera ici.

## ADR-010 : Identité visuelle et accessibilité des couleurs

- **Date** : 2026-10-24 · **Statut** : ACCEPTÉE ; partie logos REMPLACÉE PAR ADR-014
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
