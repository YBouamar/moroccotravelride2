# Session 2026-10-26 : correctif et étape 6 (abonnements, back-office)

## Objectif

Corriger le bug signalé au lancement, puis Phase 2, étape 6.

## Réalisé

- Bug signalé : serveur de dev resté sur d'anciens chemins de modules après l'installation des dépendances de l'app chauffeur (`module factory is not available`). Redémarrage propre, `pnpm dev` limité au web, piège documenté. Corrigé au passage : `?next=` perdu au changement de langue, langue active invisible sur les pages d'authentification (test E2E ajouté).
- Base : offres, fonctions par offre, abonnements avec essai automatique, `has_feature`, journal d'audit par triggers (+ correctif des colonnes restées vides), seed avec une société dans chaque situation.
- Partagé : constantes d'offres et de fonctions, `isSubscriptionUsable`, `trialDaysLeft`, conversions pourcentage / points de base / taux, `formatMoney`.
- Transporteur : contexte société (abonnement, fonctions), bandeaux d'essai et d'expiration, sections verrouillées, page Abonnement, `<FeatureGate>`.
- Admin : vue d'ensemble, liste et fiche société, Server Actions (statut, suspension marketplace, commission, abonnement) avec confirmation, historique traduit.
- Tests : 120 unitaires, 69 pgTAP, 35 E2E (dont enrôlement MFA TOTP réel).

## Décisions

ADR-021. Questions Q21 à Q23.

## Problèmes

- L'historique affichait des champs vides inchangés et des valeurs brutes : correctif SQL par une nouvelle migration (aucune migration appliquée modifiée) et affichage traduit testé.
- Texte en dur repéré dans la fiche société (rôles, documents) : remplacé par des traductions.
- Dépôt GitHub : toujours 403.

## Complément : réponses Q21 à Q23

- Lecture seule après expiration (convention RLS SELECT / écriture), délai de grâce de 15 jours avec `past_due_since` et résiliation quotidienne par pg_cron, page Paramètres admin (RIB, e-mail, téléphone, délai de grâce), coordonnées affichées sur la page Abonnement. ADR-022.
- Pièges rencontrés en écrivant les tests : séquences d'échappement perdues dans des scripts de remplacement, `

Étape 7 (onboarding transporteur, documents en stockage privé) après validation.
` interprété par `String.replace` ; corrigés à l'outil d'édition.

## Prochaine étape

Étape 7 (onboarding transporteur, documents en stockage privé) après validation.
