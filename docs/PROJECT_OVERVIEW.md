# Dossier de référence produit : MoroccoTravelRide

> **Statut : PROVISOIRE.** Le fichier source `MoroccoTravelRide_Project_Overview.md` n'a pas été fourni lors de la Phase 0. Ce document est reconstitué à partir du prompt de cadrage et de la présentation de marque. Il sera remplacé par la copie du dossier officiel dès réception (voir question Q1 dans [PROGRESS.md](PROGRESS.md)).

## 1. Vision

Devenir la référence marocaine du transport touristique en ligne en reliant deux besoins :

- les **voyageurs** (touristes nationaux et internationaux) qui veulent réserver un transfert fiable, à prix fixe, auprès d'un transporteur agréé ;
- les **sociétés de transport touristique agréées** qui ont besoin d'un outil simple pour gérer leur activité au quotidien.

Signature (proposition) : « Move smarter. Manage better. »

## 2. Les deux piliers (valeur stratégique égale)

### Pilier A : Marketplace

Réservation en ligne de transferts touristiques :

- **intra-ville** (ex. aéroport Mohammed V vers un hôtel de Casablanca) ;
- **inter-villes** (ex. Casablanca vers Marrakech).

Le prix affiché est celui fixé par le transporteur (grille tarifaire). La plateforme prélève une commission (20 % par défaut) sur ce prix. Réservation au moins 24 h à l'avance.

### Pilier B : SaaS de gestion

Outil métier multi-entreprises pour transporteurs, en trois offres :

| Offre | Prix | Contenu |
|---|---|---|
| Standard | 150 MAD / mois | Trajets, chauffeurs, véhicules, facturation, paiements |
| V2 | 400 MAD / mois | Standard + dépenses, application chauffeur (planning), déclaration de dépenses avec scan, localisation pendant le trajet |
| V3 | Sur devis | V2 + entretien et pièces, échéances (vignette, visite technique, assurance, traite, vidange), consommation |

Les deux piliers se renforcent : une réservation marketplace acceptée devient automatiquement un trajet dans le SaaS du transporteur.

## 3. Cible et utilisateurs

- **Cible de départ** : sociétés de transport touristique agréées au Maroc. Le transport de personnel est hors périmètre initial.
- **Utilisateurs** : voyageurs, dirigeants et gestionnaires de sociétés de transport (owner, manager, dispatcher, accountant), chauffeurs, administrateurs de la plateforme.

## 4. Modèle économique

1. Commission sur chaque réservation marketplace (20 % standard, paramétrable globalement et par transporteur).
2. Abonnements SaaS mensuels (Standard, V2, V3).

Exemple : réservation à 800 MAD, commission 160 MAD, part transporteur 640 MAD.

Chiffres de marché (taille, nombre de transporteurs agréés, flux touristiques) : **À VÉRIFIER**, aucune donnée sourcée à ce stade.

## 5. Contraintes

- MVP porté par un fondateur solo : services managés, code simple, pas de microservices.
- Trois langues dès le départ : français (défaut), anglais, arabe (RTL).
- Conformité loi marocaine 09-08 (CNDP) pour les données personnelles.
- Paiement en ligne via une passerelle marocaine (CMI visé), sans jamais manipuler de données de carte.

## 6. Identité de marque

Voir [UX.md, section Identité visuelle](UX.md#6-identité-visuelle). Logo : monogramme « M » formé de montagnes de l'Atlas, d'une route sinueuse, d'une kasbah et d'un palmier ; palette bleu nuit et turquoise.

## 7. Plan de livraison

Phases 0 à 7, détaillées dans [PROGRESS.md](PROGRESS.md).
