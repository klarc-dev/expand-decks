// S19 — Les 3 critères cumulatifs du secret d'affaires → table (3 lignes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Étape 4 — Sécuriser',
  title: 'Trois critères cumulatifs (L.151-1 C. com.)',
  surface: 'light',
  tableVariant: 'reference',
  columns: [{ header: 'Critère' }, { header: 'Exigence' }, { header: 'Vérification' }],
  rows: [
    {
      cells: [
        { value: rt('1. Valeur commerciale') },
        { value: rt("L'information tire sa valeur du fait qu'elle est secrète") },
        {
          value: rt(
            'Identifier en quoi la divulgation nuirait à l’entreprise (avantage concurrentiel, position de marché)',
          ),
        },
      ],
    },
    {
      cells: [
        { value: rt('2. Non connue / non aisément accessible') },
        {
          value: rt(
            "Elle n'est pas généralement connue ou aisément accessible pour les professionnels du secteur",
          ),
        },
        { value: rt("Vérifier l'état de l'art, les publications, les pratiques sectorielles") },
      ],
    },
    {
      cells: [
        { value: rt('3. Mesures de protection raisonnables') },
        { value: rt('Le détenteur a pris des mesures raisonnables pour la garder secrète') },
        {
          value: rt(
            "Documenter les mesures (classification, restriction d'accès, NDA, sécurité IT, formation)",
          ),
        },
      ],
    },
  ],
});

export default slide;
