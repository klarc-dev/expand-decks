// S15 — Points particuliers de la décision → cardGrid (4 cartes, 2 colonnes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cardGrid',
  eyebrow: 'Étape 3 — Décider',
  title: 'Décider : paramètres transverses',
  columns: '2',
  cards: [
    {
      number: '01',
      title: 'Analyse FTO',
      description: rt(
        "L'analyse FTO doit précéder toute décision de dépôt : breveter une solution qu'on ne peut pas exploiter sans licence d'un tiers est un investissement à questionner.",
      ),
    },
    {
      number: '02',
      title: 'Géographie du dépôt',
      description: rt(
        'Se raisonne par marché (où je vends) ET par concurrence (où mes concurrents fabriquent) — un brevet français seul est sans effet sur un concurrent qui fabrique en Asie et vend en Allemagne.',
      ),
    },
    {
      number: '03',
      title: 'Coût total de possession',
      description: rt(
        'Une famille de brevets sur 20 ans (rédaction, dépôts, traductions, annuités) peut atteindre 100-300 k€ — paramètre de décision dès le comité PI.',
      ),
    },
    {
      number: '04',
      title: 'Certificat d’utilité',
      description: rt(
        "Convertible en demande de brevet dans les 18 premiers mois *(L.612-15 CPI)* — première étape si l'activité inventive est à consolider.",
      ),
    },
  ],
});

export default slide;
