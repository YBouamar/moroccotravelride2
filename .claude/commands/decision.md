---
description: Ajouter une décision (ADR court) dans docs/DECISIONS.md
argument-hint: [sujet de la décision]
---

Ajoute une entrée ADR dans `docs/DECISIONS.md` à partir de la discussion en cours. Sujet : $ARGUMENTS

1. Lis `docs/DECISIONS.md` et prends le numéro suivant (`ADR-XXX`, trois chiffres).
2. Rédige au format existant : titre, date du jour, statut (`ACCEPTÉE` si Yassine a tranché, sinon `À CONFIRMER`), contexte, décision, alternatives, conséquences.
3. Si elle remplace une décision existante, ne supprime rien : ajoute `REMPLACÉE PAR ADR-XXX` au statut de l'ancienne.
4. Si la décision modifie une règle métier, mets à jour `docs/BUSINESS_RULES.md` (statut et source). Si elle ajoute une dépendance, justifie-la ici.
5. Pas de tiret cadratin. Montre l'entrée ajoutée à Yassine.
