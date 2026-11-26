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
    'Lina et Noé veulent décider à deux',
    'Cas fictif : Lina finance le démarrage. Noé a écrit le prototype. Ils veulent créer une SAS à parts égales. Un industriel veut déjà entrer au capital. Qui pourra lui dire oui ?',
  ),
  cards(
    '1 · Statuts ou pacte',
    'Deux outils selon les personnes à engager',
    [
      [
        'Les statuts',
        'Tous les associés y sont soumis, même ceux qui arrivent plus tard. Y organiser les pouvoirs, les décisions collectives et, si nécessaire, l’agrément des cessions.',
      ],
      [
        'Le pacte',
        'Le pacte ne lie que ses parties. Faire adhérer l’entrant avant la réalisation de l’opération. En cas de manquement : réparation du préjudice ou exécution en nature si ses conditions sont réunies.',
      ],
    ],
    ['C. com., art. L. 227-5, L. 227-9 et L. 227-14 · C. civ., art. 1199, 1217 et 1221'],
  ),
  table(
    '1 · Sanctions en SAS',
    'La sanction dépend de l’acte que l’on conteste',
    'Avant de demander la nullité, identifier l’acte, la règle violée et la personne contre laquelle agir.',
    ['Acte contesté', 'Règle méconnue', 'Recours à envisager'],
    [
      [
        'Cession d’actions',
        'Agrément imposé par les statuts',
        'Cession nulle si elle intervient en violation de la clause statutaire (L. 227-15).',
      ],
      [
        'Décision collective',
        'Majorité prévue par les statuts',
        'Depuis le 1er octobre 2025, les statuts peuvent prévoir la nullité pour violation de leurs règles. Elle n’est pas automatique.',
      ],
      [
        'Vente à un tiers',
        'Préemption inscrite au pacte',
        'Réparation du préjudice. Nullité ou substitution si le tiers connaissait le pacte ET l’intention du bénéficiaire de l’invoquer.',
      ],
    ],
    [
      'C. com., art. L. 227-15 et [L. 227-20-1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051318161) · C. civ., art. 1123 et 1844-12-1',
    ],
  ),
  cards(
    '1 · Gouvernance',
    'À 50/50, un désaccord peut suffire à bloquer la décision',
    [
      [
        'Au quotidien',
        'Lina préside la SAS. Un plafond statutaire exige un accord préalable pour ses achats. Si elle signe seule au-delà du plafond, cette limite de pouvoir est inopposable au fournisseur. Le recours est interne.',
      ],
      [
        'Pour une décision majeure',
        'Réserver la vente du brevet aux deux fondateurs, pas chaque dépense courante. Après deux votes infructueux, ouvrir une médiation limitée dans le temps. Sans accord, le brevet reste dans la société.',
      ],
      [
        'Pour ouvrir le capital',
        'Une vente de titres paie le vendeur. Une émission de titres finance la société et dilue les associés. Vérifier la procédure propre à l’opération et signer l’adhésion au pacte.',
      ],
    ],
    ['C. com., art. L. 227-6 et L. 227-9'],
  ),
  scene(
    '02',
    '30 000 € contre un prototype',
    'Avant de choisir un pourcentage, distinguer l’argent versé, les droits déjà créés et le travail qui reste à faire.',
  ),
  cards(
    '2 · Les apports',
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
    '2 · Constitution de la SAS',
    'Qui répond de la valeur du prototype',
    'Lina verse 30 000 €. Noé apporte des droits estimés à 20 000 €. Sans prime : 100 actions de 500 €, dont 60 pour Lina et 40 pour Noé.',
    ['Test à la constitution', 'Application au cas', 'Décision'],
    [
      [
        'Chaque apport en nature ≤ 30 000 €',
        'Un seul apport en nature : 20 000 €.',
        'Premier seuil respecté.',
      ],
      [
        'Total des apports non expertisés ≤ ½ du capital',
        '20 000 € sur 50 000 €, soit 40 %.',
        'Second seuil respecté. Les fondateurs peuvent écarter le commissaire à l’unanimité.',
      ],
      [
        'Qui supporte le risque de surévaluation ?',
        'Sans commissaire, les associés répondent solidairement de la valeur envers les tiers pendant cinq ans.',
        'Si les droits du laboratoire restent incertains, revoir le périmètre et la valeur avant de signer.',
      ],
    ],
    [
      'C. com., art. L. 227-1 et [D. 227-3](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034494298)',
    ],
  ),
  scene(
    '03',
    'Noé doit prouver ce qu’il peut apporter',
    'Une démonstration convaincante prouve que le produit fonctionne. Elle ne prouve pas que Noé peut céder tous les droits nécessaires à la société.',
  ),
  cards(
    '3 · Logiciel, brevet, savoir-faire',
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
  cards('3 · Le laboratoire partenaire', 'Le laboratoire détient une brique indispensable', [
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
    '04',
    'L’entrée de l’industriel peut changer le financement',
    'Il faut faire deux vérifications distinctes : la composition du capital pour la jeune entreprise innovante (JEI), puis les conditions de l’aide réellement demandée.',
  ),
  cards(
    '4 · JEI',
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
    '4 · Simulation de détention',
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
    '4 · Bpifrance',
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
    '4 · Dossier de financement',
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
    '05',
    'Noé quitte le projet, mais reste actionnaire',
    'Quitter ses fonctions ne vaut pas cession de ses titres. Pour savoir qui peut racheter quoi, à quel prix et quand, il faut revenir aux engagements signés.',
  ),
  cards(
    '5 · Départ individuel',
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
    '5 · Vente à un tiers',
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
  cards('À emporter', 'Trois vérifications avant de vous engager', [
    [
      'Avant de signer',
      'Chacun écrit ce qu’il livre, quand et en échange de quoi. Confrontez les réponses. Testez une décision à 50/50 et le départ de l’un de vous au bout d’un an.',
    ],
    [
      'Avant une entrée au capital',
      'Simulez les titres et les votes après l’opération. Relisez statuts, pacte et contrats de propriété intellectuelle. Faites signer les accords et adhésions nécessaires.',
    ],
    [
      'Avant le dossier de financement',
      'Datez la table du capital, qualifiez chaque détenteur pour la JEI, relisez la fiche Bpifrance et rapprochez les fonds propres des dépenses à financer.',
    ],
  ]),
  scene(
    '11/11',
    'Vos questions',
    'Si votre associé quittait le projet demain, quel document vous dirait qui conserve les titres, qui peut exploiter le produit et qui décide de la suite ?',
  ),
];
