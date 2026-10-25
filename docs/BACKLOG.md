# Backlog

Priorités : **P1** (prochaine itération après MVP), **P2** (utile), **P3** (idée).

## Fonctionnalités reportées

| Prio | Sujet | Origine |
|---|---|---|
| P1 | Paiement par carte en ligne des réservations (CMI ou autre, adaptateur `PaymentProvider`), reporté pour formalités administratives | ADR-016 |
| P2 | Caisse chauffeur : suivi des espèces encaissées par chaque chauffeur et remises au dirigeant | ADR-016 |
| P1 | Paiement récurrent en ligne des abonnements SaaS | ADR-005 |
| P1 | Dossier CNDP (déclaration du traitement et du transfert vers le VPS en UE) avant production | ADR-013 |
| P1 | Pénalités et règles d'annulation côté transporteur | BR-012 |
| P2 | Suppléments tarifaires (nuit, siège enfant, bagage hors gabarit, attente) | ADR-003 |
| P2 | Diffusion d'une réservation à plusieurs transporteurs (premier qui accepte) | ADR-002 |
| P2 | Mises à disposition (location avec chauffeur à l'heure / journée) et circuits | Hors cadrage |
| P2 | Notifications WhatsApp / SMS (rappels voyageur, alertes chauffeur) | Hors cadrage |
| P2 | Sélecteur de lieu sur carte avec géocodage (Nominatim / Photon) | §4 cartographie |
| P3 | Transport de personnel (cible hors périmètre initial) | Overview |
| P3 | Programme de fidélité, codes promo | Idée |
| P3 | API partenaires (agences de voyage, hôtels) | Idée |

## Dette technique

| Prio | Sujet |
|---|---|
| P2 | Pages publiques rendues à la demande (ƒ) malgré `generateStaticParams` : viser le rendu statique de la marketplace pour les performances (Phase 7, SEO) |
| P2 | TypeScript 7 dès que typescript-eslint le supporte (ADR-009) |
| P2 | Tokens d'état `danger` / `warning` / `success` avec contraste AA (étape 5, formulaires) |
| P3 | Relecture des traductions arabes par un locuteur natif |
