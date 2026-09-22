<!-- GENERATED FILE. Run pnpm generate:agent-skills. Do not edit manually. -->
# Deck schema reference

This reference is generated from `src/blocks/spec/`, `src/documents/templates.ts`, and the attached layout contracts. It is the schema-aware companion to the handwritten operational guidance in the deck skills.

## Authoring invariants

- Block fields, Payload metadata, AI draftability, visible-text limits, prompt prose, semantic roles, and layout capacities come from the block-spec DSL.
- Use the exact `blockType` values below. Do not invent use-case-specific layouts or fields.
- Fields marked **not AI-draftable** may still be required when authoring a saved/rendered block.
- `footnotes` are generated as shared fields only for specs with citations enabled.
- Use `pnpm deck:seed <name>` and the typed seed data, not raw SQL or one-off tooling.

## Document templates

### Présentation 16:9 (`presentation`)
- Canvas: 1280 × 720 (16/9)
- Pages: 0–unbounded authored; agent target 3–40
- Allowed layouts: `cover`, `section`, `statement`, `twoCols`, `cardGrid`, `stats`, `quotes`, `cta`, `table`, `timeline`, `mermaid`, `agenda`
- Chrome: footer yes, logo yes, page numbers yes
- Guidance: Compose une présentation structurée : couverture en ouverture, progression pédagogique, puis appel à l’action en clôture.

```text
CONTRAT STRUCTUREL DU TEMPLATE (obligatoire, sans réordonner ni paginer automatiquement) :
- Nombre total de pages : minimum 0, sans maximum.
```

### Carrousel LinkedIn 4:5 (`linkedin-carousel`)
- Canvas: 1080 × 1350 (4/5)
- Pages: 2–20 authored; agent target 2–20
- Allowed layouts: `cover`, `statement`, `twoCols`, `cardGrid`, `stats`, `quotes`, `cta`, `timeline`
- Chrome: footer no, logo no, page numbers no
- Guidance: Compose un carrousel LinkedIn très concis : une idée principale par page, accroche immédiate, progression autonome au balayage et appel à l’action final. Réduis nettement la densité de texte par rapport à une présentation.

```text
CONTRAT STRUCTUREL DU TEMPLATE (obligatoire, sans réordonner ni paginer automatiquement) :
- Nombre total de pages : minimum 2, maximum 20.
```

### Rapport standardisé A4 (`standard-report`)
- Canvas: 794 × 1123 (794/1123)
- Pages: 6–12 authored; agent target 6–12
- Allowed layouts: `cover`, `section`, `statement`, `twoCols`, `stats`, `cta`, `table`, `agenda`
- Chrome: footer yes, logo yes, page numbers yes
- Guidance: Compose un rapport standardisé : couverture, sommaire, développement factuel avec au moins une page de chiffres clés, puis conclusion et prochaine étape.

```text
CONTRAT STRUCTUREL DU TEMPLATE (obligatoire, sans réordonner ni paginer automatiquement) :
- Nombre total de pages : minimum 6, maximum 12.
- Première page obligatoire : layout « cover ».
- Dernière page obligatoire : layout « cta ».
- Layout « cover » : minimum 1, maximum 1 occurrence(s).
- Layout « agenda » : minimum 1, maximum 1 occurrence(s).
- Layout « section » : maximum 3 occurrence(s).
- Layout « stats » : minimum 1, maximum 2 occurrence(s).
- Layout « table » : maximum 2 occurrence(s).
- Layout « cta » : minimum 1, maximum 1 occurrence(s).
```

### Publication visuelle carrée (`visual-publication`)
- Canvas: 1080 × 1080 (1/1)
- Pages: 1–1 authored; agent target 1–1
- Allowed layouts: `statement`, `cardGrid`, `stats`, `quotes`, `cta`
- Chrome: footer no, logo yes, page numbers no
- Guidance: Compose une publication visuelle autonome en une page, avec un message immédiatement lisible et une densité faible.

```text
CONTRAT STRUCTUREL DU TEMPLATE (obligatoire, sans réordonner ni paginer automatiquement) :
- Nombre total de pages : minimum 1, maximum 1.
```

### Fiche commerciale A4 (`sales-sheet`)
- Canvas: 794 × 1123 (794/1123)
- Pages: 1–1 authored; agent target 1–1
- Allowed layouts: `statement`, `twoCols`, `cardGrid`, `stats`, `quotes`, `cta`, `table`
- Chrome: footer yes, logo yes, page numbers no
- Guidance: Compose une fiche autonome en une page, structurée pour présenter clairement une proposition, ses preuves et une prochaine étape.

```text
CONTRAT STRUCTUREL DU TEMPLATE (obligatoire, sans réordonner ni paginer automatiquement) :
- Nombre total de pages : minimum 1, maximum 1.
```

## Layout blocks

### `cover`
- AI draftable: **yes**
- Payload label: Couverture
- Layout kind: `prose`
- Required semantic roles: `heading.title`
- Prompt summary: Diapositive d'ouverture
**Fields:**
- `pills` (raw)
  - Payload type: `array`
  - Rows: 0–4
  - Admin guidance: Libellés indépendants au-dessus du titre. Une ligne par pastille.
- `pills[].text` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 40
- `title` (title)
  - Maximum visible length: 180
- `subtitle` (raw)
  - Payload type: `richText`
  - Maximum visible length: 320
  - Admin guidance: Paragraphe descriptif sous le titre
- `intervenants` (raw, not AI-draftable)
  - Payload type: `array`
  - Rows: 0–4
  - Admin guidance: Personnes affichées sur la diapositive de couverture
- `intervenants[].user` (raw, not AI-draftable)
  - Payload type: `relationship`
  - Required in Payload
  - Admin guidance: Utilisateur affiché comme intervenant
- `intervenants[].description` (raw, not AI-draftable)
  - Payload type: `textarea`
  - Maximum visible length: 240
  - Admin guidance: Expertise ou sujets suivis, affichés sous la fonction
- `preview` (preview, not AI-draftable)

### `section`
- AI draftable: **yes**
- Payload label: Section
- Layout kind: `prose`
- Required semantic roles: `heading.title`
- Supports citations: yes
- Media: 1/1; placements: left, right
- Prompt summary: Intercalaire de section
**Fields:**
- `number` (raw)
  - Payload type: `text`
  - Maximum visible length: 8
  - Admin guidance: Numéro de section affiché (ex. "02")
- `title` (title)
  - Maximum visible length: 180
- `subtitle` (raw)
  - Payload type: `richText`
  - Maximum visible length: 280
  - Admin guidance: Description complémentaire sous le titre
- `image` (image, not AI-draftable)
- `imagePosition` (raw, not AI-draftable)
  - Payload type: `select`
  - Options: `right`, `left`
  - Admin guidance: Côté où l’image s’affiche quand une image est renseignée
- `footnotes` (raw)
  - Payload type: `array`
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 220
- `preview` (preview, not AI-draftable)

### `statement`
- AI draftable: **yes**
- Payload label: Affirmation
- Layout kind: `prose`
- Required semantic roles: `heading.title`
- Supports citations: yes
- Prompt summary: Affirmation ou citation mise en avant
**Fields:**
- `eyebrow` (eyebrow)
  - Maximum visible length: 80
- `title` (title)
  - Maximum visible length: 180
- `body` (raw)
  - Payload type: `richText`
  - Maximum visible length: 560
  - Admin guidance: Texte développant l’affirmation
- `footer` (raw)
  - Payload type: `richText`
  - Maximum visible length: 220
  - Admin guidance: Message clé mis en avant dans un encadré en bas de la diapositive. Un début « Enjeu : … » devient le cartouche de l’encadré.
- `variant` (raw)
  - Payload type: `select`
  - Options: `centered-hero`, `pull-quote`, `big-statement`, `split`
  - Admin guidance: Disposition : centered-hero (centré), pull-quote (citation), big-statement (énoncé large), split (titre/texte). Laisser vide pour une alternance automatique.
- `footnotes` (raw)
  - Payload type: `array`
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 220
- `preview` (preview, not AI-draftable)

### `twoCols`
- AI draftable: **yes**
- Payload label: Deux colonnes
- Layout kind: `composition`
- Required semantic roles: `heading.title`
- Collection capacities: collection.items ≤ 5
- Supports citations: yes
- Media: 1/1; placements: left, right
- Prompt summary: Deux colonnes avec cartes à droite
**Fields:**
- `eyebrow` (eyebrow)
  - Maximum visible length: 80
- `title` (title)
  - Maximum visible length: 180
- `lead` (raw)
  - Payload type: `richText`
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `intro` (raw)
  - Payload type: `richText`
  - Maximum visible length: 480
  - Admin guidance: Paragraphe d’introduction dans la colonne gauche
- `leftFooter` (raw)
  - Payload type: `richText`
  - Maximum visible length: 220
  - Admin guidance: Texte ou statistique en bas de la colonne gauche
- `collectionSide` (raw, not AI-draftable)
  - Payload type: `select`
  - Options: `left`, `right`
  - Admin guidance: Place les cartes à gauche ou à droite lorsque les deux compositions sont valides
- `rightCards` (raw)
  - Payload type: `array`
  - Rows: 0–5
  - Admin guidance: Liste de cartes affichées dans la colonne droite
- `rightCards[].cardTitleDesc` (cardTitleDesc, not AI-draftable)
  - Item title maximum: 120
  - Item description maximum: 280
- `image` (image, not AI-draftable)
- `imagePosition` (raw, not AI-draftable)
  - Payload type: `select`
  - Options: `right`, `left`
  - Admin guidance: Côté où l’image s’affiche quand une image est renseignée
- `footnotes` (raw)
  - Payload type: `array`
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 220
- `preview` (preview, not AI-draftable)

### `cardGrid`
- AI draftable: **yes**
- Payload label: Grille de cartes
- Layout kind: `collection`
- Required semantic roles: `heading.title`, `collection.items`
- Collection capacities: collection.items ≤ 8
- Supports citations: yes
- Prompt summary: Grille de cartes numérotées
**Fields:**
- `eyebrow` (eyebrow)
  - Maximum visible length: 80
- `title` (title)
  - Maximum visible length: 180
- `sidebarText` (raw)
  - Payload type: `richText`
  - Maximum visible length: 320
  - Admin guidance: Phrase d’introduction affichée sous le titre, dans l’en-tête commun
- `columns` (raw)
  - Payload type: `select`
  - Options: `2`, `3`, `4`
  - Admin guidance: Nombre maximal de colonnes dans la grille
- `cards` (raw)
  - Payload type: `array`
  - Rows: 2–8
  - Admin guidance: Liste des cartes à afficher dans la grille
- `cards[].number` (raw)
  - Payload type: `text`
  - Maximum visible length: 12
  - Admin guidance: Numéro ou identifiant de la carte (ex. "01")
- `cards[].cardTitleDesc` (cardTitleDesc, not AI-draftable)
  - Item title maximum: 120
  - Item description maximum: 260
- `intervenants` (raw, not AI-draftable)
  - Payload type: `array`
  - Rows: 0–4
  - Admin guidance: Personnes affichées en bandeau discret sous la grille
- `intervenants[].user` (raw, not AI-draftable)
  - Payload type: `relationship`
  - Required in Payload
  - Admin guidance: Utilisateur affiché comme intervenant
- `intervenants[].description` (raw, not AI-draftable)
  - Payload type: `textarea`
  - Maximum visible length: 240
  - Admin guidance: Expertise ou sujets suivis, affichés sous la fonction
- `footnotes` (raw)
  - Payload type: `array`
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 220
- `preview` (preview, not AI-draftable)

### `stats`
- AI draftable: **yes**
- Payload label: Statistiques
- Layout kind: `collection`
- Required semantic roles: `heading.title`, `collection.items`
- Collection capacities: collection.items ≤ 4
- Supports citations: yes
- Prompt summary: Chiffres clés en grille
**Fields:**
- `eyebrow` (eyebrow)
  - Maximum visible length: 80
- `title` (title)
  - Maximum visible length: 180
- `lead` (raw)
  - Payload type: `richText`
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `stats` (raw)
  - Payload type: `array`
  - Rows: 2–4
  - Admin guidance: Paires valeur/libellé affichées en ligne
- `stats[].value` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 24
  - Admin guidance: Chiffre ou donnée (ex. "360°", "4")
- `stats[].label` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 140
  - Admin guidance: Description courte de la valeur
- `footnotes` (raw)
  - Payload type: `array`
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 220
- `preview` (preview, not AI-draftable)

### `quotes`
- AI draftable: **yes**
- Payload label: Citations
- Layout kind: `collection`
- Required semantic roles: `heading.title`, `collection.items`
- Collection capacities: collection.items ≤ 4
- Supports citations: yes
- Prompt summary: Grille de citations
**Fields:**
- `eyebrow` (eyebrow)
  - Maximum visible length: 80
- `title` (title)
  - Maximum visible length: 180
- `lead` (raw)
  - Payload type: `richText`
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `quotes` (raw)
  - Payload type: `array`
  - Rows: 1–4
  - Admin guidance: Liste des citations à afficher en grille
- `quotes[].quote` (raw)
  - Payload type: `richText`
  - Required in Payload
  - Maximum visible length: 380
  - Admin guidance: Texte de la citation
- `quotes[].authorName` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 80
  - Admin guidance: Nom de l’auteur cité
- `quotes[].authorRole` (raw)
  - Payload type: `text`
  - Maximum visible length: 100
  - Admin guidance: Fonction ou contexte (optionnel)
- `quotes[].authorCompany` (raw)
  - Payload type: `text`
  - Maximum visible length: 80
  - Admin guidance: Nom de l’organisation (optionnel)
- `linkLabel` (raw)
  - Payload type: `text`
  - Maximum visible length: 50
  - Admin guidance: Texte du lien ; renseigner aussi l’URL correspondante
- `linkUrl` (raw)
  - Payload type: `text`
  - Maximum visible length: 300
  - Admin guidance: URL https du lien ; renseigner aussi son libellé
- `footnotes` (raw)
  - Payload type: `array`
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 220
- `preview` (preview, not AI-draftable)

### `cta`
- AI draftable: **yes**
- Payload label: Appel à l’action
- Layout kind: `prose`
- Required semantic roles: `heading.title`
- Supports citations: yes
- Prompt summary: Diapositive centrée pour appel à l'action OU clôture (merci, contact, etc.)
**Fields:**
- `eyebrow` (eyebrow)
  - Maximum visible length: 80
- `title` (title)
  - Maximum visible length: 180
- `subtitle` (raw)
  - Payload type: `richText`
  - Maximum visible length: 280
  - Admin guidance: Phrase d’accroche sous le titre
- `primaryAction` (raw)
  - Payload type: `text`
  - Maximum visible length: 50
  - Admin guidance: Texte de l’unique bouton (optionnel)
- `primaryActionUrl` (raw)
  - Payload type: `text`
  - Maximum visible length: 300
  - Admin guidance: URL https, mailto: ou tel: ; exige le libellé principal et rend le bouton cliquable dans le PDF (ex. {org.bookingUrl})
- `footerNote` (raw)
  - Payload type: `richText`
  - Maximum visible length: 220
  - Admin guidance: Texte en bas de la diapositive (optionnel)
- `footnotes` (raw)
  - Payload type: `array`
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 220
- `preview` (preview, not AI-draftable)

### `table`
- AI draftable: **yes**
- Payload label: Tableau
- Layout kind: `specialized`
- Required semantic roles: `heading.title`, `table.columns`, `table.rows`
- Supports citations: yes
- Prompt summary: Tableau / matrice — en-têtes de colonnes + lignes de cellules (pour comparaisons, matrices, échelles)
**Fields:**
- `eyebrow` (eyebrow)
  - Maximum visible length: 80
- `title` (title)
  - Maximum visible length: 180
- `lead` (raw)
  - Payload type: `richText`
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `tableVariant` (raw)
  - Payload type: `select`
  - Options: `reference`, `matrix`
  - Admin guidance: reference : tableau standard. matrix : cellules de statut (ok / attention / bloqué) rendues en pastilles.
- `columns` (raw)
  - Payload type: `array`
  - Rows: 2–5
  - Admin guidance: En-têtes de colonnes
- `columns[].header` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 80
  - Admin guidance: Libellé de la colonne
- `rows` (raw)
  - Payload type: `array`
  - Rows: 1–8
  - Admin guidance: Lignes du tableau ; chaque cellule correspond à une colonne, dans l’ordre
- `rows[].cells` (raw)
  - Payload type: `array`
  - Admin guidance: Une cellule par colonne, dans l’ordre des colonnes
- `rows[].cells[].value` (raw)
  - Payload type: `richText`
  - Maximum visible length: 420
- `footnotes` (raw)
  - Payload type: `array`
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 220
- `preview` (preview, not AI-draftable)

### `timeline`
- AI draftable: **yes**
- Payload label: Frise
- Layout kind: `collection`
- Required semantic roles: `heading.title`, `collection.items`
- Collection capacities: collection.items ≤ 6
- Supports citations: yes
- Prompt summary: Frise d’étapes ordonnées reliées par une ligne de progression (cycle de vie, processus, parcours chronologique)
**Fields:**
- `eyebrow` (eyebrow)
  - Maximum visible length: 80
- `title` (title)
  - Maximum visible length: 180
- `lead` (raw)
  - Payload type: `richText`
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `steps` (raw)
  - Payload type: `array`
  - Rows: 2–6
  - Admin guidance: Étapes ordonnées, reliées par une ligne de progression (2 à 6)
- `steps[].label` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 70
  - Admin guidance: Nom court de l’étape
- `steps[].description` (raw)
  - Payload type: `textarea`
  - Maximum visible length: 220
  - Admin guidance: Texte court sous l’étape
- `footer` (raw)
  - Payload type: `text`
  - Maximum visible length: 160
  - Admin guidance: Bandeau transverse sous la frise (optionnel)
- `footnotes` (raw)
  - Payload type: `array`
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 220
- `preview` (preview, not AI-draftable)

### `mermaid`
- AI draftable: **yes**
- Payload label: Diagramme
- Layout kind: `specialized`
- Required semantic roles: `heading.title`, `diagram.source`
- Supports citations: yes
- Prompt summary: Diagramme de flux / workflow rendu à partir de code Mermaid (flowchart, séquence, états)
**Fields:**
- `eyebrow` (eyebrow)
  - Maximum visible length: 80
- `title` (title)
  - Maximum visible length: 180
- `lead` (raw)
  - Payload type: `richText`
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `source` (raw)
  - Payload type: `code`
  - Required in Payload
  - Maximum visible length: 5000
  - Admin guidance: Code Mermaid brut (flowchart, sequenceDiagram, etc.), sans la clôture ```
- `caption` (raw)
  - Payload type: `text`
  - Maximum visible length: 180
  - Admin guidance: Courte légende sous le diagramme (optionnelle)
- `footnotes` (raw)
  - Payload type: `array`
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 220
- `preview` (preview, not AI-draftable)

### `agenda`
- AI draftable: **yes**
- Payload label: Programme
- Layout kind: `collection`
- Required semantic roles: `heading.title`
- Collection capacities: collection.items ≤ 8
- Supports citations: yes
- Prompt summary: Plan / sommaire de la présentation — liste verticale numérotée des sections pour situer et guider l’auditoire
**Fields:**
- `eyebrow` (eyebrow)
  - Maximum visible length: 80
- `title` (title)
  - Maximum visible length: 180
- `lead` (raw)
  - Payload type: `richText`
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `items` (raw)
  - Payload type: `array`
  - Rows: 0–8
  - Admin guidance: Laissez vide pour reprendre automatiquement les titres des blocs « Section » du plan. Remplissez pour personnaliser (2 à 8), numérotées automatiquement.
- `items[].label` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 70
  - Admin guidance: Nom court de la section
- `items[].description` (raw)
  - Payload type: `textarea`
  - Maximum visible length: 180
  - Admin guidance: Texte court sous la section (optionnel)
- `items[].slideId` (raw, not AI-draftable)
  - Payload type: `text`
  - Admin guidance: Rend la ligne cliquable : le titre renvoie à la diapositive choisie, dans la version web comme dans le PDF. Vide = pas de lien.
- `active` (raw)
  - Payload type: `number`
  - Admin guidance: Position (1, 2, 3…) de la section en cours : elle est mise en avant, les autres atténuées. Vide = vue d’ensemble neutre. Dupliquez la slide entre les sections pour guider l’auditoire.
- `footnotes` (raw)
  - Payload type: `array`
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (raw)
  - Payload type: `text`
  - Required in Payload
  - Maximum visible length: 220
- `preview` (preview, not AI-draftable)
