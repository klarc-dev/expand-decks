// S6 — Titularité : points de vigilance → cardGrid (4 cartes, 2 colonnes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cardGrid',
  eyebrow: 'Partie II — Les personnes',
  title: 'Titularité : points de vigilance',
  columns: '2',
  cards: [
    {
      number: '01',
      title: 'Fondateur CTO en mandat social',
      description: rt(
        "Le fondateur CTO en mandat social sans contrat de travail est titulaire de la PI qu'il crée — si aucun acte de cession n'intervient, la société exploite un actif qui ne lui appartient pas.",
      ),
    },
    {
      number: '02',
      title: 'Copropriété de brevet',
      description: rt(
        '*(L.613-29 ss. CPI)* — régime par défaut rarement satisfaisant : chaque copropriétaire peut exploiter librement, mais toute concession de licence exige l’accord unanime sauf règlement de copropriété contraire.',
      ),
    },
    {
      number: '03',
      title: 'Droit moral incessible',
      description: rt(
        '*(L.121-1 CPI)* : pour le logiciel, réduit au droit de paternité et de retrait ; pour les créations graphiques, la modification sans accord peut être contestée.',
      ),
    },
    {
      number: '04',
      title: 'Créations plurales',
      description: rt(
        'Distinguer œuvre de collaboration *(L.113-3 CPI)* — copropriété des coauteurs — et œuvre collective *(L.113-5 CPI)* — titularité de la personne morale qui initie et divulgue.',
      ),
    },
  ],
});

export default slide;
