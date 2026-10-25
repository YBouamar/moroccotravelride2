# Avancement

**Dernière mise à jour** : 2026-10-25 · **Phase en cours** : Phase 0 terminée (réponses de Yassine intégrées), en attente du feu vert pour l'étape 2 · **Prochaine étape** : Étape 2 (Phase 1a, socle monorepo)

## 1. Plan d'exécution par étapes

Chaque étape se termine par une synthèse, une procédure de test manuel, les tests au vert, les docs à jour et un **arrêt pour validation de Yassine**.

| Étape | Phase | Contenu | Critère de validation | État |
|---|---|---|---|---|
| 1 | 0 | Cadrage : dépôt git, rangement des visuels, docs de contexte, commandes `.claude/`, questions ouvertes, intégration des réponses | `CLAUDE.md` + `PROGRESS.md` suffisent pour comprendre le plan | ✅ fait |
| 2 | 1a | Socle : pnpm + Turborepo, paquets `shared` / `db` / `ui` / `payments` vides mais câblés, TS strict, ESLint, Prettier, Vitest, `pnpm check` + hook pre-commit (gitleaks), workflow GitHub prêt mais inactif (ADR-015), versions figées | `pnpm check` au vert en local | ⬜ |
| 3 | 1b | Web : Next.js, design system (tokens de la marque, shadcn/ui, composants de base), logos dérivés (favicon carré, icônes), i18n fr / en / ar + RTL, layouts public / SaaS / admin | Page d'accueil vide avec logo, bascule fr / en / ar avec RTL, contrastes AA | ⬜ |
| 4 | 1c | Supabase local : migrations identité (profiles, companies, company_members, company_documents, platform_settings, cities, vehicle_types), fonctions de sécurité, RLS + pgTAP, seed de base, types générés | `pnpm db:test` au vert, isolation société A / B prouvée | ⬜ |
| 5 | 1d | Auth : inscription transporteur (crée société `pending` + owner), connexion, mot de passe oublié, MFA admin, rate limiting, Turnstile, en-têtes de sécurité, sélection de société ; Expo initialisé (écran de connexion, i18n, icône) | **Critère Phase 1** : inscription, connexion, changement de langue avec RTL, isolation prouvée | ⬜ |
| 6 à 11 | 2 | SaaS Standard en sous-étapes : onboarding + vérification admin ; véhicules / chauffeurs / clients ; trajets + planning + conflits ; facturation (PDF, numérotation, avoirs) + paiements ; abonnements + feature gating | Une semaine d'activité gérée de bout en bout, facture conforme | ⬜ |
| 12 à 17 | 3 | Marketplace : villes + grilles ; recherche + résultats ; tunnel invité + 24 h ; acceptation + conversion en trajet ; paiement hors ligne (virement, espèces) + registre des commissions + compensation ; e-mails, lien magique, annulation, supervision admin | Casablanca vers Marrakech 800 MAD : 160 / 640 enregistrés, trajet au planning | ⬜ |
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
  - Docs mises à jour : BUSINESS_RULES (nouvelle machine à états), ARCHITECTURE, DATA_MODEL, UX, SECURITY (§2.9 serveur), RUNBOOK, TESTING, BACKLOG, PROJECT_OVERVIEW, CLAUDE.md.

## 3. En cours

Rien. Attente du feu vert pour l'étape 2.

## 4. Bloqué / points d'attention

- `pnpm` et le CLI Supabase ne sont pas installés sur le poste (installés au début de l'étape 2, avec ton accord).
- Pas de dépôt distant : le code n'existe que sur ce poste (ADR-015).
- Juridique À VÉRIFIER : encaissement d'espèces pour le compte des transporteurs, mentions de facture, TVA, CNDP.

## 5. Questions ouvertes pour Yassine

Réglées le 2026-10-25 : Q1 (dossier produit : document reconstitué, à relire), Q2 (paiement, précisions en Q11 à Q14), Q3, Q4, Q5 (VPS Contabo), Q6 (pas de domaine), Q7 (pas de dépôt), Q8 (kit fourni ; police identifiée : Montserrat), Q9, Q10.

| # | Question | Défaut appliqué si pas de réponse |
|---|---|---|
| Q11 | **Espèces** : concrètement, à qui le voyageur remet-il l'argent ? Au chauffeur (qui le reverse ensuite à la plateforme ?), à un agent de la plateforme, ou en agence ? | Remis le jour du trajet, confirmé par l'admin à réception |
| Q12 | **Virement** : doit-il être reçu avant le trajet (si oui, combien de temps avant), ou peut-il être fait après ? Que se passe-t-il s'il n'arrive pas ? | Avant la prise en charge ; sinon le transporteur peut annuler |
| Q13 | **Carte bancaire en ligne** : abandonnée, ou seulement reportée ? | Reportée (abstraction conservée, CMI au backlog P1) |
| Q14 | **Compensation** : relevé net mensuel par transporteur (80 % des espèces moins 20 % des virements), avec virement ou facture du solde ? | Mensuelle |
| Q15 | **Déploiement sur le VPS** : d'accord pour Coolify (interface web, HTTPS et sauvegardes automatiques), ou préfères-tu docker compose géré à la main ? | Coolify |
| Q16 | **Dépôt git distant** : d'accord pour créer un dépôt privé (GitHub ou GitLab) avant la Phase 2 ? Il sert aussi de sauvegarde du code. | Rappel à la fin de la Phase 1 |

## 6. Prochaine étape précise

Étape 2 (Phase 1a) : installer pnpm (corepack) et le CLI Supabase en dépendance de dev, créer le monorepo (pnpm workspaces, Turborepo, paquets internes), configurer TS strict, ESLint, Prettier, Vitest avec un premier test réel (`computeCommission` : 80 000 c à 20 % donne 16 000 / 64 000), script `pnpm check`, hook pre-commit gitleaks, workflow CI prêt, figer les versions dans ARCHITECTURE.md.
