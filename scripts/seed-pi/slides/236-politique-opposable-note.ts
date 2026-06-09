// S24 — Conséquences pratiques : la politique PI n'est pas opposable par elle-même → cardGrid (4 cartes).
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'cardGrid',
  eyebrow: 'Étape 2 — Sécuriser',
  title: 'La politique PI n’est pas opposable par elle-même',
  columns: '2',
  sidebarText: rt(
    'Conséquences pratiques : la politique PI ne produit d’effets que par le contrat de travail ou le règlement intérieur *(L.1321-1 C. trav.)*.',
  ),
  cards: [
    {
      number: '01',
      title: 'Charte intranet signée ≠ obligation',
      description: rt(
        'Une « charte PI » diffusée sur l’intranet, même signée par le salarié, ne crée pas d’obligation contractuelle si aucun contrat n’y renvoie.',
      ),
    },
    {
      number: '02',
      title: 'Cession PI + rémunération = contrat de travail',
      description: rt(
        'Les obligations de cession de PI et de rémunération supplémentaire relèvent exclusivement du contrat de travail — elles ne peuvent pas être imposées par le règlement intérieur.',
      ),
    },
    {
      number: '03',
      title: 'Classification C0-C4 → règlement intérieur',
      description: rt(
        'Les règles de classification et de restriction de diffusion (niveaux C0-C4) peuvent être intégrées au règlement intérieur au titre des obligations de discipline *(L.1321-1 C. trav.)*.',
      ),
    },
    {
      number: '04',
      title: 'Non-salariés : la convention individuelle',
      description: rt(
        'Pour les **non-salariés** (prestataires, stagiaires, dirigeants) : ni le contrat de travail ni le règlement intérieur ne s’appliquent — seule la convention individuelle fait foi.',
      ),
    },
  ],
});

export default slide;
