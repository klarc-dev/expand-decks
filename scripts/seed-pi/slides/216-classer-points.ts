// S22 — Classifier : le verrou opérationnel → cardGrid (6 cartes).
// Scindé en 2 slides (3+3, colonnes '3') : 6 cartes en 3 colonnes débordaient
// le bas du canevas 720px à l'export PDF. Un seul rang de 3 tient confortablement.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => [
  {
    blockType: 'cardGrid',
    eyebrow: 'Étape 2 — Sécuriser',
    title: 'Classifier : le verrou opérationnel (1/2)',
    columns: '3',
    cards: [
      {
        number: '01',
        title: 'C3, le verrou',
        description: rt(
          "Le niveau **C3 — Confidentiel** impose une validation avant toute diffusion externe (présentation, publication, réponse à appel d'offres).",
        ),
      },
      {
        number: '02',
        title: 'Marquage double',
        description: rt(
          '**Marquage visuel** systématique (en-tête / pied de page) + **marquage dans les métadonnées** du fichier.',
        ),
      },
      {
        number: '03',
        title: 'Révision périodique',
        description: rt(
          'Réviser la classification (trimestriellement ou à chaque jalon projet) : un document peut changer de niveau.',
        ),
      },
    ],
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'Étape 2 — Sécuriser',
    title: 'Classifier : le verrou opérationnel (2/2)',
    columns: '3',
    cards: [
      {
        number: '04',
        title: 'Métadonnées = fuite',
        description: rt(
          'Auteur, historique de modifications, commentaires, données EXIF des images peuvent divulguer du confidentiel — nettoyer les métadonnées avant toute diffusion externe de niveau C2+.',
        ),
      },
      {
        number: '05',
        title: 'Classification à la création',
        description: rt(
          'Chaque document créé dans le périmètre R&D, technique ou stratégique reçoit un niveau de classification au moment de sa création.',
        ),
      },
      {
        number: '06',
        title: 'Marquage ≠ mesure suffisante',
        description: rt(
          "Le marquage seul ne constitue pas une « mesure raisonnable » au sens de L.151-1 C. com. — le combiner avec les restrictions d'accès et les engagements contractuels.",
        ),
      },
    ],
  },
];

export default slide;
