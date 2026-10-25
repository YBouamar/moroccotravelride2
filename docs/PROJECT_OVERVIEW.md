# Dossier de référence produit : MoroccoTravelRide

> **Statut : document de référence de travail.** Reconstitué à partir du prompt de cadrage, de la présentation de marque et des réponses de Yassine du 2026-10-25 (le fichier `MoroccoTravelRide_Project_Overview.md` mentionné dans le prompt n'existe pas). À relire par Yassine ; il fait foi une fois validé.

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

Le prix affiché est celui fixé par le transporteur (grille tarifaire). La plateforme prélève une commission (20 % par défaut) sur ce prix. Réservation au moins 24 h à l'avance, acceptée par le transporteur sous 2 h.

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

- MVP porté par un fondateur solo : code simple, pas de microservices, briques open source éprouvées (Supabase, Coolify) pour limiter l'exploitation.
- Trois langues dès le départ : français (défaut), anglais, arabe (RTL).
- Conformité loi marocaine 09-08 (CNDP) pour les données personnelles.
- Paiement hors ligne au lancement : virement au transporteur avant le trajet ou espèces au chauffeur ; le transporteur encaisse 100 % et règle chaque mois la commission de la plateforme en espèces ou par virement instantané (ADR-016). Carte en ligne reportée (formalités administratives).
- Hébergement sur un VPS Contabo, Supabase auto-hébergé (ADR-013).

## 6. Identité de marque

Voir [UX.md, section Identité visuelle](UX.md#6-identité-visuelle). Logo : monogramme « M » formé de montagnes de l'Atlas, d'une route sinueuse, d'une kasbah et d'un palmier ; palette bleu nuit et turquoise ; kit officiel dans `assets/brand/logos/`.

## 7. Plan de livraison

Phases 0 à 7, détaillées dans [PROGRESS.md](PROGRESS.md).
