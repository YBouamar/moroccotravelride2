# Règles métier

Chaque règle porte un identifiant stable (`BR-XXX`), un statut et une source. Statuts : **ACTÉ** (validé par Yassine), **À CONFIRMER** (hypothèse par défaut appliquée, voir l'ADR correspondant), **À VÉRIFIER** (juridique ou fiscal, à faire valider par un professionnel).

Toutes les valeurs « paramétrables » vivent dans `platform_settings` (global) ou sur l'entité concernée (société, réservation), jamais dans le code. Les calculs sont implémentés en fonctions pures dans `packages/shared` et testés.

## 1. Marketplace

| ID | Règle | Valeur | Statut | Source |
|---|---|---|---|---|
| BR-001 | Commission marketplace standard | 20 % du prix affiché | ACTÉ | Prompt §3.1 |
| BR-002 | Commission paramétrable | Globale (`platform_settings.default_commission_rate`) et par transporteur (`companies.commission_rate`, nullable = défaut global) | ACTÉ | Prompt §3.1 |
| BR-003 | Commission figée | `commission_rate`, `commission_amount` et `carrier_amount` copiés sur la réservation à sa création ; un changement ultérieur de taux ne les modifie pas | ACTÉ | Prompt §3.1 |
| BR-004 | Prix affiché | Prix fixé par le transporteur (tout compris, sans frais cachés). La commission est prélevée sur ce prix, elle ne s'y ajoute pas | ACTÉ | Prompt §3.1 |
| BR-005 | Calcul | `commission = round(total * rate)` en centimes ; `carrier = total - commission` (la somme est toujours exacte). Exemple : 80 000 c, 20 % : 16 000 c et 64 000 c | ACTÉ (formule), arrondi au centime le plus proche À CONFIRMER | Prompt §3.1, ADR-006 |
| BR-006 | Délai minimal de réservation | 24 h avant l'heure de prise en charge, paramétrable ; contrôlé côté serveur (UI = confort) | ACTÉ | Prompt §3.1 |
| BR-007 | Types de trajet | Intra-ville (départ et arrivée dans la même ville) et inter-villes | ACTÉ | Prompt §3.1 |
| BR-008 | Prix des trajets | Grille par transporteur : ville départ, ville arrivée, type de véhicule, prix. Pas de calcul au km dans le MVP | À CONFIRMER | ADR-003 |
| BR-009 | Modes de paiement | (a) **Virement** sur un compte bancaire du transporteur, avant le trajet ; (b) **Espèces** remises au chauffeur, qui les rend au dirigeant. Dans les deux cas le transporteur encaisse 100 % et doit la commission. Carte en ligne reportée | ACTÉ | ADR-016 |
| BR-009b | Relevé de commissions | Mensuel par transporteur ; réglé par le dirigeant en espèces ou par virement instantané, enregistré par l'admin | ACTÉ | ADR-016 |
| BR-009c | Confirmation du paiement | Confirmée par le transporteur (owner, manager, accountant) ; le chauffeur peut déclarer un encaissement espèces depuis l'app (V2) | ACTÉ | ADR-016 |
| BR-009d | Relevé impayé | Relances, puis suspension de la visibilité marketplace après 15 jours (paramétrable) | ACTÉ | ADR-016, Yassine 2026-10-25 |
| BR-010 | Acceptation | La réservation est adressée au transporteur choisi, qui accepte sous 2 h (paramétrable). Sans réponse ou refus : l'admin réaffecte (ou rembourse si un paiement a été reçu) | ACTÉ | ADR-002 |
| BR-011 | Annulation voyageur | Gratuite jusqu'à 48 h avant ; 50 % remboursé entre 48 h et 24 h ; non remboursable à moins de 24 h. Paramétrable. Somme retenue partagée au prorata du taux de commission. Remboursement seulement si un paiement a été reçu | ACTÉ | ADR-004 |
| BR-012 | Annulation transporteur | Remboursement intégral du voyageur, réaffectation proposée par l'admin. Pénalités transporteur : à définir | À CONFIRMER | Backlog |
| BR-013 | Référence publique | Aléatoire, non séquentielle, format `MTR-XXXXXX` (alphabet sans caractères ambigus) | ACTÉ | Prompt §6 |
| BR-014 | Réservation invité | Autorisée sans compte ; accès ultérieur par référence + e-mail (lien magique) | ACTÉ | Prompt §8.2 |
| BR-015 | Conversion | Une réservation acceptée crée automatiquement un trajet SaaS (`origin = marketplace`) chez le transporteur | ACTÉ | Prompt §13 Phase 3 |
| BR-016 | Visibilité marketplace | Seules les sociétés `verified` avec `marketplace_enabled = true`, un agrément non expiré et une grille active apparaissent  et non suspendues. Le transporteur active ou désactive lui-même sa visibilité ; une suspension par l'admin la bloque et seul l'admin la lève | ACTÉ | Q19, ADR-020 |

### Machine à états : réservation

Statut de réservation et statut de paiement sont **indépendants** (pas de prépaiement en ligne, ADR-016).

```
pending_carrier -> confirmed              (transporteur accepte avant l'échéance)
pending_carrier -> cancelled_by_carrier   (refus ou échéance dépassée, puis réaffectation par l'admin)
confirmed       -> assigned               (chauffeur et véhicule affectés)
confirmed|assigned -> cancelled_by_traveler | cancelled_by_carrier
assigned        -> completed
cancelled_*     -> refunded               (seulement si un paiement avait été reçu)
completed|assigned -> disputed            (litige ouvert par voyageur ou admin)
pending_payment                           (réservé au futur paiement par carte en ligne)
```

Statut de paiement : `unpaid -> paid -> partially_refunded | refunded`. Chaque transition est journalisée dans `booking_events`. Liste exhaustive et acteurs autorisés : `packages/shared/src/state-machines/booking.ts` (Phase 3).

## 2. SaaS

| ID | Règle | Valeur | Statut | Source |
|---|---|---|---|---|
| BR-101 | Offre Standard | 150 MAD/mois : trajets, chauffeurs, véhicules, facturation, paiements | ACTÉ | Prompt §3.1 |
| BR-102 | Offre V2 | 400 MAD/mois : Standard + dépenses, app chauffeur, scan justificatifs, localisation | ACTÉ | Prompt §3.1 |
| BR-103 | Offre V3 | Prix `null` (« sur devis ») : V2 + entretien, pièces, échéances, consommation | ACTÉ | Prompt §3.1 |
| BR-104 | Feature gating | Fonctions hors offre visibles mais verrouillées, avec appel à monter en gamme ; contrôle réel côté serveur | ACTÉ | Prompt §5.2 |
| BR-105 | Paiement abonnement | Facture + virement, activation manuelle par l'admin ; paiement récurrent en ligne plus tard | ACTÉ | ADR-005 |
| BR-106 | Période d'essai | 14 jours sur l'offre V2, créée automatiquement avec la société | ACTÉ | ADR-005, ADR-021 |
| BR-106b | Fin d'essai ou d'abonnement | Lecture seule : données consultables, aucune création ni modification | ACTÉ (Q21) | ADR-022 |
| BR-106c | Paiement en retard (`past_due`) | Accès complet pendant 15 jours (paramétrable), puis résiliation automatique et lecture seule | ACTÉ (Q22) | ADR-022 |
| BR-106d | Paiement des abonnements | Virement sur le compte de la plateforme ; RIB, e-mail et téléphone affichés sur la page Abonnement, saisis par l'admin | ACTÉ (Q23) | ADR-022 |
| BR-107 | Numérotation des factures | Séquentielle, sans trou, par société et par année (ex. `2026-000123`), attribuée à l'émission et non à la création du brouillon | ACTÉ (principe), format À CONFIRMER | Prompt §6 |
| BR-108 | Immutabilité | Une facture émise n'est plus modifiable ; correction par avoir (`credit_notes`) | ACTÉ | Prompt §6 |
| BR-109 | Mentions légales facture | ICE émetteur et client (si B2B), IF, RC, taxe professionnelle, HT, TVA, TTC. Liste exhaustive : **À VÉRIFIER** auprès d'un comptable | À VÉRIFIER | Prompt §6 |
| BR-110 | TVA | Taux paramétrable par société et par ligne, jamais codé en dur. Taux applicables au transport touristique : **À VÉRIFIER** | ACTÉ (paramétrable sans valeur imposée), taux À VÉRIFIER | ADR-007 |
| BR-111 | Calcul TVA | Calcul par ligne en centimes, arrondi par ligne, totaux = somme des lignes | À CONFIRMER | ADR-007 |
| BR-112 | Statuts facture | `draft -> issued -> partially_paid -> paid` ; `issued -> cancelled` uniquement via avoir total | ACTÉ | Prompt §6 |
| BR-113 | Statuts trajet | `planned -> assigned -> in_progress -> completed` ; `cancelled` depuis tout état non terminé | ACTÉ | Prompt §6 |
| BR-114 | Conflits de planning | Blocage (dérogeable par owner ou manager) si chauffeur ou véhicule déjà occupé sur un créneau qui se chevauche, ou si passagers > places | ACTÉ : bloquant, dérogation par owner ou manager (journalisée) | Yassine 2026-10-25 |
| BR-115 | Statuts dépense | `submitted -> approved | rejected` | ACTÉ | Prompt §6 |

## 3. App chauffeur et localisation

| ID | Règle | Valeur | Statut |
|---|---|---|---|
| BR-201 | Localisation | Enregistrée uniquement quand le trajet est `in_progress` (contrôle en base) | ACTÉ |
| BR-202 | Conservation | Purge automatique après 90 jours (paramétrable) | ACTÉ (défaut), durée légale À VÉRIFIER CNDP |
| BR-203 | Fréquence d'envoi | Défaut proposé : 1 point toutes les 15 s ou 50 m | À CONFIRMER |

## 4. Parc (V3)

| ID | Règle | Valeur | Statut |
|---|---|---|---|
| BR-301 | Échéances | Types : vignette, visite technique, assurance, traite bancaire, vidange ; par date ou kilométrage | ACTÉ |
| BR-302 | Rappels | J-30, J-7, J-1 par e-mail et notification | ACTÉ |
| BR-303 | Consommation | L/100 km calculé entre deux pleins complets consécutifs | À CONFIRMER |

## 5. Transverse

| ID | Règle | Valeur | Statut |
|---|---|---|---|
| BR-401 | Devise | MAD, montants en centimes (bigint) | ACTÉ |
| BR-402 | Fuseau | Stockage UTC, affichage `Africa/Casablanca` | ACTÉ |
| BR-403 | Langues | fr (défaut), en, ar (RTL) | ACTÉ |
| BR-404 | Audit | Actions sensibles journalisées dans `audit_logs` sans données sensibles | ACTÉ |
