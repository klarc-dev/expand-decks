<!-- GENERATED FILE. Run pnpm generate:agent-skills. Do not edit manually. -->
# Runtime layout prompt catalogue

The following catalogue is emitted from the same `PromptMeta` records used by the in-app structure prompt. It is schema knowledge, not a replacement for the full Mastra workflow.

1. **cover** — Diapositive d'ouverture
   - pills: [{text}] — libellés courts indépendants au-dessus du titre, une entrée par pastille
   - title: titre principal (obligatoire)
   - subtitle: paragraphe descriptif
   - pills: 0–4 éléments
   - pills[].text: 40 caractères max
   - title: 180 caractères max
   - subtitle: 320 caractères max

2. **section** — Intercalaire de section
   - number: numéro (ex. "01")
   - title: titre (obligatoire)
   - subtitle: description
   - footnotes: [{text}] — sources ou notes numérotées ; place [^1], [^2]… dans le contenu pour leurs appels
   - number: 8 caractères max
   - title: 180 caractères max
   - subtitle: 280 caractères max
   - footnotes: 0–3 éléments
   - footnotes[].text: 220 caractères max

3. **statement** — Affirmation ou citation mise en avant
   - eyebrow, title (obligatoire), body, footer
   - variant: centered-hero | pull-quote | big-statement | split — varie la mise en page entre deux statements consécutifs (laisser vide = alternance auto)
   - footnotes: [{text}] — sources ou notes numérotées ; place [^1], [^2]… dans le contenu pour leurs appels
   - eyebrow: 80 caractères max
   - title: 180 caractères max
   - body: 560 caractères max
   - footer: 220 caractères max
   - footnotes: 0–3 éléments
   - footnotes[].text: 220 caractères max

4. **twoCols** — Deux colonnes avec cartes à droite
   - eyebrow, title (obligatoire), lead, intro, leftFooter
   - rightCards: [{title, description}]
   - footnotes: [{text}] — sources ou notes numérotées ; place [^1], [^2]… dans le contenu pour leurs appels
   - eyebrow: 80 caractères max
   - title: 180 caractères max
   - lead: 160 caractères max
   - intro: 480 caractères max
   - leftFooter: 220 caractères max
   - rightCards: 0–5 éléments
   - rightCards[].title: 120 caractères max
   - rightCards[].description: 280 caractères max
   - footnotes: 0–3 éléments
   - footnotes[].text: 220 caractères max

5. **cardGrid** — Grille de cartes numérotées
   - eyebrow, title (obligatoire), sidebarText
   - columns: "2" | "3" | "4"
   - cards: [{number, title, description}]
   - footnotes: [{text}] — sources ou notes numérotées ; place [^1], [^2]… dans le contenu pour leurs appels
   - eyebrow: 80 caractères max
   - title: 180 caractères max
   - sidebarText: 320 caractères max
   - cards: 2–8 éléments
   - cards[].number: 12 caractères max
   - cards[].title: 120 caractères max
   - cards[].description: 260 caractères max
   - footnotes: 0–3 éléments
   - footnotes[].text: 220 caractères max

6. **stats** — Chiffres clés en grille
   - eyebrow, title (obligatoire), lead
   - stats: [{value, label}]
   - footnotes: [{text}] — sources ou notes numérotées ; place [^1], [^2]… dans le contenu pour leurs appels
   - eyebrow: 80 caractères max
   - title: 180 caractères max
   - lead: 160 caractères max
   - stats: 2–4 éléments
   - stats[].value: 24 caractères max
   - stats[].label: 140 caractères max
   - footnotes: 0–3 éléments
   - footnotes[].text: 220 caractères max

7. **quotes** — Grille de citations
   - eyebrow, title (obligatoire), lead
   - quotes: [{quote, authorName, authorRole, authorCompany}]
   - linkLabel / linkUrl: lien optionnel vers une liste complète fournie dans le contexte
   - footnotes: [{text}] — sources ou notes numérotées ; place [^1], [^2]… dans le contenu pour leurs appels
   - eyebrow: 80 caractères max
   - title: 180 caractères max
   - lead: 160 caractères max
   - quotes: 1–4 éléments
   - quotes[].quote: 380 caractères max
   - quotes[].authorName: 80 caractères max
   - quotes[].authorRole: 100 caractères max
   - quotes[].authorCompany: 80 caractères max
   - linkLabel: 50 caractères max
   - linkUrl: 300 caractères max
   - footnotes: 0–3 éléments
   - footnotes[].text: 220 caractères max

8. **cta** — Diapositive centrée pour appel à l'action OU clôture (merci, contact, etc.)
   - eyebrow, title (obligatoire), subtitle
   - primaryAction: libellé de l’unique bouton (optionnel)
   - primaryActionUrl: cible du bouton (https, mailto: ou tel:), uniquement une coordonnée fournie dans le contexte ou le brief, jamais inventée
   - footerNote: petit texte en bas
   - footnotes: [{text}] — sources ou notes numérotées ; place [^1], [^2]… dans le contenu pour leurs appels
   - eyebrow: 80 caractères max
   - title: 180 caractères max
   - subtitle: 280 caractères max
   - primaryAction: 50 caractères max
   - primaryActionUrl: 300 caractères max
   - footerNote: 220 caractères max
   - footnotes: 0–3 éléments
   - footnotes[].text: 220 caractères max

9. **table** — Tableau / matrice — en-têtes de colonnes + lignes de cellules (pour comparaisons, matrices, échelles)
   - eyebrow, title (obligatoire), lead
   - tableVariant: "reference" (standard) | "matrix" (cellules de statut). Pour une matrice, mets ✓/⚠/✗ ou "ok"/"warn"/"blocked" dans les cellules de statut.
   - columns: [{header}]
   - rows: [{cells: [{value}]}] — chaque ligne a une cellule par colonne, dans le même ordre
   - footnotes: [{text}] — sources ou notes numérotées ; place [^1], [^2]… dans le contenu pour leurs appels
   - eyebrow: 80 caractères max
   - title: 180 caractères max
   - lead: 160 caractères max
   - columns: 2–5 éléments
   - columns[].header: 80 caractères max
   - rows: 1–8 éléments
   - rows[].cells[].value: 420 caractères max
   - footnotes: 0–3 éléments
   - footnotes[].text: 220 caractères max

10. **timeline** — Frise d’étapes ordonnées reliées par une ligne de progression (cycle de vie, processus, parcours chronologique)
   - eyebrow, title (obligatoire), lead, footer (bandeau transverse)
   - steps: [{label, description}] — dans l’ordre ; la mise en page s’adapte (rail horizontal pour les étapes courtes, vertical pour les plus longues)
   - footnotes: [{text}] — sources ou notes numérotées ; place [^1], [^2]… dans le contenu pour leurs appels
   - eyebrow: 80 caractères max
   - title: 180 caractères max
   - lead: 160 caractères max
   - steps: 2–6 éléments
   - steps[].label: 70 caractères max
   - steps[].description: 220 caractères max
   - footer: 160 caractères max
   - footnotes: 0–3 éléments
   - footnotes[].text: 220 caractères max

11. **mermaid** — Diagramme de flux / workflow rendu à partir de code Mermaid (flowchart, séquence, états)
   - eyebrow, title (obligatoire), lead, caption
   - source: code Mermaid brut UNIQUEMENT (ex. "flowchart TD\n  A[X] --> B[Y]"), sans les délimiteurs ```
   - footnotes: [{text}] — sources ou notes numérotées ; place [^1], [^2]… dans le contenu pour leurs appels
   - eyebrow: 80 caractères max
   - title: 180 caractères max
   - lead: 160 caractères max
   - source: 5000 caractères max
   - caption: 180 caractères max
   - footnotes: 0–3 éléments
   - footnotes[].text: 220 caractères max

12. **agenda** — Plan / sommaire de la présentation — liste verticale numérotée des sections pour situer et guider l’auditoire
   - eyebrow, title (obligatoire), lead
   - items: [{label, description}] — dans l’ordre, numérotées automatiquement
   - active: position (1, 2, 3…) de la section à mettre en avant ; laisser vide pour une vue d’ensemble
   - footnotes: [{text}] — sources ou notes numérotées ; place [^1], [^2]… dans le contenu pour leurs appels
   - eyebrow: 80 caractères max
   - title: 180 caractères max
   - lead: 160 caractères max
   - items: 8 éléments
   - items[].label: 70 caractères max
   - items[].description: 180 caractères max
   - footnotes: 0–3 éléments
   - footnotes[].text: 220 caractères max
