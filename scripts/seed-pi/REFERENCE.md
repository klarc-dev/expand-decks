# Seed PI — guide d'édition

Deck modulaire : un fichier par unité logique dans `slides/`, assemblé par
`assemble.ts` (tri alphabétique du nom de fichier → ordre des slides).

## Commandes

```bash
# (ré)assembler + upsert la présentation (queue un build)
pnpm dlx tsx --env-file=.env scripts/seed-pi/assemble.ts
# construire le SPA + PDF
pnpm jobs:run
```

Slug : `gerer-la-pi-entreprise-innovation` · Org : Klarc (id 1, `SEED_PI_ORG_ID` pour changer).

## Convention de nommage

`NNN-nom.ts` — préfixe à 3 chiffres, **pas de 10 par défaut** (010, 020, 030…)
pour pouvoir insérer (065) ou réordonner sans renommer tout le reste.

Chaque fichier `export default` une fonction `(ctx) => Slide | Slide[]`.
`ctx.rt(markdown)` convertit du markdown en état Lexical (pour les champs rich text).

## Blocs disponibles (préférer les blocs typés, éditables en admin)

| Bloc | Usage | Champs clés |
|---|---|---|
| `cover` | couverture | title, subtitle, footerLeft/Right, surface |
| `section` | intercalaire de partie sombre | number, title, subtitle |
| `statement` | affirmation/encart | title, body, footer, variant, surface |
| `cardGrid` | grille de cartes numérotées | title, sidebarText, columns:'2'/'3'/'4', cards:[{number,title,description}] |
| `twoCols` | 2 colonnes (gauche intro + droite cartes) | title, eyebrow, intro, rightCards:[{title,description}] |
| `table` | tableau de référence | title, eyebrow, surface, columns:[{header}], rows:[{cells:[{value}]}] |
| `timeline` | frise horizontale 2-6 étapes | title, steps:[{label,description}], footer |
| `mermaid` | diagramme/arbre de décision | title, source (code mermaid brut), caption |
| `cta` | clôture/contact | title, subtitle, primaryAction, secondaryAction, footerNote |

## Règles de qualité (irréprochable)

1. **Citations verbatim** — toute référence légale (L.611-7 CPI, art. 54 CBE,
   eIDAS, Cass. com…) est recopiée à l'identique, jamais paraphrasée.
2. **rich text** — tous les champs `description`/`value`/`intro`/`body`/`subtitle`
   passent par `rt('...')`. Le markdown `**gras**`, `*italique*`, listes `-` est rendu.
   Les `eyebrow`/`title`/`header`/`label`/`number`/`caption` sont des **strings nues** (pas de rt).
3. **table ≤ 5 lignes / slide** — au-delà, scinder en `(1/2)`, `(2/2)` (cf. 060+065).
   Idem `cardGrid` : 4 cartes max en 2 colonnes, 6 en 3 colonnes.
4. **table : 2-5 colonnes**, chaque ligne a exactement autant de cellules que de colonnes.
5. **mermaid** : `source` = code brut SANS les ``` ; labels entre guillemets
   `["..."]` s'ils contiennent ponctuation/apostrophes ; pas plus de ~7 nœuds.
6. **arbres de décision ASCII** du draft → bloc `mermaid` (flowchart TD).
7. **listes à puces longues** → `cardGrid` ou `twoCols`, pas un pavé `statement`.
8. **Utiliser `section` pour les intercalaires sombres**. La surface est imposée par le template.
9. Pas de bloc `markdown` brut sauf nécessité absolue (non éditable proprement en admin).

## Apostrophes

Utiliser l'apostrophe typographique `’` dans le texte rendu (cohérence charte),
mais `'` ASCII reste acceptable dans les chaînes JS échappées.
