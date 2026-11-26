<!-- GENERATED FILE. Run pnpm generate:agent-skills. Do not edit manually. -->
# Layout capability finder

Choose by intent, then follow the layout link for field paths, options, limits, relationship targets and admin guidance. Check the template allowlist in [schema](schema.md#document-templates).

| Layout | Use for | Native field (semantic role) | Set outside the AI draft |
| --- | --- | --- | --- |
| [cover](schema.md#cover) | Diapositive d'ouverture | pills (presentation.hint), subtitle (prose.support), intervenants (people) | intervenants, intervenants[].user → users, intervenants[].description |
| [section](schema.md#section) | Intercalaire de section | subtitle (prose.support), image (media.primary), imagePosition (media.placement), footnotes (citations) | image → media, imagePosition |
| [statement](schema.md#statement) | Affirmation ou citation mise en avant | body (prose.support), footer (takeaway), variant (presentation.hint), footnotes (citations) | None |
| [twoCols](schema.md#twocols) | Deux colonnes avec cartes à droite | lead (prose.lead), intro (prose.support), leftFooter (takeaway), collectionSide (collection.side), rightCards (collection.items), image (media.primary), imagePosition (media.placement), footnotes (citations) | collectionSide, image → media, imagePosition |
| [cardGrid](schema.md#cardgrid) | Grille de cartes numérotées | sidebarText (prose.support), columns (presentation.hint), cards (collection.items), footnotes (citations) | None |
| [stats](schema.md#stats) | Chiffres clés en grille | lead (prose.lead), stats (collection.items), footnotes (citations) | None |
| [quotes](schema.md#quotes) | Grille de citations | lead (prose.lead), quotes (collection.items), linkLabel (action.supporting.label), linkUrl (action.supporting.url), footnotes (citations) | None |
| [cta](schema.md#cta) | Diapositive centrée pour appel à l'action OU clôture (merci, contact, etc.) | subtitle (prose.support), primaryAction (action.primary.label), primaryActionUrl (action.primary.url), footerNote (takeaway), footnotes (citations) | None |
| [table](schema.md#table) | Tableau / matrice — en-têtes de colonnes + lignes de cellules (pour comparaisons, matrices, échelles) | lead (prose.lead), tableVariant (presentation.hint), columns (table.columns), rows (table.rows), footnotes (citations) | None |
| [timeline](schema.md#timeline) | Frise d’étapes ordonnées reliées par une ligne de progression (cycle de vie, processus, parcours chronologique) | lead (prose.lead), steps (collection.items), footer (takeaway), footnotes (citations) | None |
| [mermaid](schema.md#mermaid) | Diagramme de flux / workflow rendu à partir de code Mermaid (flowchart, séquence, états) | lead (prose.lead), source (diagram.source), caption (prose.support), footnotes (citations) | None |
| [agenda](schema.md#agenda) | Plan / sommaire de la présentation — liste verticale numérotée des sections pour situer et guider l’auditoire | lead (prose.lead), items (collection.items), active (presentation.hint), footnotes (citations) | items[].slideId |

Payload-only means the draft schema does not supply that path. Resolve real records or slide IDs after parsing the draft, preserve existing selections on edits, then validate the saved/rendered shape. A name or page number pasted into prose is not a relationship.
