# Journal des décisions (ADR)

Format court. On ne supprime jamais une décision : on la marque `REMPLACÉE PAR ADR-XXX`.
Statuts : **ACCEPTÉE**, **À CONFIRMER** (hypothèse par défaut appliquée en attendant Yassine), **REMPLACÉE**.

---

## ADR-001 : Flux de paiement marketplace

- **Date** : 2026-10-24 · **Statut** : À CONFIRMER (implications juridiques À VÉRIFIER)
- **Contexte** : le voyageur paie en ligne. Deux modèles : (a) la plateforme encaisse tout puis reverse 80 % ; (b) le transporteur encaisse directement et la plateforme lui facture sa commission.
- **Décision par défaut** : (a) encaissement par la plateforme, reversements périodiques (`carrier_payouts`, `commission_ledger`).
- **Alternatives** : (b) paiement direct ; (c) split de paiement natif chez le prestataire (rarement disponible au Maroc, À VÉRIFIER avec CMI).
- **Conséquences** : (a) peut constituer un **encaissement pour compte de tiers**, potentiellement soumis à un statut réglementé (établissement de paiement, Bank Al-Maghrib) et a des effets fiscaux (TVA sur le montant total ou sur la commission). **À faire valider par un juriste / expert-comptable avant la mise en production.** Le code isole ce choix : `PaymentProvider` (technique) + `SettlementStrategy` (`platform_collects | direct_to_carrier`) côté métier, pour basculer sans réécrire le tunnel.

## ADR-002 : Acceptation des réservations par le transporteur

- **Date** : 2026-10-24 · **Statut** : À CONFIRMER
- **Décision par défaut** : après paiement, statut `pending_carrier` avec échéance `accept_deadline = now() + 2 h` (paramétrable). Refus ou échéance dépassée : `cancelled_by_carrier`, file admin pour réaffectation ou remboursement. Une tâche pg_cron détecte les échéances dépassées.
- **Alternatives** : confirmation instantanée (transporteur engagé par sa grille) ; diffusion à plusieurs transporteurs (premier qui accepte).
- **Conséquences** : délai d'incertitude pour le voyageur (communiqué clairement) ; nécessite des notifications rapides au transporteur. Si la réservation est à 24 h, l'échéance de 2 h reste compatible.

## ADR-003 : Tarification par grille

- **Date** : 2026-10-24 · **Statut** : À CONFIRMER
- **Décision par défaut** : `price_grids` (company, ville départ, ville arrivée, type de véhicule, prix en centimes). Pas de prix au km, pas de majoration nuit / week-end dans le MVP.
- **Conséquences** : simple, prévisible, suffisant pour les transferts aéroport et axes inter-villes. Les suppléments (nuit, bagages hors gabarit, sièges enfant) vont au backlog.

## ADR-004 : Politique d'annulation voyageur

- **Date** : 2026-10-24 · **Statut** : À CONFIRMER
- **Décision par défaut** : plus de 48 h avant : remboursement 100 % ; entre 48 h et 24 h : 50 % ; moins de 24 h : 0 %. Seuils et pourcentages dans `platform_settings.cancellation_policy` (JSON versionné), figés sur la réservation à sa création.
- **Question liée** : la commission est-elle conservée par la plateforme en cas d'annulation partiellement remboursée ? Défaut proposé : la somme retenue est partagée selon le même taux de commission.

## ADR-005 : Encaissement des abonnements SaaS

- **Date** : 2026-10-24 · **Statut** : À CONFIRMER
- **Décision par défaut** : facture d'abonnement générée, paiement par virement, activation manuelle par l'admin. Essai gratuit proposé : 14 jours (À CONFIRMER). Paiement récurrent en ligne : phase ultérieure (backlog).

## ADR-006 : Montants en centimes et arrondis

- **Date** : 2026-10-24 · **Statut** : ACCEPTÉE (règle d'arrondi À CONFIRMER)
- **Décision** : tous les montants en `bigint` centimes. Taux stockés en `numeric(5,4)` (ex. 0.2000). Commission arrondie au centime le plus proche (arrondi bancaire non retenu, half-up). La part transporteur est toujours `total - commission`.

## ADR-007 : TVA paramétrable

- **Date** : 2026-10-24 · **Statut** : À CONFIRMER (taux À VÉRIFIER)
- **Décision par défaut** : taux par défaut défini par société, surchargeable par ligne ; calcul et arrondi par ligne. Aucun taux codé en dur. Les taux applicables (transport touristique, commission plateforme, abonnement SaaS) sont à faire valider par un expert-comptable.

## ADR-008 : Région d'hébergement et transfert de données (CNDP)

- **Date** : 2026-10-24 · **Statut** : À CONFIRMER
- **Contexte** : Supabase et Vercel n'ont pas de région au Maroc. Héberger en UE (ex. Francfort `eu-central-1` ou Paris `eu-west-3`) constitue un **transfert de données hors du Maroc**, à déclarer / autoriser auprès de la CNDP (loi 09-08). Démarches et délais : À VÉRIFIER.
- **Décision par défaut** : région UE la plus proche (Paris `eu-west-3` si disponible côté Supabase, sinon Francfort), Vercel fonctions en `cdg1` (Paris). Déclaration CNDP à prévoir avant la production.
- **Alternatives** : hébergeur marocain (perte des services managés, contraire à la contrainte « fondateur solo »).

## ADR-009 : Monorepo pnpm + Turborepo, Next.js App Router, Supabase

- **Date** : 2026-10-24 · **Statut** : ACCEPTÉE (imposée par le cadrage)
- **Décision** : stack de la section 4 du cadrage. Versions relevées le 2026-10-24 dans [ARCHITECTURE.md](ARCHITECTURE.md), à figer en Phase 1 après test de compatibilité.
- **Point d'attention** : TypeScript 7 (compilateur natif) est la dernière version stable ; si l'écosystème (Next.js, ESLint, Expo) n'est pas encore compatible, on figera la dernière 5.x / 6.x compatible et on le notera ici.

## ADR-010 : Identité visuelle et accessibilité des couleurs

- **Date** : 2026-10-24 · **Statut** : ACCEPTÉE
- **Contexte** : palette de la présentation de marque. Mesures de contraste (WCAG 2.1) : bleu nuit sur blanc 14,64 ; turquoise profond sur blanc 4,81 ; turquoise profond sur fond clair 4,50 ; **turquoise clair sur blanc 2,52 (échec)** ; blanc sur turquoise clair 2,52 (échec) ; bleu nuit sur turquoise clair 5,80.
- **Décision** :
  - Bouton d'action principal : fond `accent` #21B6A8 + **texte bleu nuit** #102A43 (5,80, AA).
  - Bouton secondaire / liens : `secondary` #087E8B ; texte blanc sur `secondary` (4,81, AA texte normal). Liens `secondary` sur `background` uniquement en taille ≥ 16 px (4,50 limite).
  - `accent` jamais utilisé comme couleur de texte sur fond clair ; usage autorisé en texte sur fond bleu nuit (5,80) et en éléments décoratifs (icônes ≥ 3:1 non requis pour la décoration, bordures actives).
  - Logos : fichiers fournis utilisés tels quels comme sources dans `assets/brand/` ; variantes dérivées générées en Phase 1 (favicon carré, icônes d'app, tailles web).
- **Conséquences** : les fichiers fournis ont un fond blanc opaque (pas de transparence) : utilisables sur fond clair uniquement. Pour l'en-tête sombre et le mode sombre, une version à fond transparent (idéalement SVG) est demandée (question Q8).

## ADR-011 : Emplacement des visuels de marque

- **Date** : 2026-10-24 · **Statut** : ACCEPTÉE
- **Décision** : les sources sont déplacées de la racine vers `assets/brand/` (`logo_horiz.png`, `logo_vertical.png`, `favicon.png`, `presentation-marque.png`). Elles ne sont jamais modifiées ; les dérivés (redimensionnés, recadrés) sont générés par script en Phase 1 vers `apps/web/public/brand/` et `apps/driver/assets/`.
- **Usage** : logo horizontal = en-têtes web (marketplace, SaaS, admin), e-mails, PDF ; logo vertical = pages d'authentification, onboarding, splash mobile, bon de réservation ; favicon = favicon web, icône PWA, icône et adaptive icon de l'app chauffeur, avatar par défaut, notifications.
