import { getPayload } from 'payload';
import { AI_SLIDE_SCHEMA } from '../src/blocks/spec';
import { parseDocumentRenderPages, resolveDocumentTemplate } from '../src/documents/templates';
import { convertSlidesMarkdownToLexical } from '../src/lib/richTextWrite';
import { slugFromTitle } from '../src/lib/slug';
import type { Presentation } from '../src/payload-types';
import { closeScriptPayload } from './lib/payloadScript';

const title = 'Préparer et sécuriser un premier partenariat de R&D';
const matrix = (title: string, lead: string, headers: string[], rows: string[][]) => ({
  blockType: 'table',
  title,
  lead,
  tableVariant: 'reference',
  columns: headers.map((header) => ({ header })),
  rows: rows.map((r) => ({ cells: r.map((value) => ({ value })) })),
});
const pages = [
  {
    blockType: 'cover',
    title,
    pills: [{ text: 'La French Tech' }, { text: 'Atelier · 1 heure' }],
    subtitle:
      'Joachim Brindeau, avocat · Klarc. Vous avez repéré un problème. Vous ne savez pas encore s’il faut une invention, un partenaire ou simplement un autre regard.',
  },
  {
    blockType: 'statement',
    title: 'Du problème observé à la question de recherche',
    body: 'Cas fictif : sur un chantier, des panneaux isolants sont parfois posés alors qu’ils sont encore humides. Léa se demande si l’on pourrait repérer les lots à risque sans ouvrir les emballages.',
    footer:
      'À la salle : avant de chercher comment mesurer l’humidité, à qui parleriez-vous pour vérifier que cette décision pose vraiment problème ?',
  },
  {
    blockType: 'twoCols',
    title: 'Vérifier le besoin sur le terrain',
    intro:
      'Léa pensait demander : « Achèteriez-vous un capteur ? » La réponse lui apprendrait peu sur le chantier. Elle demande plutôt le récit de la dernière livraison sous la pluie.',
    leftFooter:
      'À vérifier : qui décide de poser, d’attendre ou de renvoyer le lot, et sur quelles informations ?',
    rightCards: [
      {
        title: 'Ce que Léa cherche à savoir',
        description: 'Comment le lot a-t-il été contrôlé ? Qu’a coûté une mauvaise décision ?',
      },
      {
        title: 'Ce qu’elle garde ouvert',
        description:
          'Une mesure, un changement de stockage ou un simple contrôle à réception pourraient convenir.',
      },
    ],
  },
  {
    blockType: 'table',
    title: 'Choisir son interlocuteur',
    lead: 'Léa ne cherche pas encore un associé ni un prestataire. Elle cherche une réponse précise.',
    tableVariant: 'reference',
    columns: ['Question ouverte', 'Premier interlocuteur'].map((header) => ({ header })),
    rows: [
      [
        'Est-ce fréquent et gênant ?',
        'Des chefs de chantier et des responsables de réception, à interroger séparément.',
      ],
      [
        'Un contrôle existe-t-il déjà ?',
        'Un fabricant de panneaux, pour comprendre ses consignes et les limites des contrôles actuels.',
      ],
      [
        'Une mesure à travers l’emballage est-elle plausible ?',
        'Une équipe de recherche en instrumentation, si la question technique reste ouverte.',
      ],
    ].map((row) => ({ cells: row.map((value) => ({ value })) })),
  },
  {
    blockType: 'quotes',
    title: 'Présenter son idée',
    lead: 'Léa a dessiné un montage possible. Pour obtenir vingt minutes avec un laboratoire, faut-il joindre son croquis ?',
    quotes: [
      {
        quote: 'Je joins le schéma de mon montage. Pourriez-vous me dire s’il fonctionnerait ?',
        authorName: 'Le croquis part dès le premier courriel',
        authorRole:
          'Léa ne sait pas encore si cette équipe est compétente ni qui lira la pièce jointe.',
      },
      {
        quote:
          'Je cherche à repérer des panneaux humides sans ouvrir leur emballage. Avez-vous déjà étudié les limites de ce type de mesure ?',
        authorName: 'Le besoin suffit pour un premier contact',
        authorRole: 'Le laboratoire peut orienter Léa sans recevoir son schéma.',
      },
    ],
  },
  {
    blockType: 'statement',
    title: 'Rédiger le premier courriel',
    body: 'Quel problème avez-vous observé ? Pourquoi écrivez-vous à cette personne ? Quelle question peut-elle vous aider à trancher ?',
    footer:
      'Exercice : rédigez ce courriel sans pièce jointe. Relisez-le en retirant tout détail technique qui n’est pas nécessaire pour obtenir une réponse.',
  },
  {
    blockType: 'twoCols',
    title: 'Préparer la communication du croquis',
    intro:
      'Le laboratoire répond : « Sans voir le montage, nous ne pouvons pas discuter de cette difficulté. » Léa doit maintenant décider quoi montrer, à qui et pourquoi.',
    leftFooter:
      'Point de vigilance : si la piste pourrait être brevetable, examiner la stratégie de dépôt avant toute divulgation publique.',
    rightCards: [
      {
        title: 'Avant l’envoi',
        description:
          'Vérifier qui peut communiquer le croquis et convenir des destinataires, de la confidentialité et du seul usage autorisé : évaluer la faisabilité.',
      },
      {
        title: 'Après l’échange',
        description:
          'Conserver la version transmise et la date. Un accord de confidentialité ne décide pas qui détiendra les résultats de futurs travaux.',
      },
    ],
  },
  {
    blockType: 'quotes',
    title: 'Définir l’objet de l’accord de confidentialité',
    lead: 'Le laboratoire demande le croquis. Comparez ces deux objets : lequel permet de distinguer une simple évaluation de travaux de développement ?',
    quotes: [
      {
        quote: 'Échanger sur un éventuel projet de recherche entre les parties.',
        authorName: 'Objet trop large',
        authorRole: 'Ni le document concerné ni la question à instruire ne sont identifiés.',
      },
      {
        quote:
          'Évaluer sur dossier si le montage décrit dans le croquis L-01 permettrait de distinguer un panneau humide à travers son emballage.',
        authorName: 'Objet circonscrit',
        authorRole:
          'Pour cet exercice, aucune reproduction du montage ni campagne d’essais n’est autorisée.',
      },
    ],
  },
  matrix(
    'Organiser les échanges confidentiels',
    'Un objet précis ne suffit pas. Quatre points à régler avant l’envoi du croquis.',
    ['Point', 'Application au cas de Léa'],
    [
      [
        'Destinataires',
        'Identifier l’entité signataire et les personnes qui ont besoin du document. Vérifier le cas du laboratoire extérieur sollicité pour avis.',
      ],
      [
        'Usage',
        'Limiter l’usage à l’évaluation sur dossier. Distinguer consultation, copie et transmission à un tiers.',
      ],
      [
        'Durées',
        'Distinguer la période pendant laquelle les échanges sont couverts et la durée de confidentialité après la dernière communication.',
      ],
      [
        'Preuve',
        'Conserver le croquis daté, sa version et les destinataires. Confirmer par écrit les précisions sensibles données à l’oral.',
      ],
    ],
  ),
  {
    blockType: 'twoCols',
    title: 'Distinguer confidentialité et protection par brevet',
    intro:
      'Une enveloppe horodatée peut aider Léa à établir le contenu de son croquis à une date donnée. Elle ne lui confère pas un monopole sur l’idée.',
    leftFooter:
      'Avant un pitch public : décider quels détails techniques retirer et, si une invention paraît brevetable, examiner l’opportunité d’un dépôt.',
    rightCards: [
      {
        title: 'Secret des affaires',
        description:
          'L’information doit être secrète, avoir une valeur commerciale du fait de ce secret et faire l’objet de mesures de protection raisonnables (art. L. 151-1 du code de commerce).',
      },
      {
        title: 'Brevet',
        description:
          'Une divulgation publique avant le dépôt peut détruire la nouveauté. Une présentation sous confidentialité effective ne se traite pas comme une publication.',
      },
    ],
  },
  {
    blockType: 'cardGrid',
    title: 'Décider des suites du premier échange',
    sidebarText:
      'Le laboratoire connaît une mesure possible, mais ignore si l’emballage la fausse. Que faire à l’issue de l’appel ?',
    columns: '3',
    cards: [
      {
        title: 'Revenir au terrain',
        description:
          'Si le besoin reste incertain, revoir les utilisateurs avant de financer une étude.',
      },
      {
        title: 'Cadrer une étude courte',
        description:
          'Si le verrou est réel, préciser la question, le coût, le livrable et les usages autorisés avant tout travail.',
      },
      {
        title: 'S’arrêter',
        description:
          'Si un contrôle existant suffit, ne pas engager de R&D. Confirmer le sort des documents déjà reçus.',
      },
    ],
  },
  matrix(
    'Cadrer une étude de faisabilité',
    'Hypothèse pédagogique : les entretiens ont confirmé le besoin. Le laboratoire propose une étude exploratoire, pas le développement d’un produit.',
    ['À définir', 'Exemple de cadrage'],
    [
      [
        'Question',
        'L’emballage masque-t-il le signal qui distingue un panneau sec d’un panneau humide ?',
      ],
      [
        'Travaux et moyens',
        'Léa fournit deux lots de référence et les conditions de stockage. Le laboratoire compare les mesures avec et sans emballage.',
      ],
      [
        'Livrable',
        'Un rapport avec le protocole, les mesures et leurs limites. Un résultat négatif doit aussi être documenté.',
      ],
      [
        'Jalon',
        'À la remise du rapport, décider ensemble de poursuivre. Aucune seconde série sans accord sur le coût et le délai.',
      ],
    ],
  ),
  matrix(
    'Identifier les parties et leurs apports',
    'L’interlocuteur scientifique n’est pas nécessairement habilité à engager l’établissement qui détient les droits.',
    ['Apport', 'Vérification avant signature'],
    [
      [
        'Croquis de Léa',
        'Qui l’a dessiné, dans quel cadre et avec quels éléments de tiers ? Léa peut-elle le communiquer et en autoriser l’usage ?',
      ],
      [
        'Méthode du laboratoire',
        'Identifier l’établissement qui peut accorder les droits. Distinguer l’accès pendant l’étude de l’usage ultérieur.',
      ],
      [
        'Échantillons du fabricant',
        'Vérifier l’origine, l’autorisation d’essai, les analyses permises et le sort des échantillons restants.',
      ],
    ],
  ),
  {
    blockType: 'twoCols',
    title: 'Choisir entre prestation et collaboration',
    intro:
      'Le laboratoire propose deux voies. Le choix dépend des travaux et des engagements réels, pas de l’intitulé du document.',
    leftFooter:
      'Dans les deux cas : le paiement de travaux ne suffit pas, à lui seul, à transférer tous les droits sur les résultats.',
    rightCards: [
      {
        title: 'Faire réaliser une étude',
        description:
          'Léa commande des mesures selon un cahier des charges. Préciser le prix, le rapport attendu, sa réception et les usages permis.',
      },
      {
        title: 'Mener une recherche commune',
        description:
          'Chaque partie apporte des moyens et participe aux choix scientifiques. Organiser les décisions, la répartition des coûts et l’exploitation des résultats.',
      },
    ],
  },
  matrix(
    'Distinguer les apports et les résultats',
    'Le rapport est remis. Léa souhaite le montrer à un industriel ; le laboratoire veut réutiliser une amélioration de sa méthode.',
    ['Élément', 'Droit à préciser'],
    [
      [
        'Croquis antérieur',
        'L’étude autorise-t-elle seulement sa consultation ou également sa reproduction pour des essais ?',
      ],
      [
        'Données et rapport',
        'Qui reçoit les mesures brutes ? Léa peut-elle transmettre le rapport à un industriel tenu à la confidentialité ?',
      ],
      [
        'Méthode améliorée',
        'Identifier qui a contribué à l’amélioration. Régler sa titularité et les droits d’usage nécessaires à chaque partenaire.',
      ],
    ],
  ),
  matrix(
    'Établir une term sheet',
    'Extrait pédagogique à compléter avant le contrat. Distinguer les points de discussion des obligations que les parties entendent rendre contraignantes.',
    ['Rubrique', 'Position à faire valider'],
    [
      [
        'Budget et pilotage',
        'Chiffrer la première série. Désigner qui valide le rapport et qui peut autoriser une dépense supplémentaire.',
      ],
      [
        'Exploitation',
        'Le laboratoire conserve sa méthode antérieure. Négocier l’accès nécessaire si Léa doit la faire utiliser par un industriel.',
      ],
      [
        'Publication',
        'Prévoir l’envoi du projet de communication, un délai de relecture et, si nécessaire, un report pour examiner un dépôt de brevet.',
      ],
    ],
  ),
  {
    blockType: 'quotes',
    title: 'Cas pratique : négocier les droits d’usage',
    lead: 'En binômes : Léa reçoit cette proposition. Identifiez le droit manquant, puis formulez une demande sans réclamer la propriété de toute la méthode.',
    quotes: [
      {
        quote: 'Le rapport est remis à Léa pour ses besoins internes.',
        authorName: 'Proposition du laboratoire',
        authorRole: 'Léa veut faire apprécier la faisabilité industrielle par un fabricant.',
      },
      {
        quote:
          'Léa pourra communiquer le rapport au fabricant désigné, sous confidentialité, pour évaluer la faisabilité industrielle.',
        authorName: 'Une réponse possible',
        authorRole:
          'Cette permission ciblée ne donne ni licence de fabrication ni droit de publier le rapport.',
      },
    ],
  },
  {
    blockType: 'statement',
    variant: 'centered-hero',
    title: 'Questions et réponses',
    body: 'Qui pourriez-vous appeler demain, et qu’aimeriez-vous savoir à la fin de la conversation ?',
    footer:
      'Discussion · 10 minutes. Partagez la question, pas les détails confidentiels de votre idée.',
  },
];
const slides = pages.map((p) => ({
  ...AI_SLIDE_SCHEMA.parse(p),
  blockType: p.blockType,
  id: `ft-heure-${slugFromTitle(p.title ?? title)}`,
}));
process.env.PAYLOAD_DB_PUSH = '0';
process.env.MASTRA_DISABLE_INIT = '1';
const { default: config } = await import('../src/payload.config');
const payload = await getPayload({ config, disableOnInit: true, cron: false });
try {
  const org = await payload.find({
    collection: 'organisations',
    where: { name: { equals: 'Klarc' } },
    limit: 2,
    depth: 0,
  });
  if (org.totalDocs !== 1) throw Error('Organisation ambiguë ou absente');
  const slug = slugFromTitle(title);
  const prior = await payload.find({
    collection: 'presentations',
    where: { or: [{ slug: { equals: slug } }, { title: { equals: title } }] },
    limit: 1,
    depth: 0,
  });
  if (prior.totalDocs) throw Error('Cette présentation existe déjà ; aucun remplacement');
  const rich = await convertSlidesMarkdownToLexical(slides, payload);
  parseDocumentRenderPages(resolveDocumentTemplate('presentation'), rich);
  const saved = await payload.create({
    collection: 'presentations',
    data: {
      title,
      slug,
      organisation: org.docs[0]!.id,
      documentTemplate: 'presentation',
      language: 'fr',
      slides: rich as Presentation['slides'],
    },
    context: { skipBuildQueue: true },
  });
  const { runBuildSlidesTask } = await import('../src/jobs/buildSlidesRunner');
  const result = await runBuildSlidesTask({
    input: { presentationId: String(saved.id) },
    req: { payload },
  });
  if (!result.output.success) throw Error(JSON.stringify(result.output));
  const built = await payload.findByID({ collection: 'presentations', id: saved.id, depth: 1 });
  console.log(JSON.stringify({ id: saved.id, artifacts: built.artifacts }));
} finally {
  await closeScriptPayload(payload);
}
process.exit(0);
