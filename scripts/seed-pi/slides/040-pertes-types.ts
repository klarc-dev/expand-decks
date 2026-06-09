// S3 — Les 4 pertes types → cardGrid (4 cartes numérotées, éditables).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cardGrid',
  eyebrow: 'Diagnostic',
  title: 'Quatre types de pertes récurrentes',
  columns: '2',
  sidebarText: rt('Chacune est évitable par un dispositif organisationnel adapté.'),
  cards: [
    {
      number: '01',
      title: 'Divulgation avant dépôt',
      description: rt('Destruction de la nouveauté, irréversible *(L.611-11 CPI ; art. 54 CBE)*.'),
    },
    {
      number: '02',
      title: 'Dépôt sans analyse préalable',
      description: rt('Budget mobilisé sur des titres sans valeur stratégique ni commerciale.'),
    },
    {
      number: '03',
      title: 'Titularité non sécurisée',
      description: rt(
        "L'actif est juridiquement détenu par un tiers (inventeur, prestataire, partenaire académique).",
      ),
    },
    {
      number: '04',
      title: 'Secret sans mesures de protection',
      description: rt(
        "L'information est confidentielle en fait mais pas protégeable en droit faute de mesures au sens de L.151-1 C. com.",
      ),
    },
  ],
});

export default slide;
