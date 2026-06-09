// S4 (points clés) — « Points particuliers » de la cartographie → cardGrid.
// Les 4 puces du draft S4 (certificat d'utilité, dessin communautaire non
// enregistré, cumul, FTO) en 4 cartes, juste après les tableaux 060/065.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cardGrid',
  eyebrow: 'Partie I — Les outils',
  title: 'Cartographie : points clés',
  columns: '2',
  sidebarText: rt('Quatre subtilités qui décident du bon outil — et de la liberté d’exploiter.'),
  cards: [
    {
      number: '01',
      title: 'Certificat d’utilité',
      description: rt(
        'Adapté aux innovations à cycle court (<10 ans) ou à l’activité inventive incertaine : pas d’examen de fond à l’INPI, délivrance rapide, convertible en demande de brevet dans les 18 mois *(L.612-15 CPI)*.',
      ),
    },
    {
      number: '02',
      title: 'Dessin communautaire non enregistré',
      description: rt(
        'Protège automatiquement 3 ans toute apparence divulguée dans l’UE (mode, packaging, UI) — mais seulement contre la **copie délibérée**, pas contre la création indépendante.',
      ),
    },
    {
      number: '03',
      title: 'Le cumul est la règle',
      description: rt(
        'Un même produit peut être couvert par un brevet (mécanisme), un dessin (forme), une marque (nom), un droit d’auteur (interface) et un secret (procédé).',
      ),
    },
    {
      number: '04',
      title: 'Liberté d’exploitation (FTO)',
      description: rt(
        'Distincte de la titularité : détenir un titre n’autorise pas à exploiter si un tiers détient un titre antérieur couvrant la même mise en œuvre.',
      ),
    },
  ],
});

export default slide;
