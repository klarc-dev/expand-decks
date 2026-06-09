// S23 — Partager : dataroom et modèles centralisés → twoCols.
import type { SlideFactory } from '../types';

const slide: SlideFactory = ({ rt }) => ({
  blockType: 'twoCols',
  eyebrow: 'Étape 2 — Sécuriser',
  title: 'Dataroom et modèles centralisés',
  intro: rt(
    "**Principe :** on partage un document, pas une arborescence. Le destinataire accède au fichier spécifique, pas au système documentaire.\n\n**Spécifications de la dataroom :**\n- Accès nominatif par document ou dossier, avec journalisation (qui, quand, quel document, quelle action)\n- Possibilité de **révoquer l'accès** à un document déjà partagé\n- **Watermarking dynamique** sur les documents C3-C4 (nom du destinataire inséré)\n- Interdiction du téléchargement pour les niveaux C4 (consultation en ligne uniquement)",
  ),
  rightCards: [
    {
      title: 'Modèles de NDA centralisés',
      description: rt(
        '- Par scénario : salarié, prestataire, partenaire industriel, investisseur, acquéreur\n- Par langue (FR, EN minimum)\n- Chaque modèle spécifie : périmètre des informations, durée de confidentialité, obligations de non-utilisation et de restitution/destruction, juridiction',
      ),
    },
    {
      title: 'Règle opérationnelle',
      description: rt(
        'Aucun document C2+ ne quitte l’entreprise sans NDA signé préalablement. Les emails avec pièces jointes sensibles sont remplacés par des liens dataroom.',
      ),
    },
  ],
});

export default slide;
