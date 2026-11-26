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
        'Ce contrat ne lie que ses signataires. Y détailler les engagements personnels : information, négociation en cas de blocage, promesses de vente. Faire adhérer chaque entrant.',
      ],
    ],
    ['C. com., art. L. 227-5, L. 227-9 et L. 227-14 · C. civ., art. 1199'],
  ),
  cards(
    '1 · En cas de violation',
    'Une vente irrégulière n’est pas toujours annulée',
    [
      [
        'Cession interdite',
        'Dans une SAS, une cession en violation d’une clause statutaire encadrant les transferts est nulle. Ne pas généraliser cette sanction à toute décision irrégulière.',
      ],
      [
        'Promesse non tenue',
        'Pour un pacte : demander réparation du préjudice ou, si les conditions sont réunies, l’exécution en nature. La vente au tiers n’est pas automatiquement annulée.',
      ],
      [
        'Priorité ignorée',
        'Pour faire annuler la vente ou se substituer à l’acheteur, le bénéficiaire doit prouver que celui-ci connaissait le pacte de préférence ET son intention de s’en prévaloir.',
      ],
    ],
    ['C. com., art. L. 227-15 · C. civ., art. 1123, 1217 et 1221'],
  ),
  cards(
    '1 · Gouvernance',
    'À 50/50, un désaccord peut suffire à bloquer la décision',
    [
      [
        'Au quotidien',
        'Lina négocie les ventes, Noé pilote le produit. Écrire qui peut engager la société et pour quel budget. Une limite interne ne protège pas toujours vis-à-vis des tiers.',
      ],
      [
        'Pour une décision majeure',
        'Réserver, par exemple, la vente du brevet aux associés. Fixer majorité et délai. Si les voix restent partagées : seconde réunion, puis médiation.',
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
        'Préciser mission, durée et droits attachés. En SAS, cet apport peut donner des actions inaliénables mais ne forme pas le capital. Six mois de travail promis ne sont pas six mois de trésorerie.',
      ],
    ],
    ['C. civ., art. 1843-2 et 1843-3 · C. com., art. L. 227-1'],
  ),
  cards('2 · Cas pratique', '50 000 € de capital, mais 30 000 € en banque', [
    [
      'Hypothèse négociée',
      'Lina verse 30 000 €. Noé apporte les droits sur le prototype, évalués à 20 000 €. À la création, sans prime ni autre apport au capital : 50 000 € de capital.',
    ],
    [
      'Résultat',
      'À droits identiques : Lina 60 %, Noé 40 %. La banque n’a reçu que 30 000 €. Négocier séparément les pouvoirs de Noé et sa rémunération pour les prochaines versions.',
    ],
  ]),
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
        'Lister auteurs, prestataires et composants tiers. Décrire la version livrée et les droits cédés : reproduction, adaptation, distribution, périmètre, durée et territoire. Livrer aussi le dépôt de code.',
      ],
      [
        'Brevet : le titre et le registre',
        'Vérifier titulaire, copropriétaires, pays, annuités et licences. Formaliser la cession par écrit et l’inscrire au registre pour la rendre opposable aux tiers.',
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
      'Ne pas promettre sa propriété',
      'Noé ne peut pas apporter ce qui appartient au laboratoire. Isoler la brique, identifier le titulaire habilité à signer et revoir la valeur des seuls droits effectivement apportés.',
    ],
    [
      'Négocier le droit utile',
      'Une licence autorise des usages sans transférer la propriété. Couvre-t-elle les ventes prévues, les territoires, les sous-licences clients et la durée du projet ? Que devient-elle si Noé part ?',
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
        'Notamment certaines sociétés répondant aux conditions du texte, certains fonds sous condition d’indépendance, des établissements publics de recherche ou leurs filiales. Documenter la catégorie exacte.',
      ],
      [
        'Ce que le test ne dit pas',
        'Même franchi, ce seuil ne suffit pas : vérifier aussi taille, âge, activité nouvelle et condition de recherche applicable. En cas de doute documenté, envisager un rescrit.',
      ],
    ],
    [jei],
  ),
  cards(
    '4 · Simulation après émission',
    'Une seule action peut faire basculer le résultat',
    [
      [
        '100 actions nouvelles',
        'Lina et Noé conservent leurs 100 actions. L’industriel, supposé non admis, en reçoit 100. Les fondateurs détiennent 100/200 = 50 %. Le seuil de détention reste atteint.',
      ],
      [
        '101 actions nouvelles',
        'Avec une action supplémentaire pour l’industriel : 100/201 ≈ 49,75 %. Le seuil n’est plus atteint. Reconstituer les dates : une correction ultérieure n’efface pas la rupture de continuité.',
      ],
    ],
    [jei],
  ),
  cards(
    '4 · Bpifrance',
    'Pas de seuil JEI à transposer à toutes les aides',
    [
      [
        'Bourse French Tech Émergence',
        'Cette bourse vise les petites entreprises deeptech de moins d’un an. Examiner les liens avec l’industriel pour déterminer la taille européenne. Déposer avant d’engager les dépenses concernées.',
      ],
      [
        'Prêt Innovation R&D classique',
        'La fiche vise les PME et certaines ETI. Le montant est notamment limité au double des fonds propres et quasi-fonds propres : 80 000 € retenus donnent un plafond de 160 000 €, pas un droit au prêt.',
      ],
    ],
    [bourse, pret],
  ),
  cards(
    '4 · Dossier de financement',
    'Les trois pièces que le financeur voudra comprendre',
    [
      [
        'L’argent disponible',
        'Rapprocher derniers comptes, pertes et apports récents. Le capital affiché n’est ni la trésorerie ni les fonds propres. Chiffrer le reste du programme à financer.',
      ],
      [
        'Le contrôle réel',
        'Joindre la table du capital avant/après, les droits de vote, les accords de contrôle et les titres donnant accès au capital. Identifier entreprises partenaires ou liées pour le test de taille.',
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
        'Exemple de reverse vesting : Noé possède déjà 400 actions. Une promesse permet de racheter la fraction non consolidée. Avec 100 actions consolidées par année entière, un départ après deux ans laisse 200 actions sous promesse.',
      ],
      [
        'À quel prix ?',
        'Leaver : distinguer par exemple incapacité durable (good) et manquement grave établi (bad). Dire qui constate le motif, comment le contester et quelle formule de prix vaut pour chaque lot.',
      ],
      [
        'Qui achète ?',
        'Nommer le bénéficiaire de la promesse, fixer notification, délai d’option et paiement. Sans acheteur en mesure de payer, même un prix clair ne règle pas le départ.',
      ],
    ],
    ['Illustration contractuelle, pas un barème légal · C. civ., art. 1124'],
  ),
  cards('5 · Vente à un tiers', 'Trois réponses possibles à une offre de rachat', [
    [
      'Préemption : acheter d’abord',
      'Lina veut céder ses titres. Avant la vente, Noé reçoit les conditions de l’offre et peut acheter en priorité dans le délai convenu.',
    ],
    [
      'Sortie conjointe : suivre',
      'Si Lina vend le contrôle, Noé peut demander que l’acquéreur achète aussi ses titres, selon la proportion et les conditions prévues. C’est un droit, pas une obligation.',
    ],
    [
      'Sortie forcée : vendre aussi',
      'Un acheteur exige 100 %. Si le seuil et les conditions prévus au pacte sont réunis, les signataires concernés doivent céder. Vérifier prix, garanties et articulation avec la préemption.',
    ],
  ]),
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
