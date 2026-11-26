const jei =
  '[CGI, art. 44 sexies-0 A, 4°](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053543750)';
const pret =
  '[Bpifrance · Prêt Innovation R&D classique](https://www.bpifrance.fr/catalogue-offres/pret-innovation-rd-classique-0)';
const bourse =
  '[Bpifrance · Bourse French Tech Émergence](https://www.bpifrance.fr/catalogue-offres/bourse-french-tech-emergence)';
export const TITLE = 'S’associer dans un projet innovant';
type Page = { blockType: string; title: string; [key: string]: unknown };
function cards(
  eyebrow: string,
  title: string,
  rows: [string, string][],
  sources: string[] = [],
): Page {
  return {
    blockType: 'cardGrid',
    eyebrow,
    title,
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
  {
    blockType: 'cover',
    title: TITLE,
    pills: [
      { text: 'Cycle Klarc · 11/11' },
      { text: '1er décembre 2026' },
      { text: '11 h à 12 h · Paris' },
    ],
    subtitle:
      'Encadrer les relations pour assurer l’équilibre.\n\nJoachim Brindeau, avocat, et Benjamin Visser, avocat fiscaliste · Klarc',
  },
  scene(
    '01',
    'Avant de signer, choisir ce que l’on décide à deux',
    'Lina finance le lancement. Noé apporte le prototype. Ils veulent décider ensemble de son avenir. Faut-il pour autant partager le capital à parts égales ?',
  ),
  cards(
    'Le pacte fondateur',
    'Décider ensemble ne suppose pas de tout décider à deux',
    [
      [
        'Qui peut décider seul ?',
        'Lina, présidente, signe les achats courants. Les statuts réservent aux associés la vente du logiciel, à une majorité qui exige leurs deux voix. En cas de désaccord, la vente attend.',
      ],
      [
        'Qui peut devenir associé ?',
        'Si chacun veut choisir son futur partenaire, prévoir un agrément dans les statuts de la SAS. Il s’impose aussi aux entrants. La cession faite en violation de cette clause est nulle.',
      ],
      [
        'Que se promet-on ?',
        'Dans le pacte, convenir d’une seconde réunion puis d’une médiation en cas de blocage. Seuls les signataires sont engagés. Un manquement peut ouvrir droit à réparation, pas à l’annulation automatique du vote.',
      ],
    ],
    ['C. com., art. L. 227-5, L. 227-9, L. 227-14 et L. 227-15 · C. civ., art. 1199 et 1217'],
  ),
  cards(
    'Les apports',
    'Trois contributions, trois façons de les évaluer',
    [
      [
        'Numéraire : de l’argent',
        'Retenir le montant souscrit et noter quand il sera versé. Une avance en compte courant est un prêt de l’associé, pas une souscription au capital.',
      ],
      [
        'Nature : un bien ou un droit',
        'Identifier ce que reçoit la société. Pour un logiciel, comparer coût de remplacement et revenus plausibles. Documenter les hypothèses et vérifier si un commissaire aux apports est requis.',
      ],
      [
        'Industrie : un travail futur',
        'Évaluer le temps et le coût d’une prestation équivalente. Fixer mission, durée et droits dans les statuts. En SAS, cet apport peut donner des actions inaliénables mais ne forme pas le capital. Six mois de travail promis ne sont pas six mois de trésorerie.',
      ],
    ],
    ['C. civ., art. 1843-2 et 1843-3 · C. com., art. L. 227-1'],
  ),
  table(
    'La répartition proposée',
    '60 % pour Lina, 40 % pour Noé : à quelles conditions',
    'À la création de la SAS, sans prime, les fondateurs envisagent 100 actions de 500 €. Ils réservent la cession du logiciel à leur accord commun.',
    ['Contribution', 'Ce que reçoit la SAS', 'Ce que reçoit l’associé'],
    [
      ['Lina : 30 000 € versés', '30 000 € de trésorerie', '60 actions'],
      [
        'Noé : droits sur le prototype estimés à 20 000 €',
        'Des droits exploitables, pas de trésorerie',
        '40 actions, si les droits et leur valeur sont confirmés',
      ],
      [
        'Développements à venir',
        'Un engagement distinct, à décrire et à rémunérer',
        'Aucune action de capital supplémentaire du seul fait du travail promis',
      ],
    ],
    ['C. civ., art. 1843-2 · C. com., art. L. 227-1'],
  ),
  cards(
    'Logiciel, brevet, savoir-faire',
    'Pour chaque actif, demander une pièce différente',
    [
      [
        'Logiciel : la chaîne des droits',
        'Le mandat de dirigeant ne transfère pas, à lui seul, les droits de Noé à la SAS. Annexer la version du code, distinguer son code des composants tiers et délimiter chaque droit cédé, sa destination, sa durée et son territoire.',
      ],
      [
        'Brevet : le titre et le registre',
        'Vérifier le titulaire inscrit, les copropriétés, les licences et les annuités. La cession doit être écrite à peine de nullité. L’inscription au registre répond à une autre question : l’opposabilité aux tiers.',
      ],
      [
        'Savoir-faire : le contenu secret',
        'Décrire le procédé dans une annexe confidentielle, prévoir transmission et formation. Limiter les accès et tracer les remises : on ne transfère pas une exclusivité par le seul mot « savoir-faire ».',
      ],
    ],
    ['CPI, art. L. 131-3, L. 613-8 et L. 613-9 · C. com., art. L. 151-1'],
  ),
  cards('Le laboratoire partenaire', 'Le laboratoire détient une brique indispensable', [
    [
      'Condition de réalisation',
      'Noé apporte le code qu’il détient. Le laboratoire conserve son moteur de calcul. Subordonner la réalisation de l’apport à une licence signée par le titulaire habilité, plutôt qu’à une simple lettre de soutien.',
    ],
    [
      'Test commercial',
      'La licence autorise la recherche interne. Or le client industriel exige une distribution embarquée. Négocier reproduction, distribution et sous-licence pour ce marché. À défaut, exclure ces ventes de la valorisation.',
    ],
  ]),
  scene(
    '02',
    'Avant d’accepter l’offre de l’industriel',
    'La licence commerciale est signée. Les fondateurs ont créé la SAS à 60/40. Un industriel propose maintenant de souscrire 100 actions nouvelles. La société recevra les fonds. Que change cette entrée pour son financement ?',
  ),
  cards(
    'JEI',
    'Le seuil porte sur les détenteurs admis, pas sur toute société',
    [
      [
        'Le test',
        'Au moins 50 % du capital doit être détenu de façon continue par des détenteurs admis. Les personnes physiques comptent. Une holding de fondateurs ne compte pas automatiquement.',
      ],
      [
        'Qui peut aussi compter ?',
        'Voie du 4° b : la société interposée doit elle-même répondre aux mêmes conditions ET être détenue à 50 % au moins par des personnes physiques. Examiner séparément les fonds et organismes des c à e.',
      ],
      [
        'Ce que le test ne dit pas',
        'Même franchi, ce seuil ne suffit pas : vérifier aussi taille, âge, activité nouvelle et condition de recherche applicable. En cas de doute documenté, envisager un rescrit.',
      ],
    ],
    [jei],
  ),
  table(
    'Simulation de détention',
    'À 50 %, une action de plus change le diagnostic JEI',
    'L’industriel souscrit seul. Hypothèses : il ne relève d’aucune catégorie admise et toutes les actions ont la même valeur nominale.',
    ['Détenteur', 'Avant', '100 actions émises', '101 actions émises'],
    [
      ['Lina + Noé (admis)', '60 + 40', '100 sur 200', '100 sur 201'],
      ['Industriel (non admis)', '0', '100 sur 200', '101 sur 201'],
      ['Fraction du capital admise', '100 %', '50 % : seuil atteint', '49,75 % : seuil rompu'],
    ],
    [jei],
  ),
  cards(
    'Bpifrance',
    'Pas de seuil JEI à transposer à toutes les aides',
    [
      [
        'Bourse French Tech Émergence',
        'Petite entreprise immatriculée en France depuis moins d’un an, projet qualifié deeptech. Vérifier si les données du groupe industriel changent la catégorie de taille. Les dépenses antérieures au dépôt sont exclues.',
      ],
      [
        'Prêt Innovation R&D classique',
        'PME ou ETI dans la limite de 2 000 ETP. Prêt plafonné à 3 M€ et au double des fonds propres et quasi-fonds propres. Avec 80 000 € retenus, le plafond est de 160 000 €, sans garantie d’octroi.',
      ],
    ],
    [bourse, pret],
  ),
  cards(
    'Dossier de financement',
    'Comptes, organigramme et licences à joindre au dossier',
    [
      [
        'L’argent disponible',
        'Rapprocher derniers comptes, pertes et apports récents. Le capital affiché n’est ni la trésorerie ni les fonds propres. Chiffrer le reste du programme à financer.',
      ],
      [
        'Le contrôle réel',
        'Taille européenne : hors exceptions, une participation de 30 % sans contrôle conduit à agréger 30 % des données du partenaire (si votes et capital coïncident). Avec contrôle, retenir 100 % des données de l’entreprise liée.',
      ],
      [
        'La capacité à vendre',
        'Montrer à l’investisseur les cessions ou licences signées. Un veto sur la prochaine levée ou une licence révocable au départ de Noé change le dossier, même à capital inchangé.',
      ],
    ],
    ['Recommandation 2003/361/CE, annexe, art. 3 et 6 · Fiche du dispositif sollicité'],
  ),
  scene(
    '03',
    'Avant de signer une clause de sortie',
    'Revenons au pacte initial, avant toute levée. Deux événements à tester séparément : Noé cesse de travailler ; un tiers propose de racheter les actions de Lina. Les mêmes clauses ne répondent pas aux deux situations.',
  ),
  cards(
    'Départ individuel',
    'Vesting et leaver répondent à deux questions différentes',
    [
      [
        'Quelle quantité ?',
        'Noé détient ses 40 actions dès la constitution. Une promesse de vente porte sur la fraction non consolidée : 10 actions se libèrent par année entière. Après deux ans, 20 restent rachetables. Rien n’est transféré sans exercice de l’option.',
      ],
      [
        'À quel prix ?',
        'Exemple négocié pour les 20 titres : valeur de marché en cas d’incapacité durable ; décote convenue en cas de manquement grave établi. Définir date de valeur, méthode et procédure contradictoire. La décote n’est pas de droit.',
      ],
      [
        'Qui achète ?',
        'Lina dispose de 30 jours après notification pour lever l’option. Chiffrer le paiement avant de signer. Si elle ne lève pas l’option dans le délai, Noé conserve ses titres dans cet exemple.',
      ],
    ],
    ['Illustration contractuelle, pas un barème légal · C. civ., art. 1124'],
  ),
  table(
    'Vente à un tiers',
    'Une offre pour 60 actions, trois issues possibles',
    'Variante avant l’entrée de l’industriel : Lina reçoit une offre ferme pour ses 60 actions. Noé en détient 40. Les seuils ci-dessous sont négociés, pas légaux.',
    ['Clause', 'Qui a la main ?', 'Effet sur cette offre'],
    [
      [
        'Préemption',
        'Noé a priorité pour acheter aux conditions notifiées.',
        'Il doit pouvoir financer les 60 actions dans le délai convenu.',
      ],
      [
        'Sortie conjointe intégrale',
        'Noé peut demander à vendre ses 40 actions au même prix par action.',
        'Si l’acheteur refuse de prendre les 100, Lina ne peut conclure seule si le pacte le prévoit.',
      ],
      [
        'Sortie forcée au seuil de 75 %',
        'Les signataires réunissant 75 % peuvent entraîner les autres sur une offre visant 100 %.',
        'Ni l’offre sur 60 titres ni les 60 % de Lina ne suffisent. Aucune vente forcée sur ces faits.',
      ],
    ],
    ['Exemples de stipulations contractuelles · C. civ., art. 1103, 1123 et 1124'],
  ),
  cards('Synthèse · Questions', 'Trois pièces à mettre sur la table avant de signer', [
    [
      'L’accord des fondateurs',
      'À côté des pourcentages, écrire qui décide d’une vente du logiciel, qui peut refuser un entrant et ce qui se passe en cas de désaccord.',
    ],
    [
      'La table de capitalisation datée',
      'Pour chaque apport : valeur, droits transmis et preuve. Pour chaque émission : répartition après opération, test JEI et conditions propres à l’aide demandée.',
    ],
    [
      'Deux simulations de sortie',
      'Faire jouer le départ de Noé, puis l’offre faite à Lina. Dans chaque cas, désigner l’acheteur, les titres concernés, le prix ou sa formule et le délai de paiement.',
    ],
  ]),
];
