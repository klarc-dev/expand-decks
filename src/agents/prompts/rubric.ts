/**
 * Shared quality bar for expert training and webinar decks.
 *
 * Content-neutral by design: the brief and grounded sources determine the
 * subject matter and conclusions; this prompt governs only instructional
 * structure, slide function, writing quality, and evidentiary discipline.
 */
export const RUBRIC_PROMPT = `Standard obligatoire pour une présentation de formation de niveau expert :

Principe de neutralité : Le brief et les sources déterminent le fond, les positions et les conclusions. Préserve leur périmètre, leur terminologie, leur statut épistémique et leur point de vue. N'ajoute aucun thème, doctrine, objection ou recommandation par habitude. Ne transforme pas une explication en plaidoyer, une incertitude en certitude ni une corrélation en causalité. Les règles ci-dessous imposent seulement comment enseigner, structurer et écrire.

1. OBJECTIF D'APPRENTISSAGE : construis un parcours qui permet au public de comprendre, distinguer, décider ou appliquer quelque chose de précis. Chaque partie doit faire progresser cet objectif d'apprentissage.
2. UNE FONCTION PAR DIAPOSITIVE : chaque diapositive remplit une fonction pédagogique unique : cadrer un enjeu, définir ou distinguer, expliquer une règle, montrer des conditions ou exceptions, comparer, séquencer, visualiser un système, appliquer à un cas, synthétiser ou faire agir. Si deux fonctions se concurrencent, sépare-les.
3. ARC PÉDAGOGIQUE : établis la pertinence et les objectifs, donne la carte du parcours si elle aide l'auditoire, puis progresse du cadre vers les mécanismes, les distinctions et la mise en application. Termine par une synthèse opératoire, un livrable ou une prochaine étape réellement prévue par le brief.
4. TITRE-MESSAGE : hors cover, agenda et section, le titre est une affirmation concise et autonome qui énonce ce que l'auditoire doit retenir ; évite les titres-thèmes génériques. Le corps démontre, précise ou applique ce titre-message sans le répéter.
5. PROFONDEUR EXPERTE : pars des acquis du public et va à la frontière utile : critères discriminants, articulation entre notions, conditions, limites, exceptions, conséquences, arbitrages et cas difficiles. Ne ré-explique les fondamentaux que s'ils sont nécessaires au raisonnement.
6. EXPLICATION : lorsqu'une règle ou un mécanisme est enseigné, rends explicites la règle, conditions, exceptions, conséquences et, si les sources le permettent, un exemple concret ou un contre-exemple. N'invente jamais de chiffre, de cas, de citation, de source ou de précision absente du dossier.
7. MISE EN APPLICATION : après un concept dense ou un ensemble de règles, prévois une application seulement si le dossier la permet : cas, scénario, question de décision, checklist, matrice ou procédure. Distingue clairement les faits, l'analyse et la conclusion.
8. CHARGE COGNITIVE : une idée dominante, 3 à 5 unités visuelles au plus, formulations parallèles, hiérarchie explicite. Supprime les paragraphes, inventaires et détails qui appartiennent au discours oral, aux notes ou à un livrable annexe.
9. PREUVES ET NUANCE : ancre les affirmations par les faits, chiffres, exemples et sources réellement disponibles. Distingue règle générale, condition, exception, interprétation et incertitude. Si l'appui manque, reste général ou signale la limite au lieu de combler le vide.
10. ÉCRITURE : phrases courtes, précises et autonomes ; vocabulaire technique exact mais compréhensible ; listes homogènes ; aucun slogan, superlatif, accroche publicitaire, remplissage ou répétition entre diapositives.

Le public est de niveau expert : privilégie la structure du raisonnement, les distinctions utiles et la transférabilité vers la pratique plutôt que la quantité d'informations.`;
