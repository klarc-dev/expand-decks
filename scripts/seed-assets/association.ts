const jei =
  '[CGI, art. 44 sexies-0 A, 4°](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053543750)';
const pret =
  '[Bpifrance · Prêt Innovation R&D classique](https://www.bpifrance.fr/catalogue-offres/pret-innovation-rd-classique-0)';
const bourse =
  '[Bpifrance · Bourse French Tech Émergence](https://www.bpifrance.fr/catalogue-offres/bourse-french-tech-emergence)';
const taille =
  '[Recommandation 2003/361/CE, annexe, art. 3 et 6](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32003H0361)';
export const TITLE = 'S’associer dans un projet innovant';
type Page = { blockType: string; title: string; [key: string]: unknown };
function cards(
  eyebrow: string,
  title: string,
  rows: [string, string][],
  sources: string[] = [],
  sidebarText?: string,
): Page {
  return {
    blockType: 'cardGrid',
    eyebrow,
    title,
    ...(sidebarText ? { sidebarText } : {}),
    columns: String(rows.length),
    cards: rows.map(([title, description]) => ({ title, description })),
    ...(sources.length ? { footnotes: sources.map((text) => ({ text })) } : {}),
  };
}
function scene(number: string, title: string, subtitle: string): Page {
  return { blockType: 'section', number, title, subtitle };
}
function table(
  eyebrow: string,
  title: string,
  lead: string,
  headers: string[],
  rows: string[][],
  sources: string[],
): Page {
  return {
    blockType: 'table',
    eyebrow,
    title,
    lead,
    columns: headers.map((header) => ({ header })),
    rows: rows.map((cells) => ({ cells: cells.map((value) => ({ value })) })),
    footnotes: sources.map((text) => ({ text })),
  };
}
export const pages: Page[] = [
  // Ouverture orale : Lina finance le lancement, Noé a créé le prototype.
  // « Faut-il du 50/50 pour que chacun ait son mot à dire sur la vente du logiciel ?
  // Exigeriez-vous aussi l’accord de Noé pour un achat courant ? »
  {
    blockType: 'cover',
    title: TITLE,
    pills: [
      { text: 'Cycle Klarc · 11/11' },
      { text: '1er décembre 2026' },
      { text: '11 h à 12 h · Paris' },
    ],
    subtitle:
      'Répartir le capital, organiser les décisions, anticiper la sortie.\n\nJoachim Brindeau, avocat\n\nBenjamin Visser, avocat fiscaliste',
  },
  cards(
    'SAS · Pouvoirs et cessions',
    'Lina gère le courant, les deux associés autorisent la vente du logiciel',
    [
      [
        'Statuts · La SAS vend le logiciel',
        'Lina, présidente, signe les achats courants. Chacun peut refuser l’autorisation interne de vendre le logiciel. Si Lina signe seule, la SAS ne peut pas opposer ce veto à l’acheteur.',
      ],
      [
        'Statuts · Un associé vend ses actions',
        'La clause d’agrément soumet la cession à autorisation. Une cession faite en violation de cette clause statutaire est nulle.',
      ],
      [
        'Pacte · Les associés sont en désaccord',
        'Les signataires s’engagent à se réunir à nouveau, puis à tenter une médiation. Violer le pacte n’annule pas automatiquement un vote.',
      ],
    ],
    [
      'C. com., art. L. 227-5, L. 227-6, L. 227-9, L. 227-14 et L. 227-15 · C. civ., art. 1199 et 1217',
    ],
  ),
  cards(
    'Les apports',
    'Capital et trésorerie ne se confondent pas',
    [
      [
        'Numéraire · Argent',
        'Le montant souscrit entre au capital. Seule la somme versée alimente la trésorerie. Une avance en compte courant est un prêt, pas un apport au capital.',
      ],
      [
        'Nature · Bien ou droit',
        'Le bien ou le droit entre au capital à la valeur retenue, sans apport d’argent. Vérifier les droits, leur valeur et si un commissaire aux apports est requis.',
      ],
      [
        'Industrie · Travail promis',
        'En SAS, cet apport peut donner des actions inaliénables, mais n’entre pas au capital. Les statuts fixent les droits attachés à l’apport.',
      ],
    ],
    ['C. civ., art. 1843-2 et 1843-3 · C. com., art. L. 227-1'],
  ),
  // Faire calculer capital et trésorerie avant d’afficher le tableau. Le travail futur fait l’objet d’un accord distinct.
  table(
    'Les apports à la création',
    'Capital et trésorerie de départ',
    'Hypothèse : 100 actions de 500 €, sans prime. Pour Noé, vérifier les droits à céder, les usages commerciaux autorisés et la valeur de l’apport.',
    ['Apport au capital', 'Valeur', 'Argent versé', 'Actions'],
    [
      ['Lina : argent', '30 000 €', '30 000 €', '60'],
      ['Noé : droits sur son code', '20 000 € estimés', '0 €', '40, sous réserve'],
      ['**Total si l’apport est confirmé**', '**50 000 €**', '**30 000 €**', '**100**'],
    ],
    ['C. civ., art. 1843-2 · C. com., art. L. 227-1'],
  ),
  // À l’oral si utile : le dépôt Git ou le seul mandat de dirigeant ne transfère rien.
  // Brevet : écrit pour la cession, registre pour l’opposabilité (CPI, art. L. 613-8 et L. 613-9).
  // Savoir-faire : décrire le contenu et documenter la confidentialité (C. com., art. L. 151-1).
  cards(
    'Le prototype de Noé',
    'Les pièces à vérifier avant l’apport du code',
    [
      [
        'Inventaire du code et des droits',
        'Identifier la version, les contributeurs et les composants tiers. Vérifier les actes et licences qui établissent qui détient quels droits.',
      ],
      [
        'Acte d’apport à la SAS',
        'Annexer la version du code. Préciser chaque droit d’exploitation transmis, sa destination, son territoire et sa durée.',
      ],
    ],
    ['CPI, art. L. 131-3'],
  ),
  cards(
    'Le moteur du laboratoire',
    'De la recherche interne à la distribution du logiciel',
    [
      [
        'Usage autorisé',
        'Le moteur reste au laboratoire. La licence signée couvre seulement la recherche interne.',
      ],
      [
        'Usage demandé par le client',
        'Le client veut un logiciel livré avec le moteur embarqué. La licence actuelle ne permet pas à la SAS de le distribuer.',
      ],
    ],
    [],
    'Avant l’apport, obtenir les droits de distribution nécessaires et justifier la valeur du code de Noé. Sans ces droits, revoir le produit et réévaluer l’apport sans les ventes non autorisées.',
  ),
  scene(
    '01',
    'L’entrée de l’industriel au capital',
    'Supposons les droits de distribution obtenus et l’apport de Noé confirmé à 20 000 € : la SAS est créée à 60/40.\n\nUn industriel veut souscrire 100 actions nouvelles. Il versera les fonds à la SAS.\n\nQue faut-il vérifier pour le statut JEI et les aides ?',
  ),
  cards(
    'Jeune entreprise innovante (JEI)',
    'Les détenteurs admis dans le calcul des 50 %',
    [
      ['En direct', 'Les actions de Lina et Noé, personnes physiques, entrent dans le calcul.'],
      [
        'Via une société',
        'Une holding ne compte pas automatiquement. Au titre du 4° b, elle doit remplir les mêmes conditions que la JEI et être détenue à 50 % au moins par des personnes physiques.',
      ],
    ],
    [jei],
    '**Au moins 50 % du capital doit rester détenu en continu par des détenteurs admis.** Ce seul test ne suffit pas à établir le statut JEI.',
  ),
  // Poser la question avant de projeter la réponse : « Quelle part reste aux fondateurs avec 100 actions nouvelles ? Et avec 101 ? »
  table(
    'Simulation · Seul le critère de détention JEI est testé',
    'Le capital après la souscription',
    'Lina et Noé gardent leurs 100 actions. L’industriel souscrit seul et ne relève d’aucune catégorie admise. Toutes les actions ont la même valeur nominale.',
    ['Détenteur', 'Avant', '+100 actions', '+101 actions'],
    [
      ['Lina et Noé (admis)', '60 + 40', '100', '100'],
      ['Industriel (non admis ici)', '0', '100', '101'],
      [
        '**Part du capital détenue par des détenteurs admis**',
        '**100 %**',
        '**100/200 = 50 % : seuil atteint**',
        '**100/201 ≈ 49,75 % : seuil non atteint**',
      ],
    ],
    [jei],
  ),
  cards(
    'Bpifrance',
    'Deux financements, deux jeux de critères',
    [
      [
        'Bourse French Tech Émergence',
        '**Public :** petite entreprise immatriculée en France depuis moins d’un an, avec un projet qualifié deeptech.\n\n**À vérifier :** la SAS reste-t-elle petite après la levée ?',
      ],
      [
        'Prêt Innovation R&D classique',
        '**Public :** PME ou ETI (ETI : 2 000 ETP max.), immatriculées en France.\n\n**Plafond :** 3 M€ au plus et deux fois les fonds propres et quasi-fonds propres retenus.\n\n**Hypothèse :** 80 000 € retenus → 160 000 € maximum, sans garantie d’octroi.',
      ],
    ],
    [bourse, pret],
    'Dans les deux cas, les dépenses engagées avant le dépôt sont exclues.',
  ),
  cards(
    'Financement · La même émission de 100 actions',
    'Les pièces à demander avant de répondre à l’offre',
    [
      [
        'Statuts, pacte et données du groupe',
        'Vérifier les voix et les droits de contrôle, puis recalculer la taille de la SAS pour la bourse.',
      ],
      [
        'Comptes et plan de financement',
        'Estimer le plafond du prêt avec les pertes et apports récents. Chiffrer séparément le besoin de trésorerie.',
      ],
      [
        'Licence commerciale signée',
        'Vérifier que la SAS pourra toujours distribuer son logiciel avec le moteur après l’entrée de l’industriel.',
      ],
    ],
    [taille],
    '**Détention JEI :** avec 50 % du capital, les fondateurs atteignent le seuil à l’issue de l’émission.\n\n**Taille de la SAS :** intégrer 50 % des données de l’industriel s’il est partenaire avec 50 % du capital et des voix, ou 100 % s’il est lié à la SAS.',
  ),
  scene(
    '02',
    'Deux cas distincts : partir ou vendre ses actions',
    '**Retour à la SAS avant la levée : Lina a 60 actions, Noé en a 40.**\n\nCas 1 : Noé cesse de travailler. Qui peut lui acheter des actions ?\n\nCas 2, indépendant : Lina reçoit une offre. Noé peut-il vendre aussi ?',
  ),
  cards(
    'Départ individuel',
    'Noé part : il détient toujours ses 40 actions',
    [
      [
        '20 actions rachetables',
        'La promesse couvre 40 actions à la création. Chaque année entière, 10 en sortent. Après deux ans, il en reste 20 sous option.',
      ],
      [
        'Un prix prévu au pacte',
        'Dans l’exemple : valeur de marché en cas d’incapacité durable, décote convenue en cas de manquement grave établi.',
      ],
      [
        '30 jours pour Lina',
        'Lina peut exercer l’option dans les 30 jours suivant la notification. Si elle ne l’exerce pas à temps, Noé garde ses 40 actions.',
      ],
    ],
    ['Exemple contractuel, pas un barème légal · C. civ., art. 1124'],
  ),
  table(
    'Vente à un tiers',
    'Le tiers veut les 60 actions de Lina',
    'Que peut faire Noé, qui détient toujours 40 actions ? Testons chaque clause séparément.',
    ['Clause testée', 'Résultat sur cette offre'],
    [
      [
        '**Préemption**\n\nAcheter en priorité',
        'Noé peut acheter les 60 actions aux conditions notifiées, dans le délai prévu.',
      ],
      [
        '**Sortie conjointe intégrale**\n\nVendre avec Lina',
        'Si Noé veut vendre ses 40 actions et que le tiers refuse les 100 au même prix par action, le pacte interdit à Lina de vendre seule.',
      ],
      [
        '**Sortie forcée**\n\nObliger les autres à vendre',
        'Impossible ici. Il faut l’accord d’associés détenant au moins 75 % du capital et une offre pour les 100 actions. Lina a 60 % et l’offre ne vise que ses 60 actions.',
      ],
    ],
    ['Exemples de clauses négociées · C. civ., art. 1103, 1123 et 1124'],
  ),
  // Laisser la page affichée : « Quelle vérification vous manque ? Quel document demanderiez-vous demain ? »
  cards('Synthèse · Questions', 'Les vérifications à faire avant de signer', [
    [
      'Décisions et droits sur le logiciel',
      'Écrire qui décide de vendre le logiciel ou d’admettre un associé, et quoi faire en cas de blocage. Joindre les cessions ou licences signées.',
    ],
    [
      'Capital et financement',
      'Dater la table de capitalisation avant et après l’opération. Tester la détention JEI. Vérifier l’aide visée avec sa fiche, les comptes et l’organigramme.',
    ],
    [
      'Deux sorties à simuler',
      'Tester un départ, puis une offre de rachat. Dans chaque scénario : qui peut acheter ou vendre, quels titres, à quel prix et dans quel délai ?',
    ],
  ]),
];
