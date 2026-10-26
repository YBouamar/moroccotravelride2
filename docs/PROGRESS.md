# Avancement

**Dernière mise à jour** : 2026-10-26 · **Phase en cours** : Phase 4, étape 18 terminée · **Prochaine étape** : Étape 19 (app chauffeur)

## 1. Plan d'exécution par étapes

Chaque étape se termine par une synthèse, une procédure de test manuel, les tests au vert, les docs à jour et un **arrêt pour validation de Yassine**.

| Étape | Phase | Contenu | Critère de validation | État |
|---|---|---|---|---|
| 1 | 0 | Cadrage : dépôt git, rangement des visuels, docs de contexte, commandes `.claude/`, questions ouvertes, intégration des réponses | `CLAUDE.md` + `PROGRESS.md` suffisent pour comprendre le plan | ✅ fait |
| 2 | 1a | Socle : pnpm + Turborepo, paquets `shared` / `db` / `ui` / `payments` vides mais câblés, TS strict, ESLint, Prettier, Vitest, `pnpm check` + hook pre-commit (gitleaks), workflow GitHub prêt mais inactif (ADR-015), versions figées | `pnpm check` au vert en local | ✅ fait |
| 3 | 1b | Web : Next.js, design system (tokens de la marque, shadcn/ui, composants de base), logos dérivés (favicon carré, icônes), i18n fr / en / ar + RTL, layouts public / SaaS / admin | Page d'accueil vide avec logo, bascule fr / en / ar avec RTL, contrastes AA | ✅ fait |
| 4 | 1c | Supabase local : migrations identité (profiles, companies, company_members, company_documents, platform_settings, cities, vehicle_types), fonctions de sécurité, RLS + pgTAP, seed de base, types générés | `pnpm db:test` au vert, isolation société A / B prouvée | ✅ fait |
| 5 | 1d | Auth : inscription transporteur (crée société `pending` + owner), connexion, mot de passe oublié, MFA admin, rate limiting, Turnstile, en-têtes de sécurité, sélection de société ; Expo initialisé (écran de connexion, i18n, icône) | **Critère Phase 1** : inscription, connexion, changement de langue avec RTL, isolation prouvée | ✅ fait |
| 6 à 11 | 2 | SaaS Standard en sous-étapes : onboarding + vérification admin ; véhicules / chauffeurs / clients ; trajets + planning + conflits ; facturation (PDF, numérotation, avoirs) + paiements ; abonnements + feature gating | Une semaine d'activité gérée de bout en bout, facture conforme | ✅ fait |
| 12 à 17 | 3 | Marketplace : villes + grilles ; recherche + résultats ; tunnel invité + 24 h ; acceptation + conversion en trajet ; paiement hors ligne (virement, espèces au chauffeur) + registre des commissions + relevé mensuel ; e-mails, lien magique, annulation, supervision admin | Casablanca vers Marrakech 800 MAD : 160 / 640 enregistrés, trajet au planning | ✅ fait |
| 18 à 21 | 4 | V2 : dépenses ; app chauffeur (planning, statuts, dépense photo, hors ligne) ; localisation Realtime + carte ; purge | Position visible pendant le trajet seulement ; dépense hors ligne synchronisée | ⬜ |
| 22 à 24 | 5 | V3 : entretien et pièces ; échéances + rappels planifiés ; consommation | Rappels J-30, J-7, J-1 sur une assurance | ⬜ |
| 25 à 27 | 6 | Pilotage : indicateurs ; reversements + exports ; audit consultable, avis et modération | Tableau de bord admin chiffré | ⬜ |
| 28 à 30 | 7 | Durcissement : audit sécurité, charge, SEO, pages légales, VPS Contabo (Coolify, Supabase auto-hébergé, staging), sauvegarde testée, EAS, CNDP, checklist | Checklist de lancement verte | ⬜ |

Le découpage des phases 2 à 7 en étapes sera affiné au début de chaque phase.

## 2. Fait

- 2026-10-24 : dépôt git (`main`), docs de contexte, commandes de session, ADR-001 à 011, analyse de la marque (commit `101d4dd`).
- 2026-10-25 : réponses de Yassine intégrées :
  - ACTÉ : acceptation sous 2 h (ADR-002), annulation 100 / 50 / 0 % avec partage au prorata (ADR-004), essai 14 jours V2 (ADR-005), TVA paramétrable (ADR-007), conflits de planning bloquants avec dérogation owner / manager (BR-114).
  - Nouveau : paiement hors ligne virement / espèces avec compensation (ADR-012), hébergement VPS Contabo (ADR-013), kit de logos officiel + Montserrat (ADR-014), contrôles qualité sans dépôt distant (ADR-015).
  - Kit de logos rangé dans `assets/brand/logos/` ; fichiers v1 archivés dans `assets/brand/v1/`.
  - Précisions : le transporteur encaisse dans les deux modes et règle la commission chaque mois (ADR-016, remplace ADR-012) ; Coolify et dépôt privé actés.
  - Docs mises à jour : BUSINESS_RULES (nouvelle machine à états), ARCHITECTURE, DATA_MODEL, UX, SECURITY (§2.9 serveur), RUNBOOK, TESTING, BACKLOG, PROJECT_OVERVIEW, CLAUDE.md.

- 2026-10-25, étape 2 : monorepo pnpm 12 + Turborepo, paquets `@mtr/shared` (commission, montants, modes de paiement), `@mtr/ui` (tokens de marque + contrôle des contrastes), `@mtr/db` (types provisoires), `@mtr/payments` (interface `PaymentProvider`) ; TypeScript 6.0.3 strict, ESLint 10, Prettier, Vitest (25 tests), CLI Supabase, `pnpm check`, hook pre-commit (gitleaks + lint-staged), workflow CI + Dependabot prêts. ADR-017.

- 2026-10-25, étape 3 : `apps/web` (Next.js 16 standalone, Tailwind 4 sur les tokens, composants de base, logos et favicons du kit, polices auto-hébergées, next-intl fr / en / ar avec RTL, accueil, coques SaaS et admin, 404 localisée, en-têtes de sécurité) ; `theme.css` généré depuis `@mtr/ui` ; 38 tests unitaires + 20 E2E (Playwright avancé de l'étape 5). Corrections d'accessibilité : bandeau sur fond bleu nuit, anneau de focus turquoise profond (ADR-018).

- 2026-10-25, étape 4 : Supabase local, 3 migrations (référentiels villes / aéroports / véhicules, identité et sociétés, paramètres plateforme), RLS partout, fonctions de sécurité dans `private`, admin soumis à MFA, triggers de garde, `create_company`, 42 tests pgTAP, types générés, matrice de permissions et schéma Zod des paramètres, job CI base de données (ADR-019).

- 2026-10-26, étape 5 (fin de Phase 1) : Q19 (visibilité gérée par le transporteur, suspension admin) et limitation des tentatives en base ; authentification web côté serveur (inscription avec confirmation d'e-mail et création de la société en attente, connexion, déconnexion, mot de passe oublié, MFA admin), proxy (CSP à nonce, session, protection des espaces), Turnstile, e-mails trilingues, comptes de démonstration ; squelette de l'app chauffeur Expo (connexion réservée aux chauffeurs, session sécurisée, fr / en / ar avec RTL) ; hygiène des dépendances (ESLint 9, zod corrigé). 93 tests unitaires, 52 pgTAP, 30 E2E (ADR-020).

- 2026-10-26 : correctif du sélecteur de langue (conservation de `?next=`, langue active visible), `pnpm dev` limité au web ; diagnostic d'un serveur de dev resté sur d'anciens modules après installation de dépendances.
- 2026-10-26, étape 6 : offres et abonnements (essai V2 de 14 jours automatique), `has_feature`, journal d'audit par triggers, page Abonnement, sections verrouillées selon l'offre, back-office des sociétés (vérification, suspension marketplace, commission, abonnement, historique traduit). 120 tests unitaires, 69 pgTAP, 35 E2E (ADR-021).

- 2026-10-26 : réponses Q21 à Q23 intégrées : lecture seule après expiration, 15 jours de grâce puis résiliation automatique (pg_cron), page Paramètres admin pour les coordonnées de paiement affichées aux transporteurs (ADR-022). 124 tests unitaires, 77 pgTAP, 38 E2E.

- 2026-10-26, étape 7 : véhicules et chauffeurs (RLS lecture / écriture), bucket privé des documents, assistant d'onboarding en 4 étapes, détection du type réel des fichiers, validation des documents par l'admin (lien signé, refus motivé). 140 tests unitaires, 92 pgTAP, 41 E2E (ADR-023).
- 2026-10-26 : Q24 intégrée (dates expirées acceptées avec avertissement, `canDriverPerformTrip` pour l'étape 9), dates au fuseau marocain sans décalage en dur (ADR-024), course `typecheck` / `build` corrigée dans Turborepo.
- 2026-10-26, étape 8 : listes Flotte, Chauffeurs et Clients (recherche, filtres, tri, pagination serveur, création, modification, désactivation, export CSV), table `clients`, navigation activée selon l'offre, données de démonstration. 151 tests unitaires, 98 pgTAP, 45 E2E (ADR-025).
- 2026-10-26, étape 9 : trajets (création, modification, démarrage, fin, annulation motivée), planning jour et semaine, contrôles en base (permis valide le jour du trajet, véhicule disponible, capacité, chevauchements bloquants avec dérogation propriétaire ou gérant auditée), heures au fuseau marocain, trajets de démonstration. 159 tests unitaires, 115 pgTAP, 47 E2E (ADR-026).
- 2026-10-26, étape 10 : facturation (brouillons, lignes libres ou issues de trajets terminés, TVA par ligne avec taux par défaut de la société, émission avec numéro sans trou et mentions figées, PDF, avoir total), paiements (statuts partiellement payée / payée), ports locaux 553xx. 166 tests unitaires, 135 pgTAP, 49 E2E (ADR-027, ADR-028).
- 2026-10-26, étape 11 (fin de Phase 2) : tableau de bord du jour (trajets du jour, à affecter sur 7 jours, reste à encaisser, factures en retard, alertes permis, agrément et véhicules en maintenance, selon le rôle), recette Phase 2 automatisée (trajet planifié, démarré, terminé, facturé, émis, payé), heures en 24 h dans les cartes de trajet, vue semaine responsive. 167 tests unitaires, 135 pgTAP, 51 E2E (ADR-029).
- 2026-10-26, étapes 12 et 13 : grilles tarifaires et visibilité marketplace côté transporteur (liste des conditions BR-016), recherche publique par lieu, date, heure et passagers, règle des 24 h, grilles de démonstration. 172 tests unitaires, 146 pgTAP, 54 E2E (ADR-030).
- 2026-10-26, étapes 14 et 15 : tunnel de réservation invité (Turnstile, limite, prix et commission figés), lien magique signé (suivi, coordonnées de virement, annulation selon les paliers), réservations côté transporteur (acceptation sous 2 h avec conversion en trajet, refus motivé, expiration automatique, confirmation du paiement et du remboursement), registre des commissions, file d'e-mails trilingues. Critère Phase 3 vérifié (800 MAD : 160 / 640). 183 tests unitaires, 172 pgTAP, 57 E2E (ADR-031).
- 2026-10-26, étapes 16 et 17 (fin de Phase 3) : relevés mensuels de commissions (génération automatique ou manuelle, paiements enregistrés par l'admin, retard puis suspension marketplace), page Commissions du transporteur, supervision admin des réservations. 183 tests unitaires, 182 pgTAP, 59 E2E (ADR-032).
- 2026-10-26, étape 18 : dépenses (dépôt par le bureau ou le chauffeur, justificatif privé, validation ou refus motivé, décision définitive, offre V2). 186 tests unitaires, 191 pgTAP, 60 E2E (ADR-033).

## 3. En cours

Exécution enchaînée des étapes 9 à 30 (demande de Yassine : « exécute toutes les étapes restantes en une seule fois »).

Ports de Supabase local déplacés en 553xx (ADR-028) : la plage 543xx était réservée par Windows.

## 4. Bloqué / points d'attention

- **Dépôt GitHub non créé** : la création de `moroccotravelride2` échoue toujours (403, nouvelles tentatives aux étapes 3 à 6) : le jeton n'a pas le droit de créer des dépôts. À corriger côté Yassine, puis création + push des commits.
- Juridique À VÉRIFIER : facture mensuelle de commission (TVA), plafonds légaux des paiements en espèces, mentions de facture, CNDP.

## 5. Questions ouvertes pour Yassine

Réglées le 2026-10-25 : Q1 à Q16. Dernières réponses : espèces remises au chauffeur puis au dirigeant, commission réglée chaque mois en espèces ou virement instantané (ADR-016) ; virement avant le trajet ; carte en ligne reportée ; relevé mensuel ; Coolify ; dépôt privé.

Q17 à Q24 réglées. **Aucune question ouverte.**


Action côté Yassine : saisir les vraies coordonnées de paiement (RIB, e-mail, téléphone) dans Admin > Paramètres.


| # | Question | Défaut appliqué si pas de réponse |
|---|---|---|

Action en attente côté Yassine : donner au jeton GitHub le droit de créer des dépôts, ou créer `moroccotravelride2` vide à la main.

## 6. Prochaine étape précise

Phase 2 (SaaS Standard), découpage proposé (chaque étape validée séparément) :

| Étape | Contenu |
|---|---|
| 6 ✅ | Abonnements et feature gating (`plans`, `plan_features`, `subscriptions`, essai 14 jours V2, `has_feature`, `<FeatureGate>`), journal d'audit, vérification des sociétés par l'admin (liste, documents, valider / suspendre) |
| 7 ✅ | Onboarding transporteur (assistant : société, agrément, premier véhicule, premier chauffeur) + stockage privé des documents |
| 8 ✅ | Véhicules, chauffeurs, clients (tables avec recherche, filtres, pagination serveur, export CSV) |
| 9 ✅ | Trajets et planning (jour / semaine, affectation, conflits bloquants avec dérogation owner / manager) |
| 10 ✅ | Facturation (numérotation sans trou, PDF, émission immuable, avoirs) et paiements |
| 11 ✅ | Tableau de bord du jour et recette de la Phase 2 (une semaine d'activité de bout en bout) |
