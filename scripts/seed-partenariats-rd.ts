import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { deepStrictEqual } from 'node:assert/strict';

import { AI_SLIDE_SCHEMA, SPEC_BY_TYPE } from '../src/blocks/spec';
import { fieldsOf } from '../src/blocks/spec/dsl';
import { parseDocumentRenderPages, resolveDocumentTemplate } from '../src/documents/templates';
import { slugFromTitle } from '../src/lib/slug';
import type { Presentation } from '../src/payload-types';

const courseTitle = 'Optimiser et sécuriser ses partenariats R&D';
// `--short` builds the 30-minute version: same content and wording, fewer detail pages.
const short = process.argv.includes('--short');
const title = short ? `${courseTitle} · 30 minutes` : courseTitle;
const template = resolveDocumentTemplate('presentation');
const [intro, pi, exchanges, scope, talks, specifics, questions] = [
  'Introduction',
  'Notions indispensables',
  'Sécurisation des échanges',
  'Cadrage du projet',
  'Négociation d’un contrat',
  'Points particuliers',
  'Questions et réponses',
];
type Pair = [string, string];
const slideId = (title: string) =>
  `partenariats-rd-${process.argv.includes('--short') ? '30-' : ''}${slugFromTitle(title)}`;
const section = (number: string, title: string, subtitle: string) => ({
  blockType: 'section',
  number,
  title,
  subtitle,
});
const statement = (title: string, body: string, footer: string) => ({
  blockType: 'statement',
  title,
  body,
  footer,
});
const grid = (title: string, sidebarText: string, items: Pair[]) => ({
  blockType: 'cardGrid',
  title,
  sidebarText,
  columns: items.length === 3 || items.length === 6 ? '3' : '2',
  cards: items.map(([title, description]) => ({ title, description })),
});
const split = (title: string, intro: string, leftFooter: string, items: Pair[]) => ({
  blockType: 'twoCols',
  title,
  intro,
  leftFooter,
  rightCards: items.map(([title, description]) => ({ title, description })),
});
const table = (title: string, lead: string, headers: string[], data: string[][]) => ({
  blockType: 'table',
  title,
  lead,
  tableVariant: 'reference',
  columns: headers.map((header) => ({ header })),
  rows: data.map((row) => ({ cells: row.map((value) => ({ value })) })),
});
const timeline = (title: string, lead: string, items: Pair[]) => ({
  blockType: 'timeline',
  title,
  lead,
  steps: items.map(([label, description]) => ({ label, description })),
});
const notes = <T extends Record<string, unknown>>(slide: T, ...sources: string[]) => ({
  ...slide,
  footnotes: sources.map((text) => ({ text })),
});

// Recomposition of the October 2024 PDF; ranges below are source page numbers.
const pages = [
  {
    blockType: 'cover',
    pills: [{ text: 'Formation' }, { text: 'Source : 4 septembre 2024' }],
    title,
    subtitle:
      'Joachim Brindeau, avocat. De la première divulgation à l’exploitation des résultats, comment organiser un projet de recherche et développement à plusieurs ?',
  },
  {
    blockType: 'agenda',
    title: 'Sommaire',
    lead: 'Suivre le partenariat de ses premiers échanges à l’exploitation des résultats.',
    items: [intro, pi, exchanges, scope, talks, specifics, questions].map((label) => ({
      label,
      slideId: slideId(label),
    })),
  },

  // 3–6 · Introduction
  section(
    '01',
    intro,
    'Un projet de R&D organise des travaux dont l’issue scientifique ou technique est incertaine. Les partenaires doivent prévoir comment en partager la valeur si les travaux aboutissent.',
  ),
  timeline(
    'Exemple de projet R&D',
    'Une entreprise développe des molécules avec une université, un prestataire de recherche et un industriel.',
    [
      ['Bibliothèque', 'L’entreprise constitue une bibliothèque de molécules en interne.'],
      ['10 candidats', 'Une université crible la bibliothèque.'],
      [
        '1 candidat (PoC)',
        'Le modèle d’un organisme de recherche sous contrat (CRO) permet de confirmer un candidat.',
      ],
      ['Composition (PoF)', 'L’entreprise formule la composition en interne.'],
      ['Produit commercialisable', 'L’entreprise industrialise la composition avec un partenaire.'],
    ],
  ),
  {
    blockType: 'mermaid',
    title: 'Chronologie d’un partenariat',
    lead: 'Avant tout échange d’informations ou de matériel, horodatez les connaissances propres de chaque partenaire.',
    source:
      'flowchart LR\n A["Échanges<br/>protégés"] -->|préparent| B["Cadrage<br/>technique"]\n B -->|ouvre la| C["Négociation"]\n C -->|aboutit au| D["Contrat signé"]\n C -->|peut mener à| E["Arrêt des<br/>pourparlers"]\n D -->|encadre les| F["Travaux de R&D"]\n F -->|livrent les résultats pour| G["Exploitation"]',
    caption:
      'En cours d’exécution, les partenaires peuvent réviser le projet. Après les travaux, ils peuvent améliorer les livrables en continu ou abandonner le projet.',
  },
  grid(
    'Sécuriser et optimiser',
    'Deux objectifs distincts : réduire les risques pour les apports et les droits ; faciliter les décisions et le financement.',
    [
      [
        'Préserver les apports',
        'Protégez la confidentialité des apports : qui peut recevoir les informations ou le matériel, et à quelles fins ?',
      ],
      [
        'Sécuriser l’exploitation',
        'Attribuez la propriété industrielle ; vérifiez la liberté d’exploitation, les exclusivités et les contraintes de concurrence.',
      ],
      [
        'Fluidifier les décisions',
        'Accélérez la négociation en fixant qui décide, comment adapter les travaux et quand arrêter en cas d’échec.',
      ],
      [
        'Préparer le financement',
        'Alignez les engagements, la facturation et la documentation sur les financements publics ou dispositifs fiscaux envisagés.',
      ],
    ],
  ),

  // 7–9 · Notions indispensables
  section(
    '02',
    pi,
    'Distinguer ce qui est apporté, ce qui est produit et les droits nécessaires pour utiliser les résultats.',
  ),
  grid(
    'Notions à maîtriser',
    'Sauf accord contraire, posséder un résultat ne donne pas le droit d’utiliser les connaissances propres d’un partenaire dont ce résultat dépend.',
    [
      [
        'Connaissances propres',
        'Actifs détenus ou contrôlés avant le contrat, ou acquis ou développés indépendamment du projet selon les définitions convenues.',
      ],
      [
        'Connaissances nouvelles',
        'Actifs issus des travaux du projet. Séparez les résultats propres à une partie des résultats conjoints.',
      ],
      [
        'Droits sur les actifs',
        'Propriété entière ou quote-part ? Pour la licence : gratuité ou prix, exclusivité, durée, territoire, secteur et sous-licence.',
      ],
      [
        'Dépendance et inventeurs',
        'Prévoyez l’accès aux apports indispensables à l’exploitation. Nommer les inventeurs reconnaît leur contribution ; examinez séparément la rémunération des salariés.',
      ],
    ],
  ),
  notes(
    table(
      'Droits de propriété intellectuelle',
      'Un même livrable peut relever de plusieurs régimes.',
      ['Actif', 'Critère ou protection', 'Point de vigilance'],
      [
        [
          'Information technique ou commerciale',
          'Un savoir-faire peut relever du secret des affaires s’il est secret et tire de ce secret une valeur commerciale[^1].',
          'Des mesures raisonnables de protection sont nécessaires.',
        ],
        [
          'Invention',
          'Nouveauté, activité inventive et application industrielle[^2].',
          'Avant toute divulgation, examiner le dépôt d’un brevet ou d’un certificat d’utilité.',
        ],
        [
          'Rapport, dessin ou logiciel',
          'Le droit d’auteur peut protéger une forme originale, sans dépôt.',
          'Il ne protège pas les informations techniques en tant que telles.',
        ],
        [
          'Base de données',
          'Le producteur prend l’initiative et le risque d’un investissement substantiel pour constituer, vérifier ou présenter le contenu[^3].',
          'Le droit du producteur protège le contenu ; le droit d’auteur peut aussi protéger une structure originale.',
        ],
        [
          'Autres actifs',
          'Selon le projet : dessins et modèles, marques, obtentions végétales ou topographies de semi-conducteurs.',
          'Inventorier aussi les noms de domaine, sans les assimiler à des titres de propriété industrielle.',
        ],
      ],
    ),
    '[Code de commerce, art. L. 151-1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037266553)',
    'Code de la propriété intellectuelle, art. L. 611-10 et suivants.',
    'Code de la propriété intellectuelle, art. L. 341-1.',
  ),

  // 10–14 · Sécurisation des échanges
  section(
    '03',
    exchanges,
    'Fixer les règles de confidentialité et d’usage avant de communiquer une information confidentielle ou d’envoyer du matériel propriétaire.',
  ),
  notes(
    split(
      'Mettre en place un accord de confidentialité',
      'Le droit commun engage la responsabilité de celui qui utilise ou divulgue sans autorisation une information confidentielle obtenue pendant les négociations[^1]. Un accord précise quelles informations sont concernées et comment elles peuvent être utilisées.',
      'Question à trancher : le destinataire peut-il utiliser l’information pour ses propres travaux ou pour déposer un brevet ?',
      [
        [
          'Périmètre',
          'Gardez la trace des informations transmises et précisez lesquelles sont confidentielles. Un sous-traitant peut les recevoir sans en divulguer lui-même.',
        ],
        [
          'Deux durées',
          'Exemple : échanger pendant un an. Fixer séparément la durée de confidentialité et la date de départ si des échanges ont déjà eu lieu.',
        ],
        [
          'Usage autorisé',
          'Limiter l’usage à l’évaluation convenue. Traiter les divulgations à des tiers et les dépôts fondés sur les informations reçues.',
        ],
      ],
    ),
    'Code civil, art. 1112-2.',
  ),
  {
    blockType: 'quotes',
    eyebrow: 'Atelier · accord de confidentialité',
    title: 'Définir l’objet des discussions',
    lead: 'L’université B peut-elle identifier les essais que la société A envisage et leur finalité ?',
    quotes: [
      {
        quote:
          'Discuter de la faisabilité d’un projet de recherche entre la société A et l’université B.',
        authorName: 'À éviter',
        authorRole: 'Rien ne distingue ce projet d’un autre.',
      },
      {
        quote:
          'Discuter d’essais visant à évaluer les performances du nouveau modèle d’étude du microbiome cutané développé par A sur sa plateforme propriétaire et tenu confidentiel.',
        authorName: 'À retenir',
        authorRole: 'Le modèle, son origine et l’objectif des essais sont identifiés.',
      },
    ],
  },
  notes(
    grid(
      'Mettre en place un accord de transfert de matériel',
      'Sans clause limitative, le destinataire qui détient licitement un échantillon peut, sous conditions, l’étudier pour en découvrir les caractéristiques.',
      [
        [
          'Objet du transfert',
          'Identifier le matériel, les quantités, les personnes autorisées et la durée de l’évaluation.',
        ],
        [
          'Essais et limites',
          'Décrire les essais permis et, si nécessaire, interdire ou limiter l’ingénierie inverse[^1].',
        ],
        [
          'Livrables et droits',
          'Préciser le rapport attendu et les droits sur les données, modifications, améliorations et applications.',
        ],
        [
          'Fin du transfert',
          'Fixer les modalités de retour ou de destruction du matériel et le sort des données.',
        ],
      ],
    ),
    '[Code de commerce, art. L. 151-3](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037266559)',
  ),
  notes(
    split(
      'Secret des affaires : articles L. 151-1 et suivants',
      'L’information, seule ou dans l’assemblage précis de ses éléments, ne doit être ni généralement connue ni aisément accessible aux professionnels du secteur. Son secret doit lui conférer une valeur commerciale effective ou potentielle, et son détenteur légitime doit prendre des mesures raisonnables pour le préserver[^1].',
      'En pratique : restreignez et tracez les accès ; adaptez les restrictions au contenu et au matériel transmis.',
      [
        [
          'Détention légitime',
          'Le détenteur légitime est celui qui contrôle licitement l’information[^2].',
        ],
        [
          'Obtention licite',
          'La découverte ou la création indépendante est licite. Sauf clause l’interdisant ou la limitant, l’observation, l’étude, le démontage ou le test d’un objet public ou licitement détenu le sont aussi[^3].',
        ],
      ],
    ),
    'Code de commerce, art. L. 151-1.',
    'Code de commerce, art. L. 151-2.',
    'Code de commerce, art. L. 151-3.',
  ),

  // 15–23 · Cadrage
  section(
    '04',
    scope,
    'Le contrat ne remplace pas le cadrage : il donne effet aux choix déjà faits sur les objectifs, les moyens et les responsabilités.',
  ),
  grid(
    'Raisons du cadrage',
    'Avant de promettre un résultat, vérifiez que les partenaires disposent des droits et des moyens nécessaires pour le livrer.',
    [
      [
        'Un droit manquant',
        'Inventorier les connaissances propres de chacun révèle les brevets ou licences de tiers qui limiteraient l’exploitation.',
      ],
      [
        'Un destinataire indésirable',
        'Identifier les filiales et sous-traitants évite de transmettre une information sensible à un concurrent.',
      ],
      [
        'Un budget non couvert',
        'Chiffrer les engagements permet de justifier les fonds demandés et d’examiner le traitement fiscal des dépenses.',
      ],
      [
        'Un projet sans issue prévue',
        'Nommer les décideurs et fixer les jalons permet de réorienter les travaux ou d’en sortir si l’objectif devient inaccessible.',
      ],
    ],
  ),
  grid(
    'Thématiques à encadrer',
    'Le cadrage sert aussi à documenter les demandes de financement, le pilotage et les conditions de sortie.',
    [
      ['Contexte', 'Justification stratégique, état de départ technique et objectif final.'],
      [
        'Parties',
        'Signataires, statut, filiales, sous-traitants, agréments et accès aux informations.',
      ],
      ['Phases', 'Travaux par phase, jalons, décisions de poursuite ou d’arrêt, livrables.'],
      ['Tâches', 'Contenu, calendrier, lieu, ressources, responsable et tiers impliqués.'],
      ['Pilotage', 'Coordinateur, comités technique et stratégique, mandat pour les titres.'],
      ['Moyens', 'Financement, équipes, matériel, connaissances propres et restrictions d’usage.'],
    ],
  ),
  notes(
    split(
      'Définir le contexte',
      'Consignez l’objectif stratégique, l’état technique de départ et le résultat recherché. Le préambule expose la finalité commune ; une annexe peut détailler le cadrage.',
      'Point de vigilance : documenter le contexte ne garantit ni financement ni éligibilité à un dispositif fiscal.',
      [
        [
          'Interpréter',
          'Rattacher chaque engagement à son objectif lorsque des difficultés d’interprétation apparaissent.',
        ],
        [
          'Adapter',
          'Identifier les hypothèses de départ et la procédure de révision ; l’imprévision a ses propres conditions[^1].',
        ],
        [
          'Justifier',
          'Exemples du support de 2024 : documenter une demande EIC, PIA ou BFT, ou étayer un dossier CICo, CIR, CII ou IP Box.',
        ],
      ],
    ),
    'Code civil, art. 1195.',
  ),
  grid(
    'Définir les parties',
    'Identifier les filiales et sous-traitants à déclarer aux financeurs ; vérifier le statut du partenaire pour le CICo.',
    [
      [
        'Identifier le signataire',
        'Relever le SIREN, pas seulement le nom commercial. Préciser le statut : ORDC, fondation, société privée ou porteur de projet.',
      ],
      [
        'Cartographier les exécutants',
        'Le signataire est-il la société mère d’un concurrent ? Peut-il sous-traiter à ce concurrent ?',
      ],
      [
        'Attribuer les responsabilités',
        'Qui répond d’une divulgation de l’invention avant le dépôt du brevet ? Vérifier les recours contre le signataire.',
      ],
      [
        'Vérifier les agréments',
        'Contrôler le titulaire et la validité des agréments CIR/CII. Dans l’exemple de 2024, un agrément expiré expose à un manque à gagner de 30 %.',
      ],
    ],
  ),
  split(
    'Définir les tâches',
    'Pour chaque tâche, indiquez les travaux à réaliser, les dates, la durée, l’entité responsable, les tiers impliqués, le lieu, les ressources et le livrable attendu.',
    'Décision : le jalon doit dire qui valide le livrable et ce qui se passe s’il n’est pas accepté.',
    [
      [
        'Pilotage',
        'Planifier les équipes et les achats ; si des essais ont lieu à l’étranger, anticiper le transport et les formalités d’exportation du matériel.',
      ],
      ['Confidentialité', 'Identifier les connaissances propres dont chaque exécutant a besoin.'],
      [
        'Responsabilités',
        'Tracer les contributions et les défaillances ; les apports peuvent compter dans le partage des droits si le contrat le prévoit.',
      ],
    ],
  ),
  table(
    'Définir les comités de pilotage',
    'Le coordinateur est une personne physique ; les comités réunissent des personnes physiques. Le mandataire commun ou unique est une personne morale.',
    ['Rôle', 'Mission'],
    [
      ['Coordinateur', 'Convoque les comités, centralise les notifications et organise le suivi.'],
      [
        'Comité technique',
        'Suit les travaux et décide des ajustements techniques dans son mandat.',
      ],
      [
        'Comité stratégique',
        'Décide de poursuivre ou d’arrêter, de publier ou de déposer un titre, d’exclure une partie défaillante ou de remplacer un sous-traitant.',
      ],
      [
        'Mandataire',
        'Coordonne les démarches sur les titres avec le conseil désigné, selon le mandat et le régime applicables.',
      ],
    ],
  ),
  grid(
    'Définir les moyens',
    'Consignez les engagements et signalez les restrictions connues. Si le contrat répartit les droits sur les résultats selon les apports, cet inventaire sert de référence.',
    [
      ['Financiers', 'Montants, objet de la dépense, destinataire et échéancier des paiements.'],
      [
        'Humains',
        'Équivalents temps plein, qualifications et, si nécessaire, responsable scientifique identifié.',
      ],
      [
        'Matériels',
        'Équipements à acquérir ou louer, matériel propriétaire et budget des consommables.',
      ],
      [
        'Connaissances propres',
        'Technologies et matériel propriétaire : brevet, certificat d’utilité, COV ou secret. Logiciels : droit d’auteur ; bases de données : droit du producteur, savoir-faire.',
      ],
    ],
  ),

  // 24–29 · Négociation
  section(
    '05',
    talks,
    'Mettre par écrit les arbitrages essentiels avant la rédaction détaillée des clauses.',
  ),
  {
    imageAsset: 'term-sheet',
    imagePosition: 'right',
    ...split(
      'Établir une term sheet',
      'La term sheet résume les conditions envisagées, souvent en tableau. Dans le spécimen ALPHA/BETA, elle sert à discuter, sans constituer un accord contraignant.',
      'Repérer tôt les points de blocage accélère la négociation et facilite la rédaction du contrat principal.',
      [
        ['Projet', 'Objet, parties, définitions, contributions, pilotage et livrables.'],
        [
          'Propriété et exploitation',
          'Connaissances propres, résultats nouveaux, améliorations, licences et exclusivité.',
        ],
        ['Économie et suite', 'Financement, paiements et conditions d’arrêt.'],
      ],
    ),
  },
  table(
    'Choisir le type de contrat',
    'Le titre seul ne détermine pas les effets du contrat. Un vocabulaire commun facilite les échanges avec les équipes, les financeurs et l’administration fiscale.',
    ['Montage', 'Quand y recourir'],
    [
      [
        'Collaboration R&D',
        'Plusieurs parties mettent des moyens en commun pour mener des travaux.',
      ],
      [
        'Recherche sponsorisée (SRA / Award)',
        'Une partie finance les travaux de l’autre, par exemple lorsqu’une entreprise finance un laboratoire public.',
      ],
      [
        'Consortium',
        'Plus de deux partenaires organisent un programme commun, par exemple dans un projet financé par le PIA ou l’EIC.',
      ],
      [
        'Sous-traitance R&D',
        'Un prestataire réalise des travaux définis pour le client ; dans l’exemple, le contrat prévoit de lui céder les résultats.',
      ],
    ],
  ),
  table(
    'Autres types de contrat',
    'Un cadre récurrent, une offre commune et une thèse ne répartissent pas les obligations de la même façon.',
    ['Montage', 'Quand y recourir'],
    [
      [
        'Accord-cadre de services R&D',
        'Définir les règles des contrats d’application successifs, par exemple pour solliciter régulièrement un prestataire de recherche (CRO).',
      ],
      [
        'Co-traitance R&D',
        'Réunir les moyens de plusieurs opérateurs pour répondre ensemble à un appel d’offres de R&D.',
      ],
      [
        'Convention CIFRE',
        'Financer un doctorant en partenariat avec le laboratoire et l’école doctorale, dans le cadre du dispositif géré par l’ANRT.',
      ],
    ],
  ),
  notes(
    table(
      'Autres outils de négociation',
      'Lisez les obligations réelles plutôt que l’intitulé du document.',
      ['Outil', 'Effet recherché'],
      [
        [
          'Pacte de préférence',
          'Offrir en priorité au bénéficiaire de traiter si l’on décide de contracter[^1].',
        ],
        [
          'Lettre d’intention (LoI) ou mémorandum d’entente (MoU)',
          'Dans l’exemple, les parties s’engagent à entrer en négociation, pas à conclure le contrat.',
        ],
        [
          'Accord partiel ou provisoire',
          'Fixer certains points avant l’accord complet ; préciser lesquels obligent déjà les parties.',
        ],
        [
          'Promesse unilatérale',
          'Le bénéficiaire peut opter, dans le délai convenu, pour un contrat dont les éléments essentiels sont fixés[^2].',
        ],
      ],
    ),
    'Code civil, art. 1123.',
    'Code civil, art. 1124.',
  ),
  grid(
    'Principaux points de négociation',
    'Fixer ces choix avant les formulations détaillées évite de rouvrir le montage en fin de négociation.',
    [
      [
        'Pilotage',
        'Quels rôles pour les comités, le coordinateur et le mandataire ? Qui décide et selon quel vote ?',
      ],
      [
        'Droits de propriété intellectuelle',
        'Qui peut utiliser les connaissances propres et exploiter les résultats nouveaux ? Qui les détient et décide de déposer un titre ?',
      ],
      [
        'Confidentialité et publication',
        'Qui peut divulguer quoi, après quel examen, et avec quel délai avant publication ?',
      ],
      [
        'Jalons',
        'Qu’est-ce qui déclenche un paiement, une correction, une suspension ou une résiliation ?',
      ],
    ],
  ),

  // 30–36 · Points particuliers
  section(
    '06',
    specifics,
    'Rendre les résultats exploitables, le pilotage opérationnel et les flux financiers cohérents avec ce qui est réellement livré.',
  ),
  {
    imageAsset: 'definitions',
    imagePosition: 'left',
    ...split(
      'Gestion des résultats',
      'Ce schéma illustre les définitions d’un contrat, non une classification légale universelle.',
      'Confidentialité : elle peut couvrir aussi bien un apport antérieur qu’un résultat.',
      [
        [
          'Connaissances propres',
          'Une partie apporte un actif préexistant ou développé indépendamment du projet.',
        ],
        [
          'Résultats du projet',
          'Distinguez les résultats propres à une partie et les résultats conjoints ; fixez pour chacun les droits d’exploitation.',
        ],
      ],
    ),
  },
  split(
    'Exemple : le rapport d’essais',
    'A réalise pour B des essais sur son modèle d’étude du microbiome cutané, puis lui remet un rapport d’essais. Ce livrable relève de trois définitions à la fois.',
    'À prévoir : les droits de B sur le rapport ne lui donnent pas le droit d’utiliser le protocole de A hors du projet.',
    [
      [
        'Un résultat',
        'Les mesures et conclusions du rapport sont issues des travaux. Elles suivent le régime convenu pour les résultats propres ou conjoints.',
      ],
      [
        'Des connaissances propres',
        'Le rapport décrit le modèle et le protocole préexistants de A. Ils restent à A ; B ne peut les utiliser que dans la mesure prévue pour exploiter le rapport.',
      ],
      [
        'Une information confidentielle',
        'Le rapport est remis sous confidentialité. B ne peut le transmettre à un tiers ni le publier que dans les conditions convenues.',
      ],
    ],
  ),
  split(
    'Cession des résultats et code source',
    'Nommez les résultats commandés et les droits cédés. Si A développe aussi un outil hors commande, précisez qui le conserve : un outil nouveau ne devient pas une antériorité du seul fait que B ne le demande pas.',
    'Point de vigilance : distinguez la remise d’un livrable, le transfert des droits et l’accès aux sources.',
    [
      [
        'Déclenchement',
        'Si la cession dépend du paiement, indiquez quel règlement transfère quels droits. Pour un bien livré, examinez séparément l’intérêt d’une réserve de propriété.',
      ],
      [
        'Code source',
        'Si sa remise est prévue après paiement, distinguer l’échéance de remise du code source et la date de transfert des droits.',
      ],
      [
        'Dépendances',
        'Organiser une licence sur les éléments propres nécessaires pour exploiter le résultat.',
      ],
    ],
  ),
  grid('Pilotage', 'Distinguez les réunions de suivi et les décisions qui engagent les parties.', [
    [
      'Composition et rythme',
      'Membres, convocation, réunions ordinaires ou exceptionnelles, ordre du jour.',
    ],
    [
      'Pouvoirs et votes',
      'Compétence de chaque comité, quorum, majorité ou unanimité selon la décision.',
    ],
    [
      'Blocage et preuve',
      'Prévoir l’escalade, les délais et la notification. Tenir un relevé des décisions.',
    ],
    [
      'Mandat',
      'Avec un organisme public, vérifier si un mandataire unique doit gérer les titres communs (décret de décembre 2023).',
    ],
  ]),
  table(
    'Résultats non brevetables',
    'La disponibilité de chaque option dépend de la nature de l’actif et des droits effectivement détenus.',
    ['Objectif', 'Options à examiner'],
    [
      [
        'Transférer le droit',
        'Cession totale ou d’une quote-part ; organisation de la copropriété.',
      ],
      [
        'Permettre l’exploitation',
        'Licence avec ou sans faculté de sous-licencier ; fixer l’exclusivité, les domaines d’usage, les marchés, les territoires et les clients concernés.',
      ],
      ['Financer ou structurer', 'Nantissement ou apport en nature lorsque le droit s’y prête.'],
      [
        'Reconnaître une valeur comptable',
        'Examiner si les conditions d’inscription à l’actif et d’immobilisation sont remplies.',
      ],
    ],
  ),
  notes(
    {
      blockType: 'stats',
      eyebrow: 'Cas fiscal · scénario 1 sur 2 · septembre 2024',
      title: 'Flux financiers facturés par A à B : scénario classique',
      lead: 'A dispose de l’agrément CIR et facture une prestation unique. Les montants ci-dessous illustrent le calcul du support de 2024[^1].',
      stats: [
        { value: '10 000 € HT', label: 'Recherche sur l’état de l’art réalisée par A.' },
        { value: '30 000 € HT', label: 'Essais de R&D réalisés par A sur son propre modèle.' },
        {
          value: '12 000 €',
          label: 'CIR de B dans l’exemple : 30 % de la facture totale de 40 000 € HT.',
        },
      ],
    },
    'A comptabilise 40 000 € de prestations et exclut de sa propre assiette CIR tous les coûts de R&D correspondants. Références citées en 2024 : BOFiP et décision Takima. Ne pas transposer sans vérification.',
  ),
  table(
    'Flux financiers facturés par A à B : nouveau scénario',
    'A distingue les travaux des droits réellement accordés à B. Quatre lignes de 10 000 € HT donnent un total inchangé de 40 000 € HT.',
    ['Ligne facturée à B', 'Contrepartie', 'Montant HT'],
    [
      ['Veille technologique', 'Recherche dans l’état de l’art.', '10 000 €'],
      [
        'Licence sur les connaissances propres',
        'Droit d’utiliser le modèle préexistant de A.',
        '10 000 €',
      ],
      ['Prestation de R&D', 'Travaux de recherche confiés à A.', '10 000 €'],
      ['Droits sur les résultats', 'Cession des résultats ou licence consentie à B.', '10 000 €'],
    ],
  ),
  split(
    'Flux financiers facturés par A à B : effets',
    'Pour B, le support retient le même CIR de 12 000 €, sous réserve du plafond de veille alors cité (60 000 € HT par an et par entité). Si les frais de propriété industrielle sont immobilisés, leur prise en compte suit les amortissements.',
    'Limite : ces chiffres illustrent les hypothèses de 2024. Un libellé de facture ne suffit pas : vérifier les opérations, les justificatifs et les règles de l’exercice concerné.',
    [
      [
        'A : distinguer R&D confiée et interne',
        'Dans le calcul illustré, A retranche les coûts liés aux 10 000 € de prestation et réintègre les coûts de R&D correspondant aux 30 000 € restants, non les recettes elles-mêmes.',
      ],
      [
        'A : isoler les revenus de droits',
        'Le cas identifie 20 000 € de revenus de propriété industrielle potentiellement éligibles à l’IP Box. Ce montant n’est ni une économie d’impôt ni un bénéfice net imposable.',
      ],
    ],
  ),

  // 37–38 · Échanges et contact
  {
    ...statement(
      questions,
      'Quel droit vous manquerait pour exploiter vos résultats ?',
      'Quels échanges protéger dès maintenant ? Quelle décision le contrat doit-il permettre de prendre ?',
    ),
    eyebrow: '07 · Discussion',
    variant: 'centered-hero',
  },
  {
    blockType: 'cta',
    eyebrow: 'Klarc',
    title: 'Contact',
    subtitle:
      'Vous préparez un partenariat ? Échangez avec Klarc sur les résultats à protéger et les droits à négocier.',
    primaryAction: 'Prendre rendez-vous',
    primaryActionUrl: '{org.bookingUrl}',
    footerNote:
      'Coordonnées du support de 2024 : Joachim Brindeau, avocat · +33 7 87 87 60 83 · 19 rue Job, 31000 Toulouse.',
  },
];

const shortTitles = new Set<string>([
  'Sommaire',
  intro,
  'Chronologie d’un partenariat',
  'Sécuriser et optimiser',
  pi,
  'Notions à maîtriser',
  exchanges,
  'Mettre en place un accord de confidentialité',
  'Définir l’objet des discussions',
  scope,
  'Thématiques à encadrer',
  talks,
  'Établir une term sheet',
  'Autres outils de négociation',
  'Principaux points de négociation',
  specifics,
  'Gestion des résultats',
  'Exemple : le rapport d’essais',
  'Cession des résultats et code source',
  'Flux financiers facturés par A à B : nouveau scénario',
  'Flux financiers facturés par A à B : effets',
  questions,
  'Contact',
]);
const deckPages = short
  ? pages
      .filter((page) => page.blockType === 'cover' || shortTitles.has(page.title))
      .map((page) =>
        page.blockType === 'cover'
          ? {
              ...page,
              title: courseTitle,
              pills: [{ text: 'Formation · 30 minutes' }, { text: 'Source : 4 septembre 2024' }],
            }
          : page,
      )
  : pages;
if (short && deckPages.length !== shortTitles.size + 1)
  throw new Error(
    `Format court : ${shortTitles.size + 1 - deckPages.length} page(s) introuvable(s)`,
  );

const slides = deckPages.map((page, index) => {
  const parsed = AI_SLIDE_SCHEMA.safeParse(page);
  if (!parsed.success)
    throw new Error(`Diapositive ${index + 1} : ${JSON.stringify(parsed.error.issues)}`);
  const spec = SPEC_BY_TYPE.get(page.blockType);
  if (!spec) throw new Error(`Layout inconnu : ${page.blockType}`);
  const defaults = Object.fromEntries(
    fieldsOf(spec)
      .filter((field) => field.factory !== 'preview')
      .map((field) => [
        field.name,
        field.payload?.defaultValue ?? (field.payload?.type === 'array' ? [] : null),
      ]),
  );
  return {
    ...defaults,
    ...parsed.data,
    id: slideId(page.title),
    blockType: page.blockType,
    ...(page.blockType === 'agenda' && 'items' in page && page.items
      ? {
          items: page.items.map((item) => {
            const target = deckPages.findIndex(
              (candidate) => slideId(candidate.title) === item.slideId,
            );
            if (target < 0) throw new Error(`Section introuvable : ${item.label}`);
            return { ...item, description: `p. ${target + 1}` };
          }),
        }
      : {}),
  };
});
const { values } = parseArgs({
  allowPositionals: true,
  options: {
    check: { type: 'boolean' },
    short: { type: 'boolean' },
    build: { type: 'boolean' },
    'replace-build': { type: 'string' },
    'asset-dir': { type: 'string', default: 'scripts/seed-assets/partenariats-rd' },
  },
});

if (values.check) {
  console.log(
    JSON.stringify({
      title,
      slides: slides.length,
      layouts: [...new Set(slides.map((slide) => slide.blockType))],
    }),
  );
} else {
  process.env.PAYLOAD_DB_PUSH = '0';
  process.env.MASTRA_DISABLE_INIT = '1';
  const [
    { getPayload },
    { default: config },
    { closeScriptPayload },
    { convertSlidesMarkdownToLexical },
  ] = await Promise.all([
    import('payload'),
    import('../src/payload.config'),
    import('./lib/payloadScript'),
    import('../src/lib/richTextWrite'),
  ]);
  const payload = await getPayload({ config, disableOnInit: true, cron: false });
  try {
    const { docs } = await payload.find({
      collection: 'organisations',
      where: { name: { equals: 'Klarc' } },
      limit: 2,
      depth: 0,
    });
    if (docs.length !== 1 || !docs[0]) throw new Error('Organisation Klarc introuvable ou ambiguë');
    const organisation = docs[0].id;
    const richSlides = await convertSlidesMarkdownToLexical(slides, payload);
    parseDocumentRenderPages(template, richSlides);
    const data = {
      title,
      slug: slugFromTitle(title),
      organisation,
      documentTemplate: 'presentation' as const,
      language: 'fr' as const,
      status: 'draft' as const,
      slides: richSlides as Presentation['slides'],
    };
    {
      const existing = await payload.find({
        collection: 'presentations',
        where: { and: [{ title: { equals: title } }, { organisation: { equals: organisation } }] },
        limit: 1,
        depth: 0,
      });
      const prior = existing.docs[0];
      if (
        values['replace-build'] &&
        (!prior ||
          existing.totalDocs !== 1 ||
          prior.lastBuildStatus !== 'success' ||
          !prior.artifacts?.some((a) => a.key === 'pdf' && a.buildId === values['replace-build']))
      )
        throw new Error('Version à remplacer absente ou modifiée');
      if (existing.totalDocs && !values['replace-build'])
        throw new Error(
          `Une présentation porte déjà ce titre : ${existing.docs[0]?.id}. Aucun contenu écrasé.`,
        );
      const alt: Record<string, string> = {
        'term-sheet':
          'Sommaire adapté du spécimen ALPHA/BETA : projet collaboratif, pilotage et propriété industrielle ; partenariat d’exploitation, rôles et exclusivité.',
        definitions:
          'Les informations comprennent les informations confidentielles, les résultats et les connaissances propres. Les résultats correspondent aux connaissances nouvelles, réparties entre résultats propres et résultats conjoints.',
      };
      const illustrations = deckPages.flatMap((page, index) =>
        'imageAsset' in page && typeof page.imageAsset === 'string'
          ? [
              {
                index,
                key: page.imageAsset,
                side: page.imagePosition,
                bytes: readFileSync(resolve(values['asset-dir']!, `${page.imageAsset}.png`)),
              },
            ]
          : [],
      );
      const saved =
        prior ??
        (await payload.create({
          collection: 'presentations',
          data,
          depth: 0,
          context: { skipBuildQueue: true },
        }));
      const expectedSlides = structuredClone(richSlides);
      for (const { index, key, side, bytes } of illustrations) {
        const previous = prior?.slides?.find(
          (s) => s.id === richSlides[index]?.id && s.blockType === 'twoCols',
        );
        const previousId =
          previous?.blockType === 'twoCols' && typeof previous.image === 'number'
            ? previous.image
            : undefined;
        const candidate = previousId
          ? await payload.findByID({ collection: 'media', id: previousId, depth: 0 })
          : null;
        const reusable =
          candidate?.presentation === saved.id &&
          candidate.filename &&
          readFileSync(resolve('media', candidate.filename)).equals(bytes) &&
          candidate.alt === alt[key];
        const media = reusable
          ? candidate
          : await payload.create({
              collection: 'media',
              data: { alt: alt[key], presentation: saved.id },
              file: {
                data: bytes,
                name: `partenariats-rd-${key}.png`,
                mimetype: 'image/png',
                size: bytes.length,
              },
            });
        if (!media.url || !media.filename) throw new Error(`Média incomplet : ${key}`);
        Object.assign(richSlides[index]!, { image: media.id, imagePosition: side });
        Object.assign(expectedSlides[index]!, {
          image: { url: media.url, filename: media.filename, alt: media.alt },
          imagePosition: side,
        });
      }
      if (prior) {
        const current = await payload.findByID({
          collection: 'presentations',
          id: prior.id,
          depth: 0,
        });
        if (current.updatedAt !== prior.updatedAt)
          throw new Error('Présentation modifiée pendant la préparation : remplacement annulé');
      }
      await payload.update({
        collection: 'presentations',
        id: saved.id,
        data: { slides: richSlides as Presentation['slides'] },
        context: { skipBuildQueue: true },
      });
      const expected = parseDocumentRenderPages(template, expectedSlides);
      const stored = await payload.findByID({
        collection: 'presentations',
        id: saved.id,
        depth: 1,
      });
      const storedPages = parseDocumentRenderPages(template, stored.slides);
      deepStrictEqual(storedPages.length, expected.length);
      for (const [index, page] of storedPages.entries()) {
        deepStrictEqual(comparable(page), comparable(expected[index]));
      }
      console.log(
        JSON.stringify({ id: saved.id, slug: saved.slug, slides: stored.slides?.length }),
      );
      if (values.build) {
        const { runBuildSlidesTask } = await import('../src/jobs/buildSlidesRunner');
        const result = await runBuildSlidesTask({
          input: { presentationId: String(saved.id) },
          req: { payload },
        });
        if (!result.output.success)
          throw new Error(`Échec du build : ${JSON.stringify(result.output)}`);
        const built = await payload.findByID({
          collection: 'presentations',
          id: saved.id,
          depth: 1,
        });
        console.log(
          JSON.stringify({ lastBuildStatus: built.lastBuildStatus, artifacts: built.artifacts }),
        );
      }
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await closeScriptPayload(payload);
  }
  process.exit(process.exitCode ?? 0);
}

function comparable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key, child]) =>
          key !== 'id' &&
          key !== 'blockName' &&
          child != null &&
          (!Array.isArray(child) || child.length > 0),
      )
      .map(([key, child]) => [key, comparable(child)]),
  );
}
