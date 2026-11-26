<!-- GENERATED FILE. Run pnpm generate:agent-skills. Do not edit manually. -->
# Deck schema reference

This reference is generated from `src/blocks/spec/`, `src/documents/templates.ts`, and the attached layout contracts. It is the schema-aware companion to the handwritten operational guidance in the deck skills.

## Authoring invariants

- Block fields, Payload metadata, AI draftability, visible-text limits, prompt prose, semantic roles, and layout capacities come from the block-spec DSL.
- Use the exact `blockType` values below. Do not invent use-case-specific layouts or fields.
- Fields marked **Payload only** may still be required when authoring a saved/rendered block.
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
- `pills` (array, draft + Payload)
  - Rows: 0–4
  - Admin guidance: Libellés indépendants au-dessus du titre. Une ligne par pastille.
- `pills[].text` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 40
- `title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 180
  - Admin guidance: Titre principal de la diapositive de couverture · Entourez un terme de crochets pour le mettre en valeur : [Klarc]
- `subtitle` (richText, draft + Payload)
  - Maximum visible length: 320
  - Admin guidance: Paragraphe descriptif sous le titre
- `intervenants` (array, Payload only)
  - Rows: 0–4
  - Admin guidance: Personnes affichées sur la diapositive de couverture
- `intervenants[].user` (relationship, Payload only)
  - Required in Payload
  - Target collection: `users`
  - Admin guidance: Utilisateur affiché comme intervenant
- `intervenants[].description` (textarea, Payload only)
  - Maximum visible length: 240
  - Admin guidance: Expertise ou sujets suivis, affichés sous la fonction

### `section`
- AI draftable: **yes**
- Payload label: Section
- Layout kind: `prose`
- Required semantic roles: `heading.title`
- Supports citations: yes
- Media: 1/1; placements: left, right
- Prompt summary: Intercalaire de section
**Fields:**
- `number` (text, draft + Payload)
  - Maximum visible length: 8
  - Admin guidance: Numéro de section affiché (ex. "02")
- `title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 180
  - Admin guidance: Titre de la section · Entourez un terme de crochets pour le mettre en valeur : [Klarc]
- `subtitle` (richText, draft + Payload)
  - Maximum visible length: 280
  - Admin guidance: Description complémentaire sous le titre
- `image` (upload, Payload only)
  - Target collection: `media`
  - Admin guidance: Image illustrant la diapositive (optionnelle ; affichée en colonne via layout Slidev image-right/image-left)
- `imagePosition` (select, Payload only)
  - Options: right, left
  - Admin guidance: Côté où l’image s’affiche quand une image est renseignée
- `footnotes` (array, draft + Payload)
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 220

### `statement`
- AI draftable: **yes**
- Payload label: Affirmation
- Layout kind: `prose`
- Required semantic roles: `heading.title`
- Supports citations: yes
- Prompt summary: Affirmation ou citation mise en avant
**Fields:**
- `eyebrow` (text, draft + Payload)
  - Maximum visible length: 80
  - Admin guidance: Texte court au-dessus du titre
- `title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 180
  - Admin guidance: Citation ou affirmation principale · Entourez un terme de crochets pour le mettre en valeur : [Klarc]
- `body` (richText, draft + Payload)
  - Maximum visible length: 560
  - Admin guidance: Texte développant l’affirmation
- `footer` (richText, draft + Payload)
  - Maximum visible length: 220
  - Admin guidance: Message clé mis en avant dans un encadré en bas de la diapositive. Un début « Enjeu : … » devient le cartouche de l’encadré.
- `variant` (select, draft + Payload)
  - Options: centered-hero, pull-quote, big-statement, split
  - Admin guidance: Disposition : centered-hero (centré), pull-quote (citation), big-statement (énoncé large), split (titre/texte). Laisser vide pour une alternance automatique.
- `footnotes` (array, draft + Payload)
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 220

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
- `eyebrow` (text, draft + Payload)
  - Maximum visible length: 80
  - Admin guidance: Texte court au-dessus du titre (ex. "01 · Conseil financier")
- `title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 180
  - Admin guidance: Titre principal de la diapositive · Entourez un terme de crochets pour le mettre en valeur : [Klarc]
- `lead` (richText, draft + Payload)
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `intro` (richText, draft + Payload)
  - Maximum visible length: 480
  - Admin guidance: Paragraphe d’introduction dans la colonne gauche
- `leftFooter` (richText, draft + Payload)
  - Maximum visible length: 220
  - Admin guidance: Texte ou statistique en bas de la colonne gauche
- `collectionSide` (select, Payload only)
  - Options: left, right
  - Admin guidance: Place les cartes à gauche ou à droite lorsque les deux compositions sont valides
- `rightCards` (array, draft + Payload)
  - Rows: 0–5
  - Admin guidance: Liste de cartes affichées dans la colonne droite
- `rightCards[].title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 120
  - Admin guidance: Titre de la carte
- `rightCards[].description` (richText, draft + Payload)
  - Maximum visible length: 280
  - Admin guidance: Contenu descriptif de la carte
- `image` (upload, Payload only)
  - Target collection: `media`
  - Admin guidance: Image illustrant la diapositive (optionnelle ; affichée en colonne à droite ou à gauche). Les cartes restent affichées dans la colonne de contenu.
- `imagePosition` (select, Payload only)
  - Options: right, left
  - Admin guidance: Côté où l’image s’affiche quand une image est renseignée
- `footnotes` (array, draft + Payload)
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 220

### `cardGrid`
- AI draftable: **yes**
- Payload label: Grille de cartes
- Layout kind: `collection`
- Required semantic roles: `heading.title`, `collection.items`
- Collection capacities: collection.items ≤ 8
- Supports citations: yes
- Prompt summary: Grille de cartes numérotées
**Fields:**
- `eyebrow` (text, draft + Payload)
  - Maximum visible length: 80
  - Admin guidance: Texte court au-dessus du titre
- `title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 180
  - Admin guidance: Titre principal de la grille · Entourez un terme de crochets pour le mettre en valeur : [Klarc]
- `sidebarText` (richText, draft + Payload)
  - Maximum visible length: 320
  - Admin guidance: Phrase d’introduction affichée sous le titre, dans l’en-tête commun
- `columns` (select, draft + Payload)
  - Options: 2, 3, 4
  - Admin guidance: Nombre maximal de colonnes dans la grille
- `cards` (array, draft + Payload)
  - Rows: 2–8
  - Admin guidance: Liste des cartes à afficher dans la grille
- `cards[].number` (text, draft + Payload)
  - Maximum visible length: 12
  - Admin guidance: Numéro ou identifiant de la carte (ex. "01")
- `cards[].title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 120
  - Admin guidance: Titre de la carte
- `cards[].description` (richText, draft + Payload)
  - Maximum visible length: 260
  - Admin guidance: Contenu descriptif de la carte
- `footnotes` (array, draft + Payload)
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 220

### `stats`
- AI draftable: **yes**
- Payload label: Statistiques
- Layout kind: `collection`
- Required semantic roles: `heading.title`, `collection.items`
- Collection capacities: collection.items ≤ 4
- Supports citations: yes
- Prompt summary: Chiffres clés en grille
**Fields:**
- `eyebrow` (text, draft + Payload)
  - Maximum visible length: 80
  - Admin guidance: Texte court au-dessus du titre
- `title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 180
  - Admin guidance: Titre principal de la diapositive · Entourez un terme de crochets pour le mettre en valeur : [Klarc]
- `lead` (richText, draft + Payload)
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `stats` (array, draft + Payload)
  - Rows: 2–4
  - Admin guidance: Paires valeur/libellé affichées en ligne
- `stats[].value` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 24
  - Admin guidance: Chiffre ou donnée (ex. "360°", "4")
- `stats[].label` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 140
  - Admin guidance: Description courte de la valeur
- `footnotes` (array, draft + Payload)
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 220

### `quotes`
- AI draftable: **yes**
- Payload label: Citations
- Layout kind: `collection`
- Required semantic roles: `heading.title`, `collection.items`
- Collection capacities: collection.items ≤ 4
- Supports citations: yes
- Prompt summary: Grille de citations
**Fields:**
- `eyebrow` (text, draft + Payload)
  - Maximum visible length: 80
  - Admin guidance: Texte court au-dessus du titre
- `title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 180
  - Admin guidance: Titre de la diapositive · Entourez un terme de crochets pour le mettre en valeur : [Klarc]
- `lead` (richText, draft + Payload)
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `quotes` (array, draft + Payload)
  - Rows: 1–4
  - Admin guidance: Liste des citations à afficher en grille
- `quotes[].quote` (richText, draft + Payload)
  - Required in Payload
  - Maximum visible length: 380
  - Admin guidance: Texte de la citation
- `quotes[].authorName` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 80
  - Admin guidance: Nom de l’auteur cité
- `quotes[].authorRole` (text, draft + Payload)
  - Maximum visible length: 100
  - Admin guidance: Fonction ou contexte (optionnel)
- `quotes[].authorCompany` (text, draft + Payload)
  - Maximum visible length: 80
  - Admin guidance: Nom de l’organisation (optionnel)
- `linkLabel` (text, draft + Payload)
  - Maximum visible length: 50
  - Admin guidance: Texte du lien ; renseigner aussi l’URL correspondante
- `linkUrl` (text, draft + Payload)
  - Maximum visible length: 300
  - Admin guidance: URL https du lien ; renseigner aussi son libellé
- `footnotes` (array, draft + Payload)
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 220

### `cta`
- AI draftable: **yes**
- Payload label: Appel à l’action
- Layout kind: `prose`
- Required semantic roles: `heading.title`
- Supports citations: yes
- Prompt summary: Diapositive centrée pour appel à l'action OU clôture (merci, contact, etc.)
**Fields:**
- `eyebrow` (text, draft + Payload)
  - Maximum visible length: 80
  - Admin guidance: Texte court au-dessus du titre
- `title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 180
  - Admin guidance: Titre principal centré (ex. "Merci", "Et maintenant ?") · Entourez un terme de crochets pour le mettre en valeur : [Klarc]
- `subtitle` (richText, draft + Payload)
  - Maximum visible length: 280
  - Admin guidance: Phrase d’accroche sous le titre
- `primaryAction` (text, draft + Payload)
  - Maximum visible length: 50
  - Admin guidance: Texte de l’unique bouton (optionnel)
- `primaryActionUrl` (text, draft + Payload)
  - Maximum visible length: 300
  - Admin guidance: URL https, mailto: ou tel: ; exige le libellé principal et rend le bouton cliquable dans le PDF (ex. {org.bookingUrl})
- `footerNote` (richText, draft + Payload)
  - Maximum visible length: 220
  - Admin guidance: Texte en bas de la diapositive (optionnel)
- `footnotes` (array, draft + Payload)
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 220

### `table`
- AI draftable: **yes**
- Payload label: Tableau
- Layout kind: `specialized`
- Required semantic roles: `heading.title`, `table.columns`, `table.rows`
- Supports citations: yes
- Prompt summary: Tableau / matrice — en-têtes de colonnes + lignes de cellules (pour comparaisons, matrices, échelles)
**Fields:**
- `eyebrow` (text, draft + Payload)
  - Maximum visible length: 80
  - Admin guidance: Texte court au-dessus du titre
- `title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 180
  - Admin guidance: Titre du tableau · Entourez un terme de crochets pour le mettre en valeur : [Klarc]
- `lead` (richText, draft + Payload)
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `tableVariant` (select, draft + Payload)
  - Options: reference, matrix
  - Admin guidance: reference : tableau standard. matrix : cellules de statut (ok / attention / bloqué) rendues en pastilles.
- `rows` (array, draft + Payload)
  - Rows: 1–8
  - Admin guidance: Lignes du tableau ; chaque cellule correspond à une colonne, dans l’ordre
- `rows[].cells` (array, draft + Payload)
  - Rows: 0–∞
  - Admin guidance: Une cellule par colonne, dans l’ordre des colonnes
- `rows[].cells[].value` (richText, draft + Payload)
  - Maximum visible length: 420
- `footnotes` (array, draft + Payload)
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 220

### `timeline`
- AI draftable: **yes**
- Payload label: Frise
- Layout kind: `collection`
- Required semantic roles: `heading.title`, `collection.items`
- Collection capacities: collection.items ≤ 6
- Supports citations: yes
- Prompt summary: Frise d’étapes ordonnées reliées par une ligne de progression (cycle de vie, processus, parcours chronologique)
**Fields:**
- `eyebrow` (text, draft + Payload)
  - Maximum visible length: 80
  - Admin guidance: Texte court au-dessus du titre
- `title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 180
  - Admin guidance: Titre de la frise · Entourez un terme de crochets pour le mettre en valeur : [Klarc]
- `lead` (richText, draft + Payload)
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `steps` (array, draft + Payload)
  - Rows: 2–6
  - Admin guidance: Étapes ordonnées, reliées par une ligne de progression (2 à 6)
- `steps[].label` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 70
  - Admin guidance: Nom court de l’étape
- `steps[].description` (textarea, draft + Payload)
  - Maximum visible length: 220
  - Admin guidance: Texte court sous l’étape
- `footer` (text, draft + Payload)
  - Maximum visible length: 160
  - Admin guidance: Bandeau transverse sous la frise (optionnel)
- `footnotes` (array, draft + Payload)
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 220

### `mermaid`
- AI draftable: **yes**
- Payload label: Diagramme
- Layout kind: `specialized`
- Required semantic roles: `heading.title`, `diagram.source`
- Supports citations: yes
- Prompt summary: Diagramme de flux / workflow rendu à partir de code Mermaid (flowchart, séquence, états)
**Fields:**
- `eyebrow` (text, draft + Payload)
  - Maximum visible length: 80
  - Admin guidance: Texte court au-dessus du titre
- `title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 180
  - Admin guidance: Titre du diagramme · Entourez un terme de crochets pour le mettre en valeur : [Klarc]
- `lead` (richText, draft + Payload)
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `source` (code, draft + Payload)
  - Required in Payload
  - Maximum visible length: 5000
  - Admin guidance: Code Mermaid brut (flowchart, sequenceDiagram, etc.), sans la clôture ```
- `caption` (text, draft + Payload)
  - Maximum visible length: 180
  - Admin guidance: Courte légende sous le diagramme (optionnelle)
- `footnotes` (array, draft + Payload)
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 220

### `agenda`
- AI draftable: **yes**
- Payload label: Programme
- Layout kind: `collection`
- Required semantic roles: `heading.title`
- Collection capacities: collection.items ≤ 8
- Supports citations: yes
- Prompt summary: Plan / sommaire de la présentation — liste verticale numérotée des sections pour situer et guider l’auditoire
**Fields:**
- `eyebrow` (text, draft + Payload)
  - Maximum visible length: 80
  - Admin guidance: Texte court au-dessus du titre
- `title` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 180
  - Admin guidance: Titre du programme (ex. "Au programme") · Entourez un terme de crochets pour le mettre en valeur : [Klarc]
- `lead` (richText, draft + Payload)
  - Maximum visible length: 160
  - Admin guidance: Phrase d’introduction affichée sous le titre, limitée à deux lignes (environ 160 caractères)
- `items` (array, draft + Payload)
  - Rows: 0–8
  - Admin guidance: Laissez vide pour reprendre automatiquement les titres des blocs « Section » du plan. Remplissez pour personnaliser (2 à 8), numérotées automatiquement.
- `items[].label` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 70
  - Admin guidance: Nom court de la section
- `items[].description` (textarea, draft + Payload)
  - Maximum visible length: 180
  - Admin guidance: Texte court sous la section (optionnel)
- `items[].slideId` (text, Payload only)
  - Admin guidance: Rend la ligne cliquable : le titre renvoie à la diapositive choisie, dans la version web comme dans le PDF. Vide = pas de lien.
- `active` (number, draft + Payload)
  - Admin guidance: Position (1, 2, 3…) de la section en cours : elle est mise en avant, les autres atténuées. Vide = vue d’ensemble neutre. Dupliquez la slide entre les sections pour guider l’auditoire.
- `footnotes` (array, draft + Payload)
  - Rows: 0–3
  - Admin guidance: Notes numérotées affichées en bas de diapositive. Insérez [^1], [^2]… dans le contenu pour placer les appels en exposant. Lien possible : [texte](https://…).
- `footnotes[].text` (text, draft + Payload)
  - Required in Payload
  - Maximum visible length: 220
