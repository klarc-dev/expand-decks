// S28 — Récapitulatif (7 leviers) → deux cardGrid (cardGrid max 6 cartes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => [
  {
    blockType: 'cardGrid',
    eyebrow: 'Récapitulatif',
    title: 'Sept leviers, un dispositif (1/2)',
    columns: '2',
    cards: [
      {
        number: '01',
        title: 'Cartographier les actifs',
        description: rt(
          'Chaque composant de l’innovation (technique, apparence, code, savoir-faire, données) appelle un outil de protection distinct ; le cumul est la règle.',
        ),
      },
      {
        number: '02',
        title: 'Sécuriser la titularité',
        description: rt(
          'Un document adapté par statut de créateur (salarié, dirigeant, prestataire, stagiaire), signé avant tout accès aux informations et avant tout début de travaux.',
        ),
      },
      {
        number: '03',
        title: 'Capter les créations',
        description: rt(
          'Déclaration d’invention systématique, intégrée au workflow R&D, avec qualification et horodatage.',
        ),
      },
      {
        number: '04',
        title: 'Décider par analyse',
        description: rt(
          'Brevet, certificat d’utilité, dessin enregistré ou non enregistré, secret, publication défensive — selon la détectabilité, le cycle de vie, le coût et la géographie.',
        ),
      },
    ],
  },
  {
    blockType: 'cardGrid',
    eyebrow: 'Récapitulatif',
    title: 'Sept leviers, un dispositif (2/2)',
    columns: '3',
    cards: [
      {
        number: '05',
        title: 'Organiser le secret',
        description: rt(
          'Horodater, classer, partager sous contrôle, rendre opposable par le contrat de travail ou le règlement intérieur.',
        ),
      },
      {
        number: '06',
        title: 'Gérer les départs',
        description: rt(
          'Entretien de sortie PI, restitution, clôture des accès, surveillance post-départ.',
        ),
      },
      {
        number: '07',
        title: 'Piloter',
        description: rt(
          'Comité PI trimestriel, indicateurs suivis, zéro déchéance, veille concurrentielle.',
        ),
      },
    ],
  },
];

export default slide;
