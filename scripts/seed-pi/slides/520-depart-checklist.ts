// S25 — Le départ d'un collaborateur → table (checklist procédure de sortie, 5 lignes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'table',
  eyebrow: 'Étape 5 — Le départ',
  title: 'Procédure de sortie PI',
  surface: 'light',
  tableVariant: 'reference',
  columns: [{ header: 'Action' }, { header: 'Responsable' }, { header: 'Délai' }],
  rows: [
    {
      cells: [
        {
          value: rt(
            'Entretien de sortie PI : rappel écrit des obligations de confidentialité survivant au contrat, listant les actifs PI et secrets auxquels le collaborateur a eu accès',
          ),
        },
        { value: rt('Responsable PI + RH') },
        { value: rt('Avant le dernier jour') },
      ],
    },
    {
      cells: [
        {
          value: rt(
            'Restitution de tous les supports : matériel, documents, copies, clés USB, notes personnelles relatives à l’activité',
          ),
        },
        { value: rt('RH') },
        { value: rt('Dernier jour') },
      ],
    },
    {
      cells: [
        {
          value: rt(
            'Clôture de tous les accès : dataroom, serveurs, outils de gestion de projet, messagerie, VPN',
          ),
        },
        { value: rt('IT') },
        { value: rt('Jour du départ — pas de délai') },
      ],
    },
    {
      cells: [
        { value: rt('Archivage du PV d’entretien de sortie signé') },
        { value: rt('RH / PI') },
        { value: rt('Immédiat') },
      ],
    },
    {
      cells: [
        {
          value: rt(
            'Mise en surveillance : vérifier les dépôts de brevets, publications et créations d’entreprise du collaborateur sortant dans les 12-24 mois',
          ),
        },
        { value: rt('PI') },
        { value: rt('En continu post-départ') },
      ],
    },
  ],
});

export default slide;
