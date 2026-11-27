import { compare, section, table } from './layout';

export const propriete = [
  section(
    '03',
    'La propriété du prototype',
    '**À qui appartient le prototype ?** Objectif : vérifier que la SAS détient bien les droits sur ce qu’elle va vendre, y compris les briques fournies par d’autres.',
  ),
  compare(
    'Propriété du prototype · Le code de Noé',
    'Noé ne peut apporter que les droits qu’il détient',
    [
      [
        'Code écrit comme salarié',
        'Écrit dans ses fonctions ou sur instruction, le logiciel appartient à l’employeur[^1]. Il faut la cession de l’employeur pour l’apporter.',
      ],
      [
        'Code écrit par un prestataire',
        'Payer une facture ne transfère pas les droits. Il faut un acte de cession écrit et signé par l’auteur[^1].',
      ],
      [
        'Code écrit par Noé seul',
        'Noé peut l’apporter. L’acte liste la version, les droits cédés, le territoire et la durée[^1].',
      ],
    ],
    ['CPI, art. L. 113-9 et L. 131-3'],
    '**À retenir :** un historique Git date les contributions, mais il ne prouve pas qui détient les droits.',
  ),
  compare(
    'Propriété du prototype · Le moteur du laboratoire',
    'Une licence de recherche ne permet pas de vendre au client',
    [
      [
        'Aujourd’hui · Licence de recherche',
        'Elle autorise des tests internes. Elle ne couvre ni l’intégration du moteur dans le produit, ni sa livraison au client[^1].',
      ],
      [
        'À obtenir · Licence commerciale',
        'Signée par le laboratoire, au nom de la SAS : intégrer, distribuer, usage par le client, durée, territoire et prix.',
      ],
    ],
    ['CPI, art. L. 122-6 · Exemple fictif'],
    '**Si le laboratoire refuse :** remplacer le moteur, ou différer la vente. Dans les deux cas, la valeur de l’apport de Noé est à revoir.',
  ),
  table(
    'Propriété intellectuelle · Fiche pratique',
    'Logiciel, brevet, savoir-faire : ce qu’il faut demander',
    'Seul le logiciel est en jeu dans le cas. Les deux autres lignes servent de comparaison.',
    ['Actif', 'Règle clé', 'Pièces à demander'],
    [
      [
        '**Logiciel**',
        'Céder les droits par écrit et lister ce qui reste sous licence.',
        'Inventaire du code, actes de cession, licences',
      ],
      [
        '**Brevet**',
        'Cession écrite, sinon nulle. L’inscrire au registre pour l’opposer aux tiers.',
        'Titre, extrait du registre, acte écrit',
      ],
      [
        '**Savoir-faire**',
        'Pas de monopole : il est protégé tant qu’il reste secret.',
        'Accord de confidentialité, traces d’accès',
      ],
    ],
    ['CPI, art. L. 131-3, L. 613-8 et L. 613-9 · C. com., art. L. 151-1'],
  ),
];
