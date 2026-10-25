# apps/driver : spécificités

> Squelette créé à l'étape 5 (connexion, « Aujourd'hui »), fonctionnalités en Phase 4. Commandes : `pnpm --filter @mtr/driver dev | typecheck | test | build` (`build` = bundle Android Metro, vérifie la résolution du monorepo).

## Structure prévue

- `app/` (expo-router) : `index` (redirection selon la session), `login`, `today` ; à venir `trip/[id]`, `expense/new`.
- `src/lib/supabase.ts` : client avec clé publishable, session dans SecureStore via `chunked-storage.ts` (limite d'environ 2 Ko par entrée sur Android). **Jamais de clé service role.**
- `src/lib/offline-queue.ts` : file locale des actions (statuts, dépenses) rejouée au retour du réseau, idempotente (clé client).
- `src/i18n/` : i18next, fr / en / ar ; RTL par le style `direction` de la vue racine (pas d'`I18nManager`, pas de redémarrage).
- Icône, adaptive icon et splash référencés directement dans `assets/brand/logos/png` par `app.config.ts` ; images importées depuis le kit (`src/assets.d.ts` type les PNG).

## Règles locales

- Localisation (`expo-location` + tâche de fond) active **uniquement** entre « Démarrer » et « Terminer » un trajet, avec indicateur permanent et message explicatif.
- Zones tactiles ≥ 56 px pour les actions principales, actions en bas d'écran, contraste élevé.
- Itinéraire : liens profonds Google Maps / Waze, pas de navigation intégrée.

## Pièges connus

- React Native 0.88 : type de référence d'un champ = `ComponentRef<typeof TextInput>`, `ref` passé comme simple prop (React 19, sans `forwardRef`).
- Expo SDK 58 impose React 19.3.0 (le web est en 19.3.1) : garder `react` et `react-dom` alignés sur la version d'Expo dans ce paquet.
- L'app ne joint pas `127.0.0.1` depuis un émulateur ou un téléphone : voir RUNBOOK.
