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
| P2 | Proposer la MFA aux propriétaires de société (page `/mfa` réservée aux admins pour l'instant) |
| P2 | Sélecteur de société pour un utilisateur membre de plusieurs sociétés (aujourd'hui : la plus ancienne) |
| P2 | Polices de marque (Montserrat, Inter, Noto Sans Arabic) dans l'app chauffeur (police système aujourd'hui) |
| P2 | Configuration EAS (profils de build, identifiants des magasins) : Phase 7 |
| P3 | Lancer les E2E sur le serveur `standalone` réel plutôt que `next start` |
| P3 | Réexaminer l'exception d'audit node-forge à chaque mise à jour d'Expo (ADR-020) |
| P2 | Pagination de la liste des sociétés et de l'historique (quelques dizaines de lignes aujourd'hui) |
| P2 | Factures d'abonnement générées automatiquement (PDF) et relances : avec la facturation (étape 10) |
| P3 | Relecture des traductions arabes par un locuteur natif |
| P2 | Compression des photos de documents côté client avant envoi (SECURITY 2.4) |
| P2 | Rappels d'expiration de l'agrément et des documents de la société (avec les échéances, Phase 5) |
| P3 | Données de test E2E qui s'accumulent en local : `pnpm db:reset` de temps en temps |
| P2 | Avoirs partiels (aujourd'hui : avoir total uniquement, ADR-027) |
| P2 | PDF de facture en arabe : police arabe intégrée et mise en page RTL (ADR-027) |
| P2 | Historique d'un trajet et d'une facture (journal d'audit) visible sur leur fiche |
| P3 | Renommer `useOnboardingAction` en hook générique de formulaire (utilisé par tout le SaaS) |
| P3 | Numérotation des factures : format à confirmer par un comptable (BR-107) |
| P2 | Modèles d'e-mails avec React Email (aujourd'hui : HTML simple traduit) |
| P2 | Réservation avec compte voyageur (historique, avis) en plus du mode invité |
| P2 | Pénalités transporteur en cas d'annulation (BR-012, À CONFIRMER) |
| P2 | Réaffectation assistée d'une réservation refusée ou expirée vers un autre transporteur (aujourd'hui : contact manuel depuis la supervision) |
| P2 | Relances automatiques par e-mail des relevés de commissions avant et après l'échéance |
| P1 | Serveur de tuiles ou fournisseur de cartes avant le lancement (politique d'usage OpenStreetMap, ADR-034) |
| P2 | Suivi de position en arrière-plan (consentement explicite, autonomie de la batterie) |
| P2 | Test de l'app chauffeur sur appareils réels (Android d'entrée de gamme, iPhone) avec EAS |
