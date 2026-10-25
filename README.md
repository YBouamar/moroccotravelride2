# MoroccoTravelRide

<img src="assets/brand/logos/svg/MTR_horizontal_couleur.svg" alt="MoroccoTravelRide" width="360" />

Plateforme marocaine de transport touristique : **marketplace** de transferts intra-ville et inter-villes auprès de transporteurs agréés, et **SaaS de gestion** pour ces transporteurs (trajets, chauffeurs, véhicules, facturation, dépenses, application chauffeur, parc).

> Statut : **Phase 1 en cours** (socle et application web). Voir [docs/PROGRESS.md](docs/PROGRESS.md).

## Démarrer

Prérequis : Node 24, pnpm 12, Docker Desktop (base locale à partir de l'étape 4), gitleaks.

```
pnpm install
pnpm dev      # http://localhost:3000
pnpm check    # contrôles complets
```

Toutes les commandes sont dans [CLAUDE.md](CLAUDE.md).

## Documentation

- [CLAUDE.md](CLAUDE.md) : mémoire principale, conventions, règles non négociables
- [docs/PROGRESS.md](docs/PROGRESS.md) : état courant, plan, questions ouvertes
- [docs/](docs/) : produit, règles métier, architecture, modèle de données, UX, sécurité, décisions, tests, exploitation

## Marque

Kit officiel dans [assets/brand/logos/](assets/brand/logos/) (SVG, PNG transparents, favicons). Ne pas modifier : les apps en reçoivent des copies par script.
