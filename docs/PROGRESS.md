# Avancement

**Dernière mise à jour** : 2026-10-25 · **Phase en cours** : Phase 1, étape 4 terminée, en attente de validation · **Prochaine étape** : Étape 5 (Phase 1d, authentification, fin de Phase 1)

## 1. Plan d'exécution par étapes

Chaque étape se termine par une synthèse, une procédure de test manuel, les tests au vert, les docs à jour et un **arrêt pour validation de Yassine**.

| Étape | Phase | Contenu | Critère de validation | État |
|---|---|---|---|---|
| 1 | 0 | Cadrage : dépôt git, rangement des visuels, docs de contexte, commandes `.claude/`, questions ouvertes, intégration des réponses | `CLAUDE.md` + `PROGRESS.md` suffisent pour comprendre le plan | ✅ fait |
| 2 | 1a | Socle : pnpm + Turborepo, paquets `shared` / `db` / `ui` / `payments` vides mais câblés, TS strict, ESLint, Prettier, Vitest, `pnpm check` + hook pre-commit (gitleaks), workflow GitHub prêt mais inactif (ADR-015), versions figées | `pnpm check` au vert en local | ✅ fait |
| 3 | 1b | Web : Next.js, design system (tokens de la marque, shadcn/ui, composants de base), logos dérivés (favicon carré, icônes), i18n fr / en / ar + RTL, layouts public / SaaS / admin | Page d'accueil vide avec logo, bascule fr / en / ar avec RTL, contrastes AA | ✅ fait |
| 4 | 1c | Supabase local : migrations identité (profiles, companies, company_members, company_documents, platform_settings, cities, vehicle_types), fonctions de sécurité, RLS + pgTAP, seed de base, types générés | `pnpm db:test` au vert, isolation société A / B prouvée | ✅ fait |
| 5 | 1d | Auth : inscription transporteur (crée société `pending` + owner), connexion, mot de passe oublié, MFA admin, rate limiting, Turnstile, en-têtes de sécurité, sélection de société ; Expo initialisé (écran de connexion, i18n, icône) | **Critère Phase 1** : inscription, connexion, changement de langue avec RTL, isolation prouvée | ⬜ |
| 6 à 11 | 2 | SaaS Standard en sous-étapes : onboarding + vérification admin ; véhicules / chauffeurs / clients ; trajets + planning + conflits ; facturation (PDF, numérotation, avoirs) + paiements ; abonnements + feature gating | Une semaine d'activité gérée de bout en bout, facture conforme | ⬜ |
| 12 à 17 | 3 | Marketplace : villes + grilles ; recherche + résultats ; tunnel invité + 24 h ; acceptation + conversion en trajet ; paiement hors ligne (virement, espèces au chauffeur) + registre des commissions + relevé mensuel ; e-mails, lien magique, annulation, supervision admin | Casablanca vers Marrakech 800 MAD : 160 / 640 enregistrés, trajet au planning | ⬜ |
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

## 3. En cours

Rien. Attente de validation de l'étape 4.

## 4. Bloqué / points d'attention

- **Dépôt GitHub non créé** : la création de `moroccotravelride2` échoue toujours (403, nouvelles tentatives aux étapes 3 et 4) : le jeton n'a pas le droit de créer des dépôts. À corriger côté Yassine, puis création + push des commits.
- Juridique À VÉRIFIER : facture mensuelle de commission (TVA), plafonds légaux des paiements en espèces, mentions de facture, CNDP.

## 5. Questions ouvertes pour Yassine

Réglées le 2026-10-25 : Q1 à Q16. Dernières réponses : espèces remises au chauffeur puis au dirigeant, commission réglée chaque mois en espèces ou virement instantané (ADR-016) ; virement avant le trajet ; carte en ligne reportée ; relevé mensuel ; Coolify ; dépôt privé.

Q17 (suspension 15 jours après l'échéance) et Q18 (GitHub) réglées.

| # | Question | Défaut appliqué si pas de réponse |
|---|---|---|
| Q19 | Un transporteur peut-il activer ou désactiver lui-même sa visibilité sur la marketplace, ou est-ce réservé à l'admin (ce qui l'empêche de réapparaître seul après une suspension pour relevé impayé) ? | Réservé à l'admin |
| Q20 | Capacités indicatives par type de véhicule : berline 3, 4x4 4, van 7, minibus 17, autocar 50 passagers. Correct pour le marché marocain ? | Ces valeurs (la capacité réelle est saisie par véhicule) |

Action en attente côté Yassine : donner au jeton GitHub le droit de créer des dépôts, ou créer `moroccotravelride2` vide à la main.

## 6. Prochaine étape précise

Étape 5 (Phase 1d) : clients Supabase dans `apps/web` (`@supabase/ssr`, cookies `HttpOnly`), inscription transporteur (compte + `create_company`), connexion, mot de passe oublié, confirmation d'e-mail (Mailpit en local), protection des espaces SaaS et admin dans `proxy.ts`, MFA admin, CSP à nonces, Turnstile et rate limiting, comptes de démonstration dans `seed.sql`, squelette Expo de l'app chauffeur (connexion, i18n, icône). Fin de la Phase 1.
