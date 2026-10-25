# apps/driver : spécificités

> Application non encore initialisée (squelette en étape 5, fonctionnalités en Phase 4).

## Structure prévue

- `app/` (expo-router) : `(auth)/login`, `(tabs)/today`, `trip/[id]`, `expense/new`.
- `src/lib/supabase.ts` : client anon, session dans `expo-secure-store`. **Jamais de service_role.**
- `src/lib/offline-queue.ts` : file locale des actions (statuts, dépenses) rejouée au retour du réseau, idempotente (clé client).
- `src/i18n/` : i18next, fr / en / ar avec `I18nManager` pour le RTL.
- `assets/` : icône (`MTR_icone_app_navy.png` 1024 px), adaptive icon (`MTR_symbole_couleur` sur fond bleu nuit), splash (`MTR_vertical_negatif` sur bleu nuit), copiés depuis `assets/brand/logos/`.

## Règles locales

- Localisation (`expo-location` + tâche de fond) active **uniquement** entre « Démarrer » et « Terminer » un trajet, avec indicateur permanent et message explicatif.
- Zones tactiles ≥ 56 px pour les actions principales, actions en bas d'écran, contraste élevé.
- Itinéraire : liens profonds Google Maps / Waze, pas de navigation intégrée.

## Pièges connus

(aucun pour l'instant)
