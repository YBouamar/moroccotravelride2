---
description: Auditer le code existant selon la section sécurité et produire un rapport
---

Audit de sécurité de MoroccoTravelRide. Lecture et analyse uniquement : ne corrige rien sans validation.

Référentiel : `docs/SECURITY.md` (matrice de permissions et sections 2.1 à 2.8).

Vérifie au minimum, preuves à l'appui (fichier:ligne) :

1. **RLS** : chaque table de `supabase/migrations/` a `enable row level security` et des politiques ; aucune politique `using (true)` hors référentiels publics ; chaque politique a un test dans `supabase/tests/`. Lance `pnpm db:test` si possible.
2. **service_role** : n'apparaît que dans du code serveur (`server-only`, route handlers, edge functions), jamais dans `apps/driver`, ni dans un fichier client, ni dans une variable `NEXT_PUBLIC_` / `EXPO_PUBLIC_`.
3. **Server Actions et route handlers** : session, rôle, appartenance société, validation Zod ; aucun `company_id` lu depuis l'entrée client sans contrôle.
4. **Auth** : MFA admin (`aal2`), rate limiting, Turnstile, cookies.
5. **En-têtes** : CSP, HSTS, Permissions-Policy dans la config Next.js / middleware.
6. **XSS** : recherche de `dangerouslySetInnerHTML`, `eval`, `innerHTML`.
7. **Fichiers** : buckets privés, chemins préfixés `company_id`, URL signées, validation MIME / taille.
8. **Paiements** : vérification de signature, idempotence, montant recalculé serveur.
9. **Données personnelles** : localisation limitée à `in_progress`, purge, logs sans PII, Sentry filtré.
10. **Secrets** : `gitleaks detect` si disponible, sinon recherche de motifs de clés ; `.env*` ignorés ; `pnpm audit`.

Produis `docs/sessions/AAAA-MM-JJ-audit-securite.md` avec : périmètre, résumé, tableau des constats (gravité Critique / Haute / Moyenne / Basse, preuve, recommandation), mesures conformes. Mets à jour la section « Audits » et les statuts ✅ / 🟡 / ⬜ de `docs/SECURITY.md`. Pas de tiret cadratin.
