# Expérience utilisateur

## 1. Principes généraux

- **Mobile first** pour la marketplace et l'app chauffeur ; **desktop first, responsive** pour le SaaS et l'admin.
- **Trois langues** (fr défaut, en, ar) avec sélecteur visible dans l'en-tête ; **RTL complet** en arabe (`dir="rtl"`, propriétés logiques CSS, icônes directionnelles inversées).
- **WCAG 2.1 AA** : contrastes (voir §6.3), navigation clavier, labels explicites, focus visibles (anneau `accent` 2 px + décalage), cibles tactiles ≥ 44 px.
- **États systématiques** : chargement (skeletons), vide (illustration + action suggérée), erreur (message clair + bouton « Réessayer »), succès (toast).
- **Prix transparents** : prix tout compris affiché dès les résultats, identique au paiement.
- **Confirmation explicite** avant toute action irréversible (émission de facture, annulation, refus de réservation) via boîte de dialogue qui rappelle la conséquence.
- **Performance** : LCP < 2,5 s sur mobile 4G pour la marketplace (images optimisées, logo en `priority`, polices auto-hébergées).

## 2. Parcours voyageur (marketplace)

1. **Accueil** : moteur de recherche au-dessus de la ligne de flottaison (départ, arrivée, date, heure, passagers, bagages). Créneaux à moins de 24 h désactivés avec phrase explicative sous le champ. Réassurance : transporteurs agréés vérifiés, prix fixes, annulation flexible, assistance.
2. **Résultats** : cartes véhicule + transporteur (photo, capacité, bagages, note, badge « Agréé vérifié », prix total). Filtres type / prix / note, tri prix ou note. Sur mobile, filtres dans une feuille modale.
3. **Détail et options** : conditions d'annulation, inclus, informations transporteur.
4. **Informations passager** : nom, e-mail, téléphone avec indicatif, numéro de vol (suggéré si départ aéroport), adresse précise, remarques. Sans compte.
5. **Mode de paiement** (ADR-016) : « Virement bancaire avant le trajet » ou « Espèces au chauffeur », avec une phrase claire sur le moment du paiement. Pas de paiement en ligne au lancement.
6. **Demande envoyée** : référence `MTR-XXXXXX`, récapitulatif, compte à rebours « Le transporteur confirme sous 2 h ».
7. **Confirmation** (après acceptation) : e-mail + bon PDF (logo vertical), instructions de paiement (RIB du transporteur et date limite, ou montant exact à remettre au chauffeur), ajout au calendrier (.ics).
8. **Gérer ma réservation** : référence + e-mail, lien magique, annulation selon la politique avec montant remboursé affiché avant confirmation.
9. **Après le trajet** : e-mail de demande d'avis.

## 3. Parcours transporteur (SaaS)

1. **Inscription et onboarding** en étapes avec barre de progression : société, agrément, premier véhicule, premier chauffeur, grille tarifaire (optionnelle). Bandeau « En attente de vérification » tant que l'admin n'a pas validé.
2. **Tableau de bord du jour** : trajets du jour, non affectés, réservations à accepter (compte à rebours), alertes, CA du mois.
3. **Planning** : calendrier jour / semaine + liste ; affectation avec détection de conflits.
4. **Réservations marketplace** : accepter / refuser avec motif, puis affecter ; confirmer le paiement reçu (virement ou espèces) ; consulter et régler le relevé mensuel de commissions.
5. **Flotte, chauffeurs, clients** : tables avec recherche, filtres, tri, pagination serveur, export CSV.
6. **Facturation** : depuis un ou plusieurs trajets, aperçu PDF avant émission, envoi e-mail, suivi des paiements.
7. **Dépenses (V2)**, **Suivi en direct (V2)**, **Parc (V3)** : visibles mais verrouillés (cadenas + « Passer à V2 / V3 ») si hors offre.
8. **Abonnement** : offre actuelle, comparatif, factures.

Navigation SaaS : barre latérale bleu nuit avec `MTR_horizontal_negatif` (ou `MTR_symbole_negatif` en barre repliée), contenu sur fond `background`.

## 4. Parcours chauffeur (app mobile)

Connexion simple, écran « Aujourd'hui » chronologique, détail trajet (client, vol, adresse, appel, « Itinéraire » Google Maps / Waze), démarrer / terminer avec indicateur permanent de localisation, déclaration de dépense en moins de 30 s (photo, montant, catégorie), file hors ligne. Grandes zones tactiles (≥ 56 px pour les actions principales), contraste élevé pour la lecture en plein soleil, usage à une main (actions en bas d'écran).

## 5. Back-office administrateur

Validation des sociétés et documents, supervision des réservations (réaffectation, remboursement, litiges), commissions et reversements, abonnements, paramètres, journal d'audit, indicateurs.

## 6. Identité visuelle

Source : `assets/brand/presentation-marque.png` (présentation de marque fournie par Yassine).

### 6.1 Le logo

Monogramme « M » dont les deux arches forment des montagnes (Atlas) en dégradé turquoise, traversé par une **route sinueuse**, avec une **kasbah** et un **palmier**. Mot-symbole « Morocco » en bleu nuit (blanc en négatif) + « TravelRide » en turquoise ; signature en capitales espacées « MOVE SMARTER. MANAGE BETTER. ».

Sources officielles : `assets/brand/logos/` (SVG vectoriels et PNG transparents, ADR-014). Les fichiers v1 à fond blanc sont archivés dans `assets/brand/v1/` et ne servent plus.

| Variante | Fichier | Usage |
|---|---|---|
| Horizontal couleur | `svg/MTR_horizontal_couleur.svg` | En-tête marketplace (fond clair), e-mails, factures et relevés PDF |
| Horizontal négatif | `svg/MTR_horizontal_negatif.svg` | Barre latérale SaaS et admin (bleu nuit), pied de page sombre, mode sombre |
| Horizontal blanc | `svg/MTR_horizontal_blanc.svg` | Sur photo ou dégradé turquoise (hero, bannières) |
| Vertical couleur / négatif / blanc | `svg/MTR_vertical_*.svg` | Pages d'authentification, onboarding, page 404, bon de réservation PDF, splash mobile |
| Symbole couleur / négatif / blanc | `svg/MTR_symbole_*.svg` | En-tête mobile étroit, barre latérale repliée, filigrane, loader |
| Icône d'app navy / blanc | `png/MTR_icone_app_*.png` (1024 px) | Icône de l'app chauffeur (iOS, Android adaptive icon), icône PWA |
| Favicons | `favicon/favicon.ico`, `MTR_icone_navy_{32,180,192,512}.png` | Favicon, `apple-touch-icon` (180), manifeste PWA (192, 512), notifications |

Règles :
- Fond clair : version `couleur` ; fond bleu nuit : version `negatif` ; photo ou dégradé : version `blanc`.
- Zone de protection : marge minimale égale à la hauteur de la lettre « o ». Taille minimale du logo horizontal : 140 px de large ; en dessous, utiliser le symbole seul.
- Ne jamais recolorer, déformer ni ajouter d'effets au logo.

### 6.2 Palette et tokens

Répartition indicative : 60 % fonds clairs, 25 % bleu nuit, 15 % turquoise.

| Token | Clair | Sombre (proposé) | Usage |
|---|---|---|---|
| `primary` | `#102A43` bleu nuit | `#E6EEF4` | Confiance, titres, texte fort, barre latérale SaaS |
| `secondary` | `#087E8B` turquoise profond | `#3CC4D2` | Navigation, liens, boutons secondaires |
| `accent` | `#21B6A8` turquoise clair | `#21B6A8` | Boutons d'action, états actifs, focus |
| `background` | `#F4F8FA` | `#0B1D2E` | Fond de page |
| `surface` | `#FFFFFF` | `#102A43` | Cartes, modales |
| `foreground` | `#102A43` | `#F4F8FA` | Texte courant |
| `muted` | `#52667A` | `#9FB3C8` | Texte secondaire (AA vérifié par test : 5,55 sur fond clair) |
| `border` | `#D9E2EC` | `#243B53` | Séparateurs |
| `danger` / `warning` / `success` | à définir en Phase 1 avec contraste AA | | États |

Dégradé de marque (bannières, hero, splash) : `linear-gradient(135deg, #087E8B, #21B6A8)` avec texte bleu nuit, ou fond bleu nuit avec motif de route turquoise.

### 6.3 Règles de contraste (mesurées, voir ADR-010)

| Combinaison | Ratio | Verdict |
|---|---|---|
| Bleu nuit sur blanc / fond clair | 14,64 / 13,70 | AA et AAA |
| Turquoise profond sur blanc | 4,81 | AA texte normal |
| Turquoise profond sur fond clair | 4,50 | AA limite : texte ≥ 16 px |
| Blanc sur turquoise profond | 4,81 | AA (boutons secondaires) |
| Bleu nuit sur turquoise clair | 5,80 | AA : **bouton principal** |
| Turquoise clair sur blanc | 2,52 | **Interdit pour du texte** |
| Turquoise clair sur bleu nuit | 5,80 | AA (texte sur fond sombre) |

### 6.4 Typographie (ADR-014)

Le texte des logos est vectorisé, le nom de la police n'est donc pas lisible dans les fichiers. La comparaison des formes indique **Montserrat** (mot-symbole en SemiBold / Bold, signature en Medium avec `letter-spacing: 0.3em`). Choix :

- **Montserrat** (600 / 700) : titres, chiffres clés, boutons ;
- **Inter** (400 / 500 / 600) : texte courant, tableaux du SaaS, formulaires ;
- **Noto Sans Arabic** : interface en arabe.

Toutes sous licence libre (SIL OFL), auto-hébergées via `next/font` (aucun appel à Google à l'exécution).

### 6.5 Composants clés (à construire en Phase 1)

Bouton (primaire accent / texte bleu nuit, secondaire turquoise profond, fantôme, danger), champ, sélecteur, sélecteur de date avec règle des 24 h, carte, badge (« Agréé vérifié » turquoise profond), tableau, toast, dialogue de confirmation, skeleton, état vide, `<FeatureGate>`, sélecteur de langue, en-tête avec logo, barre latérale SaaS.

Rayons : 12 px pour les cartes et boutons (cohérent avec les angles arrondis de l'icône), 24 px pour les icônes d'app.
