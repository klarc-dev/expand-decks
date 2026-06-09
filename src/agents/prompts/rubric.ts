/**
 * RUBRIC_PROMPT — the "interesting expert content" rules, distilled from the
 * deep-research report (Expert_B2B_Presentation_Content_Rules). This is the
 * slides analogue of the documents-plugin writing-standards: the shared quality
 * bar that the writer aims for and the scorers judge against.
 *
 * Use-case-agnostic on purpose — it describes structure and rigor, never a
 * domain. The brief supplies the subject; this supplies the craft.
 */
export const RUBRIC_PROMPT = `Règles de contenu expert (ce qui rend une diapositive d'expert intéressante) :

1. UNE seule idée par diapositive. Si une diapositive porte deux idées, c'est deux diapositives.
2. Titre = AFFIRMATION, pas un thème. Le titre est une phrase complète qui énonce le message ("Mener par la conclusion l'emporte sur l'enterrer"), jamais une étiquette ("Conclusion").
3. CONCRET : chaque idée abstraite est ancrée par un exemple, un chiffre, ou une donnée. Pas d'affirmation vague.
4. PERTINENCE d'abord : le deck ouvre sur le problème que le public possède (le "so what"), avant la solution.
5. Charge cognitive minimale : peu de mots, groupés en 3 à 5 unités ; le visuel porte la structure, pas un mur de texte.
6. Deux côtés : nomme la principale objection d'un public expert et réfute-la, plutôt que de l'ignorer.
7. Pas de survente : énonce les faits clairement, nuance les interprétations selon les preuves. Jamais d'exagération.
8. Cite la source quand une donnée ou une affirmation forte l'exige.

Le public est expert : ne ré-explique pas les fondamentaux qu'il maîtrise ; va à la frontière utile et nouvelle.`;
