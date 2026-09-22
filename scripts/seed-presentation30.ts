/**
 * Editorial source of truth for the NERIVO webinar. Edit the slides here only.
 * pnpm exec tsx scripts/seed-presentation30.ts --check  (offline, no database)
 * pnpm prod run scripts/seed-presentation30.ts --allow-dirty --yes --build
 * The production runner requires --yes; this seed backs up and preflights before writing.
 */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { parseDocumentRenderPages, resolveDocumentTemplate } from '../src/documents/templates';
import type { Presentation } from '../src/payload-types';

type Page = { blockType: string; title: string; [key: string]: unknown };
type Pair = [string, string];
const TITLE =
  "Signes distinctifs et originaux : sécuriser l'identité et l'image de votre projet innovant";
const SLUG = 'signes-distinctifs-du-projet-innovant';
const notes = (...sources: string[]) => sources.map((text) => ({ text }));
const rt = (value: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: null,
    children: value
      .split('\n\n')
      .map((text) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: null,
        textFormat: 0,
        textStyle: '',
        children: [
          { type: 'text', version: 1, text, format: 0, style: '', mode: 'normal', detail: 0 },
        ],
      })),
  },
});
const grid = (
  title: string,
  description: string,
  items: Pair[],
  sources: string[] = [],
  numbered = false,
): Page => ({
  blockType: 'cardGrid',
  title,
  sidebarText: rt(description),
  columns: items.length === 2 ? '2' : '3',
  cards: items.map(([title, description], i) => ({
    title,
    description: rt(description),
    ...(numbered ? { number: String(i + 1).padStart(2, '0') } : {}),
  })),
  footnotes: notes(...sources),
});
const split = (
  title: string,
  lead: string,
  intro: string,
  items: Pair[],
  sources: string[] = [],
  footer = '',
): Page => ({
  blockType: 'twoCols',
  title,
  lead: rt(lead),
  intro: rt(intro),
  rightCards: items.map(([title, description]) => ({ title, description: rt(description) })),
  leftFooter: footer ? rt(footer) : null,
  footnotes: notes(...sources),
});
const table = (
  title: string,
  lead: string,
  headers: string[],
  rows: string[][],
  sources: string[] = [],
): Page => ({
  blockType: 'table',
  title,
  lead: rt(lead),
  tableVariant: 'reference',
  columns: headers.map((header) => ({ header })),
  rows: rows.map((cells) => ({ cells: cells.map((value) => ({ value: rt(value) })) })),
  footnotes: notes(...sources),
});
const statement = (title: string, body: string, footer: string, sources: string[] = []): Page => ({
  blockType: 'statement',
  title,
  variant: 'split',
  body: rt(body),
  footer: rt(footer),
  footnotes: notes(...sources),
});

// Stable editorial order. The mark explainer is a dedicated page between
// sign selection and filing representation; the deck contains 26 pages.
export const webinarSlides: Page[] = [
  {
    blockType: 'cover',
    title: TITLE,
    subtitle: rt(
      'Du lancement à la défense du produit : droits détenus, périmètre protégé et décisions du dirigeant.',
    ),
    pills: [
      { text: 'Signes distinctifs' },
      { text: 'France et Union européenne' },
      { text: 'Cas fictif' },
    ],
    intervenants: [{ user: 13, description: 'Juriste en propriété intellectuelle' }],
  },
  {
    ...split(
      'Le projet NERIVO',
      'Un lancement en France, puis une distribution en Allemagne.',
      'Un parfumeur compose la formule. Une agence dessine le logo et l’étui ; un designer conçoit le flacon.\n\nLa société finance le projet, mais chaque création et chaque signe appelle une analyse distincte.',
      [],
      [],
      'Le cas et les noms sont fictifs. Aucune disponibilité du signe NERIVO n’est affirmée.',
    ),
    image: {
      url: './media/nerivo-anatomie.webp',
      filename: 'nerivo-anatomie.webp',
      alt: 'Les actifs du parfum fictif NERIVO.',
    },
    imagePosition: 'right',
  },
  statement(
    'Nom de domaine, dépôt de marque et exploitation',
    'Le nom de domaine est déposé. La demande de marque est déposée. Le logo est payé.\n\nCes faits ne disent pas encore si NERIVO peut être utilisé : un droit antérieur peut faire obstacle à la marque, même enregistrée.[^1]',
    'Le dossier doit distinguer contrôle de l’adresse, protection du signe et autorisations sur les créations.',
    ['CPI, art. L. 711-3 : droits antérieurs opposables à une marque.'],
  ),
  {
    blockType: 'timeline',
    title: 'Validité, liberté d’exploitation et titularité',
    lead: rt('Trois examens successifs avant d’engager les dépenses de lancement.'),
    steps: [
      {
        label: 'Validité',
        description:
          'Le signe est-il distinctif pour les produits visés ? Un titre enregistré peut rester contestable.[^1]',
      },
      {
        label: 'Liberté d’exploitation',
        description:
          'Un droit antérieur peut-il bloquer le nom ou le graphisme malgré notre propre dépôt ?[^2]',
      },
      {
        label: 'Titularité et preuve',
        description:
          'Qui détient les droits, pour quels usages et territoires ? Le paiement ne suffit pas à établir leur transfert.[^3]',
      },
    ],
    footer: 'Un examen réussi ne dispense pas du suivant : les trois questions se cumulent.',
    footnotes: notes(
      'CPI, art. L. 711-2 : motifs absolus de refus ou de nullité.',
      'CPI, art. L. 711-3 : droits antérieurs.',
      'CPI, art. L. 111-1 : création et droits de l’auteur.',
    ),
  },
  table(
    'Actifs et protections : ne pas confondre les objets',
    'Chaque actif appelle son propre titre, sa propre preuve et ses propres limites.',
    ['Actif', 'Protection et condition', 'Ce que cela ne couvre pas'],
    [
      [
        'Nom / signe verbal',
        'Marque : distinctivité, disponibilité et libellé adaptés aux produits.',
        'Ni le logo, ni la formule, ni une liberté générale d’exploitation.[^1]',
      ],
      [
        'Logo / graphisme',
        'Droit d’auteur, dessin ou modèle et marque figurative selon l’objet ; établir la chaîne de titularité.',
        'Ni le nom seul, ni les éléments graphiques de tiers non cédés.',
      ],
      [
        'Flacon / étui',
        'Dessin ou modèle et droit d’auteur : nouveauté, apparence et originalité à démontrer séparément.',
        'Ni les caractéristiques exclusivement techniques, ni toute forme voisine.',
      ],
      [
        'Nom de domaine',
        'Réservation et exploitation de l’adresse ; titulaire, accès et usage à documenter.',
        'Ni un dépôt de marque, ni un monopole général sur le signe.',
      ],
      [
        'Formule / savoir-faire',
        'Confidentialité, contrats et mesures raisonnables de secret des affaires.[^2]',
        'Ni une protection opposable à une découverte indépendante, ni les signes de l’identité.',
      ],
    ],
    [
      'CPI, art. L. 711-2 et L. 711-3 : distinctivité et droits antérieurs.',
      'Code de commerce, art. L. 151-1 et s. : conditions du secret des affaires.',
    ],
  ),
  table(
    'Dénomination sociale, nom commercial, enseigne et domaine',
    'Un même mot peut remplir plusieurs fonctions ; chaque usage doit être identifié.',
    ['Identifiant', 'Fonction', 'Élément décisif'],
    [
      [
        'Dénomination sociale',
        'Identifie la société.',
        'Immatriculation ; activités effectivement exercées pour apprécier la protection.[^1]',
      ],
      [
        'Nom commercial',
        'Identifie l’activité auprès des clients.',
        'Premier usage public ; clientèle et portée de l’exploitation.',
      ],
      [
        'Enseigne',
        'Identifie un établissement.',
        'Usage sur le lieu et rayonnement de l’établissement.',
      ],
      [
        'Nom de domaine',
        'Identifie une adresse en ligne.',
        'Réservation distincte de l’usage ; exploitation et portée à documenter.',
      ],
    ],
    ['Cass. com., 10 juillet 2012, n° 08-12.010 : activités effectivement exercées.'],
  ),
  grid(
    'Choix du nom et distinctivité',
    'La force juridique du signe dépend de ce qu’il désigne pour le public concerné.',
    [
      [
        '« Parfum longue tenue »',
        'Des mots descriptifs des qualités du produit. Un décor banal ne suffit pas nécessairement à rendre l’ensemble distinctif.[^1]',
      ],
      [
        '« NERIVO »',
        'Dans le cas, un nom de fantaisie. Il reste à rechercher les antériorités : inventer un mot ne prouve pas sa disponibilité.[^2]',
      ],
      [
        '« NERIVO BIO »',
        'Une allégation produit en plus du nom : elle doit être justifiée, pas seulement séduisante.[^3]',
      ],
    ],
    [
      'EUIPO, pratique commune CP3 : marques figuratives contenant des termes descriptifs.',
      'CPI, art. L. 711-3 : droits antérieurs.',
      'Règlement (UE) n° 655/2013 : critères applicables aux allégations cosmétiques.',
    ],
  ),
  grid(
    'La marque : acquisition, droit exclusif et limites',
    'Un droit d’interdire certains usages ; pas une autorisation générale d’exploiter.',
    [
      [
        'Naissance du droit',
        'En France, la propriété s’acquiert par l’enregistrement, avec effet à la date du dépôt.[^1]',
      ],
      [
        'Droit d’interdire',
        'La protection vise notamment les usages identiques ou similaires susceptibles de créer une confusion.[^2]',
      ],
      [
        'Limites du titre',
        'Signe, produits ou services et territoire délimitent le droit. Nos propres antériorités restent à vérifier.[^3]',
      ],
    ],
    [
      'CPI, art. L. 712-1 : acquisition du droit par l’enregistrement.',
      'CPI, art. L. 713-2 : usages interdits.',
      'CPI, art. L. 711-3 : droits antérieurs.',
    ],
    true,
  ),
  {
    ...split(
      'Marque verbale, figurative et semi-figurative',
      'Trois représentations, trois périmètres de protection.',
      '',
      [
        [
          'Marque verbale',
          'Le nom NERIVO est protégé comme signe, indépendamment de sa typographie, de sa couleur ou de son graphisme.',
        ],
        [
          'Marque figurative',
          'Le logo ou l’emblème est protégé comme composition graphique ; la titularité et la version déposée doivent être établies.',
        ],
        [
          'Marque semi-figurative',
          'Le nom et le graphisme sont déposés ensemble. La protection porte sur leur combinaison, sans isoler automatiquement chaque élément.[^1]',
        ],
      ],
      [
        'EUIPO, pratique commune CP3 : éléments verbaux descriptifs et distinctivité de l’ensemble.',
      ],
    ),
    image: {
      url: './media/nerivo-depots.webp',
      filename: 'nerivo-depots.webp',
      alt: 'Marque verbale, symbole et signe combiné NERIVO.',
    },
    imagePosition: 'left',
  },
  split(
    'Classification de Nice, HDB et libellé',
    'La procédure facilite le dépôt ; le conseil détermine le périmètre commercial.',
    'Nice classe les produits et services ; une classe commune ne prouve pas leur similarité.[^1]\n\nLa HDB, consultable via TMclass, propose des termes préacceptés par les offices participants et leurs traductions : moins d’objections de classification, pas une garantie de validité.',
    [
      [
        'Court terme',
        'Couvrir les parfums commercialisés et les services réellement proposés, avec des termes précis.',
      ],
      [
        'Long terme',
        'Anticiper les extensions crédibles ; après l’enregistrement, cinq ans sans usage sérieux exposent à une déchéance, parfois partielle.[^2]',
      ],
      [
        'Canaux communs',
        'Revendiquer aussi les produits et services qu’un tiers pourrait exploiter dans les mêmes circuits : cosmétiques, coffrets, vente au détail. Le libellé ferme la porte au parasitisme avant qu’il ne naisse.',
      ],
    ],
    [
      'Règlement (UE) 2017/1001, art. 33 § 7 : classification et similarité.',
      'CPI, art. L. 714-5 : déchéance pour absence d’usage sérieux.',
      'CPI, art. L. 716-4 ; C. civ., art. 1240 : fondements distincts de la contrefaçon et de la concurrence déloyale.',
    ],
    'Contrefaçon : l’atteinte au droit exclusif suffit, sans preuve d’un préjudice. Concurrence déloyale ou parasitisme : faute, préjudice et lien de causalité restent à établir.[^3]',
  ),
  table(
    'Recherche d’antériorités',
    'Le résultat utile est un risque qualifié, pas une liste de ressemblances.',
    ['Antériorité', 'Vérification', 'Preuve utile'],
    [
      [
        'Marque',
        'Signe, libellé, territoire, statut et usage pertinent.',
        'Titre et, selon le dossier, preuves d’exploitation.',
      ],
      [
        'Dénomination sociale',
        'Activités réellement exercées et confusion.',
        'Registre, offres et documents d’activité.[^1]',
      ],
      [
        'Nom commercial, enseigne, domaine',
        'Pour faire obstacle à une marque : portée non seulement locale et confusion.',
        'Usage antérieur, clientèle et portée.[^2]',
      ],
      [
        'Graphisme',
        'Droit d’auteur ou modèle : critères propres.',
        'Création ou titre, date et chaîne des droits.',
      ],
    ],
    [
      'Cass. com., 10 juillet 2012, n° 08-12.010.',
      'CPI, art. L. 711-3, I, 4° : signes dont la portée n’est pas seulement locale.',
    ],
  ),
  split(
    'Comparaison des signes : NERIVA et NERIVO',
    'Antériorité fictive : NERIVA est enregistrée pour des cosmétiques en France.',
    'Le dirigeant propose de changer seulement la couleur du logo. La comparaison porte sur l’impression d’ensemble, pas sur une différence isolée.[^1]',
    [
      [
        'Phonétique',
        'Comparer sonorités et rythme : NERIVO et NERIVA partagent une séquence sonore importante.',
      ],
      [
        'Sémantique ou conceptuelle',
        'Ces noms inventés n’ont ici aucun sens établi. Ne pas inventer une différence de sens pour conclure à leur coexistence.',
      ],
      [
        'Orthographique ou visuelle',
        'Comparer les lettres, la structure et le graphisme, en tenant compte des éléments distinctifs et dominants.',
      ],
    ],
    [
      'CJUE, 11 novembre 1997, C-251/95, SABEL : appréciation globale des signes.',
      'CJUE, 29 septembre 1998, C-39/97, Canon : interdépendance des facteurs.',
    ],
    'La proximité des signes s’apprécie avec celle des produits ou services et le public pertinent.[^2]',
  ),
  grid(
    'Options face à une antériorité',
    'Dans le cas, NERIVO doit décider avant de commander ses emballages.',
    [
      [
        'Changer le signe',
        'Si le risque compromet le lancement, réexaminer un nouveau candidat avant d’engager les dépenses.',
      ],
      [
        'Adapter le périmètre',
        'Limiter produits ou territoires uniquement si cela répond au conflit réel et reste commercialement viable.',
      ],
      [
        'Négocier la coexistence',
        'Hypothèse retenue pour la suite : un accord autorise NERIVO pour les parfums en France et en Allemagne. Il ne lie pas les autres titulaires.',
      ],
    ],
  ),
  grid(
    'Nom de domaine : contrôle, antériorité et recours',
    'Le domaine de NERIVO est déposé ; son titulaire et son usage doivent être vérifiés.',
    [
      [
        'Contrôle de l’adresse',
        'La société doit maîtriser le compte, le renouvellement et les accès, même si une agence gère le site.',
      ],
      [
        'Antériorité opposable',
        'Une réservation inactive ne suffit pas. Pour l’opposer à une marque, vérifier exploitation, portée non locale et confusion.[^1]',
      ],
      [
        'Récupération du domaine',
        'L’UDRP peut conduire au transfert ou à la suppression, sans dommages-intérêts.[^2] Pour un .fr, examiner notamment SYRELI.[^3]',
      ],
    ],
    [
      'CPI, art. L. 711-3, I, 4°.',
      'ICANN, UDRP, § 4(i) : remèdes disponibles.',
      'AFNIC, règlement SYRELI : procédure de résolution des litiges.',
    ],
  ),
  statement(
    'Commande du logo et droits d’exploitation',
    'L’agence a livré les fichiers du logo et de l’étui. La facture mentionne « création de l’identité visuelle ».\n\nLe paiement ne transfère pas, à lui seul, les droits d’auteur.[^1] Les droits cédés et leur domaine d’exploitation doivent être délimités.[^2]',
    'Avant de garantir une exclusivité au distributeur : identifier les droits réellement reçus.',
    [
      'CPI, art. L. 111-1 : le contrat de service ne déroge pas aux droits de l’auteur.',
      'CPI, art. L. 131-3 : délimitation des droits cédés.',
    ],
  ),
  table(
    'Chaîne de titularité et périmètre de la cession',
    'Le contrat doit suivre les usages envisagés, pas seulement la livraison des fichiers.',
    ['Vérification', 'Application au projet'],
    [
      ['Auteurs et sous-traitants', 'Retracer les droits transmis à l’agence, puis à NERIVO.'],
      [
        'Droits et usages',
        'Reproduction, représentation, adaptations autorisées, supports et destination.[^1]',
      ],
      [
        'Territoire et durée',
        'Vérifier la campagne allemande, l’exclusivité et la possibilité de concéder des droits.',
      ],
      ['Droits résiduels', 'Respecter les licences de tiers et le droit moral, inaliénable.[^2]'],
    ],
    ['CPI, art. L. 131-3 : contenu de la cession.', 'CPI, art. L. 121-1 : droit moral.'],
  ),
  split(
    'Divulgation du flacon avant dépôt',
    'Le fondateur publie des photos avant de demander la protection du modèle.',
    'Identifier ce qui a été révélé, à quelle date et à quel public. Une présentation sous confidentialité et une publication accessible au public ne s’analysent pas de la même manière.',
    [
      [
        'Nouveauté',
        'Une divulgation antérieure peut être opposable ; comparer le modèle divulgué à celui déposé.[^1]',
      ],
      [
        'Délai de grâce',
        'Certaines divulgations issues du créateur bénéficient de douze mois en France. Ce n’est ni une priorité ni une garantie mondiale.[^2]',
      ],
    ],
    ['CPI, art. L. 511-3 : nouveauté.', 'CPI, art. L. 511-6 : divulgations et délai de grâce.'],
    'Décision : déposer avant la publication lorsque c’est possible ; qualifier les faits si elle a déjà eu lieu.',
  ),
  table(
    'Protections de l’apparence du flacon',
    'Le cumul exige de satisfaire séparément chaque régime.',
    ['Régime', 'Démonstration', 'Limite'],
    [
      [
        'Dessin ou modèle',
        'Nouveauté et caractère propre.[^1]',
        'Les seules caractéristiques exclusivement techniques sont exclues.[^2]',
      ],
      [
        'Droit d’auteur',
        'Choix créatifs libres et personnels.',
        'Le coût et la nouveauté ne suffisent pas à établir l’originalité.[^3]',
      ],
      [
        'Marque de forme',
        'Perception comme signe d’origine commerciale.',
        'Une forme attractive n’est pas nécessairement distinctive.',
      ],
    ],
    [
      'CPI, art. L. 511-2 : conditions de protection.',
      'CPI, art. L. 511-8 : exclusions techniques.',
      'CJUE, 12 septembre 2019, C-683/17, Cofemel : originalité.',
    ],
  ),
  {
    blockType: 'timeline',
    title: 'Priorité et calendrier des dépôts',
    lead: rt(
      'La priorité de marque se revendique dans les six mois du premier dépôt régulier.[^1]',
    ),
    steps: [
      {
        label: 'Avant le dépôt',
        description: 'Rechercher les antériorités et définir produits, titulaire et marchés.',
      },
      { label: 'Premier dépôt', description: 'Fixer le point de départ du délai de priorité.' },
      {
        label: 'Dans les six mois',
        description:
          'Déposer dans les territoires retenus et revendiquer la priorité sous ses conditions.',
      },
      {
        label: 'Après six mois',
        description:
          'Déposer reste possible, mais sans ce bénéfice : vérifier les droits intermédiaires.',
      },
    ],
    footer:
      'La priorité n’est ni une obligation d’extension ni une validation de la disponibilité à l’étranger.',
    footnotes: notes('Convention de Paris, art. 4 C.1 : délai de priorité des marques.'),
  },
  table(
    'Choix de la procédure de dépôt',
    'France et Allemagne : comparer portée, obstacles et coût de gestion.',
    ['Procédure', 'Intérêt', 'Point de vigilance'],
    [
      ['Dépôts nationaux', 'Cibler les pays nécessaires.', 'Examens et gestion distincts.'],
      [
        'Marque de l’Union européenne',
        'Un titre unitaire couvrant l’UE.[^1]',
        'Un obstacle dans une partie de l’UE peut affecter l’ensemble.',
      ],
      [
        'Système de Madrid',
        'Centraliser les territoires désignés.[^2]',
        'Pas de marque mondiale ; dépendance à la base pendant cinq ans.[^3]',
      ],
    ],
    [
      'Règlement (UE) 2017/1001, art. 1 § 2 : caractère unitaire.',
      'Protocole de Madrid, art. 4 : effets de l’enregistrement international.',
      'Protocole de Madrid, art. 6 : dépendance à la marque de base.',
    ],
  ),
  table(
    'Exploitation active : déchéance et forclusion',
    'Exploiter sa marque, surveiller les tiers et agir : le renouvellement ne suffit pas.',
    ['Mécanisme', 'Déclencheur', 'Conséquence'],
    [
      [
        'Déchéance pour défaut d’exploitation',
        'Cinq années ininterrompues sans usage sérieux, sans juste motif.[^1]',
        'Perte totale ou partielle des droits pour les produits ou services concernés.',
      ],
      [
        'Forclusion pour tolérance',
        'Usage connu d’une marque postérieure enregistrée, toléré cinq années consécutives.',
        'Certains recours deviennent irrecevables pour le périmètre toléré ; exception de mauvaise foi.[^2][^3]',
      ],
    ],
    [
      'CPI, art. L. 714-5 : usage sérieux et déchéance.',
      'CPI, art. L. 716-2-8 : irrecevabilité de la demande en nullité.',
      'CPI, art. L. 716-4-5 : irrecevabilité de l’action en contrefaçon.',
    ],
  ),
  table(
    'Preuves d’usage et évolution du logo',
    'Après le lancement, archiver l’exploitation par produit, période et territoire.',
    ['À établir', 'Pièces à rapprocher'],
    [
      [
        'Signe effectivement utilisé',
        'Emballages, catalogues et versions du logo ; une modification peut compter si le caractère distinctif n’est pas altéré.[^1]',
      ],
      [
        'Produits et réalité commerciale',
        'Factures, références produit, quantités et distribution ; un usage symbolique ne suffit pas.',
      ],
      [
        'Dates et territoires',
        'Pages de vente datées, commandes et livraisons ; un site accessible partout ne prouve pas des ventes partout.[^2]',
      ],
    ],
    [
      'CPI, art. L. 714-5 : usage sous une forme modifiée.',
      'Règlement délégué (UE) 2018/625, art. 10 § 3 : lieu, durée, importance et nature de l’usage.',
    ],
  ),
  grid(
    'Qualification des atteintes',
    'Un produit proche ne suffit pas à prouver une contrefaçon : identifier l’objet repris.',
    [
      [
        'Nom voisin',
        'Comparer les signes, les produits ou services et le public ; apprécier le risque de confusion.[^1]',
      ],
      [
        'Flacon proche',
        'Comparer l’impression visuelle d’ensemble sous le régime des dessins et modèles.[^2]',
      ],
      [
        'Graphisme repris',
        'Établir l’originalité, la titularité et la reprise d’éléments protégés. Un style voisin ne suffit pas.[^3]',
      ],
    ],
    [
      'CPI, art. L. 713-2 : atteintes à la marque.',
      'CPI, art. L. 513-5 : étendue de la protection du modèle.',
      'CPI, art. L. 122-4 : reproduction ou représentation non autorisée.',
    ],
  ),
  table(
    'Dossier NERIVO : campagne allemande',
    'Retour au lancement : l’accord sur le nom ne règle pas les droits sur le logo.',
    ['Pièce du cas fictif', 'Portée constatée'],
    [
      [
        'Accord avec le titulaire de NERIVA',
        'Usage du nom autorisé pour les parfums en France et en Allemagne.',
      ],
      [
        'Cession de l’agence',
        'Logo initial supposé original ; France uniquement ; adaptation non autorisée.',
      ],
      ['Demande du distributeur', 'Adapter le logo pour une campagne en Allemagne.'],
    ],
  ),
  {
    blockType: 'statement',
    title: 'Décision finale et conditions d’autorisation',
    body: rt(
      'Non en l’état : l’accord sur le nom ne règle ni les droits sur le logo ni l’adaptation destinée à l’Allemagne.',
    ),
    footer: rt(
      'Avant la campagne : sécuriser la cession ou l’autorisation d’adaptation, vérifier le périmètre territorial et documenter l’accord avec les titulaires concernés.',
    ),
    footnotes: [],
  },
  {
    blockType: 'cta',
    title: 'Merci',
    subtitle: rt(
      'Nous vous offrons un premier échange de 30 minutes pour faire le point sur vos besoins.',
    ),
    primaryAction: 'Prendre rendez-vous',
    primaryActionUrl: '{org.bookingUrl}',
    footerNote: rt(
      'Toulouse · 15 rue d’Alsace-Lorraine, 31000 · +33 (0)5 61 38 53 52 · toulouse@klarc.com\n\nLyon · 3 rue de Genève, 69006 · +33 (0)5 25 63 09 36 · lyon@klarc.com',
    ),
  },
];

function validateSeed(): void {
  if (webinarSlides.length !== 26)
    throw new Error(`Expected 26 pages, got ${webinarSlides.length}`);
  parseDocumentRenderPages(resolveDocumentTemplate('presentation'), webinarSlides);
  for (const [index, slide] of webinarSlides.entries()) {
    const { footnotes, ...content } = slide;
    const entries = (footnotes ?? []) as Array<{ text: string }>;
    const used = new Set(
      [...JSON.stringify(content).matchAll(/\[\^(\d+)\]/g)].map((m) => Number(m[1])),
    );
    for (const n of used)
      if (n < 1 || n > entries.length) throw new Error(`Page ${index + 1}: dangling note ${n}`);
    entries.forEach((entry, i) => {
      if (!used.has(i + 1) || !entry.text.trim())
        throw new Error(`Page ${index + 1}: unused/empty note ${i + 1}`);
      if (/\[\^\d+\]/.test(entry.text))
        throw new Error(`Page ${index + 1}: reference prefix in note text`);
    });
  }
  if (
    /\bvotez?\b|\bvoter\b|scrutin|olfact|fragrance|\bodeur\b|brevet/i.test(
      JSON.stringify(webinarSlides),
    )
  )
    throw new Error('Excluded topic remains');
  if ((webinarSlides[1]!.rightCards as unknown[]).length)
    throw new Error('Case illustration must have prose only');
  const titles = webinarSlides.map((s) => s.title);
  if (new Set(titles).size !== titles.length) throw new Error('Duplicate slide');
}
validateSeed();

// Payload generates storage IDs/defaults; compare only the authored projection.
function matches(expected: unknown, actual: unknown): boolean {
  if (expected === null) return actual === null || actual === undefined;
  if (typeof expected !== 'object') return expected === actual;
  if (Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((v, i) => matches(v, actual[i]))
    );
  if (!actual || typeof actual !== 'object') return false;
  return Object.entries(expected).every(([k, v]) =>
    matches(v, (actual as Record<string, unknown>)[k]),
  );
}

if (process.argv.includes('--check')) {
  console.log(
    JSON.stringify({
      validated: true,
      title: TITLE,
      count: webinarSlides.length,
      notes: 'all repeater entries referenced',
    }),
  );
} else {
  // Keep the CLI alive during framework initialization: an empty event loop
  // must never look like a successful seed without a readback receipt.
  const keepAlive = setInterval(() => {}, 10_000);
  try {
    const { runPayloadScript } = await import('./lib/payloadScript');
    const { preflightPresentationLayout, runBuildSlidesTask } = await import(
      '../src/jobs/buildSlidesRunner'
    );
    await runPayloadScript(async (payload) => {
      const current = await payload.findByID({
        collection: 'presentations',
        id: 30,
        depth: 0,
        overrideAccess: true,
      });
      if (current.slug !== SLUG || current.title !== TITLE)
        throw new Error('Target identity mismatch');
      const authored = structuredClone(webinarSlides);
      const hydrated = structuredClone(webinarSlides);
      for (let i = 0; i < authored.length; i++) {
        const image = authored[i]!.image as { filename?: string } | undefined;
        if (!image?.filename) continue;
        const found = await payload.find({
          collection: 'media',
          where: { filename: { equals: image.filename } },
          limit: 2,
          depth: 0,
          overrideAccess: true,
        });
        if (found.docs.length !== 1) throw new Error(`Missing/ambiguous media: ${image.filename}`);
        authored[i]!.image = found.docs[0]!.id;
        hydrated[i]!.image = found.docs[0]!;
      }
      const fingerprint = createHash('sha256').update(JSON.stringify(authored)).digest('hex');
      if (process.argv.includes('--dry-run')) {
        console.log(
          JSON.stringify({ dryRun: true, target: current.id, count: authored.length, fingerprint }),
        );
        return;
      }
      await preflightPresentationLayout(payload, { ...current, slides: hydrated } as never);
      const fresh = await payload.findByID({
        collection: 'presentations',
        id: current.id,
        depth: 0,
        overrideAccess: true,
      });
      if (fresh.updatedAt !== current.updatedAt)
        throw new Error('Concurrent presentation edit; refusing write');
      await writeFile(
        `/tmp/presentation30-before-${fingerprint.slice(0, 12)}.json`,
        JSON.stringify(fresh),
      );
      if (!matches(authored, fresh.slides)) {
        await payload.update({
          collection: 'presentations',
          id: current.id,
          data: { slides: authored as unknown as Presentation['slides'] },
          overrideAccess: true,
          context: { skipBuildQueue: true },
        });
      }
      const saved = await payload.findByID({
        collection: 'presentations',
        id: current.id,
        depth: 0,
        overrideAccess: true,
      });
      if (saved.title !== TITLE || saved.slides?.length !== 26)
        throw new Error('Seed identity readback mismatch');
      const savedCover = saved.slides?.[0] as Record<string, unknown> | undefined;
      const savedFinal = saved.slides?.[25] as Record<string, unknown> | undefined;
      if (
        JSON.stringify(savedCover?.pills).includes('Parfum') ||
        JSON.stringify(savedFinal?.title) !== JSON.stringify('Merci')
      ) {
        throw new Error('Seed editorial readback mismatch');
      }
      if (process.argv.includes('--build')) {
        const result = await runBuildSlidesTask({
          input: { presentationId: current.id },
          req: { payload },
        });
        if (!result.output.success) throw new Error('Native export failed');
      }
      const built = await payload.findByID({
        collection: 'presentations',
        id: current.id,
        depth: 1,
        overrideAccess: true,
      });
      console.log(
        JSON.stringify({
          applied: true,
          fingerprint,
          title: built.title,
          count: built.slides?.length,
          status: built.lastBuildStatus,
          artifacts: built.artifacts,
        }),
      );
    });
  } finally {
    clearInterval(keepAlive);
  }
}
