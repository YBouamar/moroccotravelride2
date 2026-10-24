# Avancement

**Dernière mise à jour** : 2026-10-24 · **Phase en cours** : Phase 0 terminée, en attente de validation · **Prochaine étape** : Étape 2 (Phase 1a, socle monorepo)

## 1. Plan d'exécution par étapes

Chaque étape se termine par une synthèse, une procédure de test manuel, les tests au vert, les docs à jour et un **arrêt pour validation de Yassine**.

| Étape | Phase | Contenu | Critère de validation | État |
|---|---|---|---|---|
| 1 | 0 | Cadrage : dépôt git, rangement des visuels, docs de contexte, commandes `.claude/`, questions ouvertes | `CLAUDE.md` + `PROGRESS.md` suffisent pour comprendre le plan | ✅ fait |
| 2 | 1a | Socle : pnpm + Turborepo, paquets `shared` / `db` / `ui` / `payments` vides mais câblés, TS strict, ESLint, Prettier, Vitest, CI GitHub Actions, gitleaks, versions figées | `pnpm lint typecheck test build` au vert en local et en CI | ⬜ |
| 3 | 1b | Web : Next.js, design system (tokens de la marque, shadcn/ui, composants de base), logos dérivés (favicon carré, icônes), i18n fr / en / ar + RTL, layouts public / SaaS / admin | Page d'accueil vide avec logo, bascule fr / en / ar avec RTL, contrastes AA | ⬜ |
| 4 | 1c | Supabase local : migrations identité (profiles, companies, company_members, company_documents, platform_settings, cities, vehicle_types), fonctions de sécurité, RLS + pgTAP, seed de base, types générés | `pnpm db:test` au vert, isolation société A / B prouvée | ⬜ |
| 5 | 1d | Auth : inscription transporteur (crée société `pending` + owner), connexion, mot de passe oublié, MFA admin, rate limiting, Turnstile, en-têtes de sécurité, sélection de société ; Expo initialisé (écran de connexion, i18n, icône) | **Critère Phase 1** : inscription, connexion, changement de langue avec RTL, isolation prouvée | ⬜ |
| 6 à 11 | 2 | SaaS Standard en sous-étapes : onboarding + vérification admin ; véhicules / chauffeurs / clients ; trajets + planning + conflits ; facturation (PDF, numérotation, avoirs) + paiements ; abonnements + feature gating | Une semaine d'activité gérée de bout en bout, facture conforme | ⬜ |
| 12 à 17 | 3 | Marketplace : villes + grilles ; recherche + résultats ; tunnel invité + 24 h ; paiement (mock puis CMI test) ; acceptation + conversion en trajet ; e-mails, lien magique, annulation, commissions, supervision admin | Casablanca vers Marrakech 800 MAD : 160 / 640 enregistrés, trajet au planning | ⬜ |
| 18 à 21 | 4 | V2 : dépenses ; app chauffeur (planning, statuts, dépense photo, hors ligne) ; localisation Realtime + carte ; purge | Position visible pendant le trajet seulement ; dépense hors ligne synchronisée | ⬜ |
| 22 à 24 | 5 | V3 : entretien et pièces ; échéances + rappels planifiés ; consommation | Rappels J-30, J-7, J-1 sur une assurance | ⬜ |
| 25 à 27 | 6 | Pilotage : indicateurs ; reversements + exports ; audit consultable, avis et modération | Tableau de bord admin chiffré | ⬜ |
| 28 à 30 | 7 | Durcissement : audit sécurité, charge, SEO, pages légales, staging, sauvegarde testée, EAS, checklist | Checklist de lancement verte | ⬜ |

Le découpage des phases 2 à 7 en étapes sera affiné au début de chaque phase.

## 2. Fait

- Dépôt git initialisé (branche `main`), visuels de marque rangés dans `assets/brand/` (ADR-011).
- Fichiers de contexte créés : `CLAUDE.md`, `README.md`, `.gitignore`, `.env.example`, `docs/*` (13 fichiers), `apps/web/CLAUDE.md`, `apps/driver/CLAUDE.md`.
- Commandes `/debut-session`, `/fin-session`, `/decision`, `/audit-securite` et `.claude/settings.json`.
- 11 ADR rédigés, dont 7 hypothèses `À CONFIRMER`.
- Analyse de la présentation de marque : palette, contrastes mesurés (turquoise clair interdit en texte sur fond clair), règles d'usage des trois logos.
- Versions des dépendances relevées sur npm.

## 3. En cours

Rien. Attente de validation de l'étape 1.

## 4. Bloqué / points d'attention

- `docs/PROJECT_OVERVIEW.md` est **provisoire** : le dossier de référence n'a pas été fourni (Q1).
- `pnpm` et le CLI Supabase ne sont pas installés sur le poste (installés au début de l'étape 2, avec ton accord).
- Logos sans transparence : utilisables sur fond clair uniquement (Q8).

## 5. Questions ouvertes pour Yassine

| # | Question | Défaut appliqué si pas de réponse |
|---|---|---|
| Q1 | Peux-tu fournir `MoroccoTravelRide_Project_Overview.md` ? | Version reconstituée depuis le prompt |
| Q2 | **Flux de paiement** : la plateforme encaisse-t-elle 100 % puis reverse 80 % (implique un possible statut d'encaissement pour compte de tiers, à valider par un juriste), ou paiement direct au transporteur + facture de commission ? As-tu déjà un contact / contrat CMI (ou autre : Payzone, YouCan Pay) ? | Encaissement plateforme, adaptateur mock (ADR-001) |
| Q3 | **Acceptation** : délai de 2 h pour que le transporteur accepte, puis réaffectation / remboursement par l'admin ? Ou confirmation instantanée ? | 2 h, admin réaffecte (ADR-002) |
| Q4 | **Annulation voyageur** : 100 % avant 48 h, 50 % entre 48 h et 24 h, 0 % ensuite ? En cas de remboursement partiel, la plateforme garde-t-elle sa commission sur la part retenue ? | Oui à la grille, partage au prorata (ADR-004) |
| Q5 | **Hébergement** : accord pour une région UE (Paris ou Francfort) avec déclaration de transfert à la CNDP ? | Région UE la plus proche (ADR-008) |
| Q6 | **Nom de domaine** : déjà réservé (ex. moroccotravelride.com / .ma) ? | Domaines Vercel de préview |
| Q7 | **Comptes existants** : GitHub (nom du dépôt), Supabase (organisation), Vercel, Resend, Sentry, Cloudflare ? Je vois des connecteurs Supabase et Vercel actifs dans cette session : faut-il les utiliser pour staging plus tard ? | Tout en local jusqu'à la fin de la Phase 1 |
| Q8 | **Logos** : peux-tu fournir des versions à **fond transparent** (idéalement SVG) et la déclinaison **blanche / monochrome** pour fonds sombres, ainsi que le nom de la **police** du logo ? | PNG fournis sur fond clair, pastille blanche sur fond sombre, Montserrat + Inter (UX.md §6) |
| Q9 | **Abonnements et fiscalité** : essai gratuit (durée, offre) ? As-tu un expert-comptable pour valider TVA et mentions de facture ? | Essai 14 jours V2, TVA paramétrable sans valeur imposée (ADR-005, ADR-007) |
| Q10 | **Planning** : un conflit (chauffeur ou véhicule déjà occupé) doit-il **bloquer** l'affectation ou seulement **alerter** ? | Bloquant, dérogation possible par owner / manager (BR-114) |

## 6. Prochaine étape précise

Étape 2 (Phase 1a) : installer pnpm (corepack) et le CLI Supabase en dépendance de dev, créer le monorepo (pnpm workspaces, Turborepo, paquets internes), configurer TS strict, ESLint, Prettier, Vitest avec un premier test réel (`computeCommission` : 80 000 c à 20 % donne 16 000 / 64 000), workflow CI, hook gitleaks, figer les versions dans ARCHITECTURE.md.
