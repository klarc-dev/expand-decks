import { compare, table } from './layout';

export const constitution = [
  compare(
    'Constitution · Statuts et pacte',
    'Les statuts fixent les pouvoirs, le pacte lie ses signataires',
    [
      [
        'Statuts · Décider dans la SAS',
        'Les statuts s’appliquent à tous les associés. Ils réservent la vente du logiciel à l’accord des deux fondateurs. Si Lina, présidente, signe seule, la SAS ne peut pas opposer cette limite à l’acheteur[^1].',
      ],
      [
        'Statuts · Céder des actions',
        'Si Lina vend ses propres actions, vérifier l’agrément préalable prévu par les statuts. La cession faite en violation de cette clause est nulle[^2]. Ce n’est pas la vente du logiciel par la SAS.',
      ],
      [
        'Pacte · Faire entrer un associé',
        'Le pacte n’oblige que ses parties[^3] : acquérir des titres ne vaut pas adhésion. À l’entrée de l’industriel, prévoir qu’il signe l’acte d’adhésion avant la réalisation de l’opération.',
      ],
    ],
    [
      'C. com., art. L. 227-5, L. 227-6 et L. 227-9',
      'C. com., art. L. 227-14 et L. 227-15',
      'C. civ., art. 1199',
    ],
    'Avant l’entrée d’un associé : relire ensemble les statuts, le pacte et l’acte d’adhésion.',
  ),
  table(
    'Constitution · Matrice de pouvoirs',
    'Un désaccord sur la vente ne bloque pas les achats courants',
    'Hypothèse avant la levée : les statuts exigent l’accord de Lina et de Noé pour vendre le logiciel[^1]. Noé refuse le prix proposé.',
    ['Décision', 'Qui décide ?', 'Pièce à vérifier', 'Effet / suite'],
    [
      [
        '**Renouveler l’hébergement**',
        'Lina, présidente',
        'Bon de commande',
        'Lina signe : le service continue.',
      ],
      [
        '**Vendre le logiciel**',
        'Lina et Noé',
        'Offre et PV du vote',
        'Refus de Noé : pas d’autorisation de signer.',
      ],
      [
        '**Revoir le prix**',
        'Les deux fondateurs',
        'Offre révisée et pacte',
        'Nouvelle réunion, puis médiation si le refus persiste. Sans accord, pas de vente autorisée.',
      ],
    ],
    ['C. com., art. L. 227-5, L. 227-6 et L. 227-9 · Circuit de décision fictif'],
  ),
  table(
    'Constitution · Apports et avances',
    'Le capital, la trésorerie et le travail promis se comptent séparément',
    'Lina finance le lancement. Noé apporte des droits sur le code existant. Son travail futur fait l’objet d’un accord distinct.',
    ['Opération', 'Capital', 'Trésorerie', 'Pièce / effet'],
    [
      [
        '**Numéraire** · argent souscrit',
        'Oui, à la souscription[^1]',
        'Somme effectivement versée',
        'Certificat du dépositaire : preuve du versement. L’apport donne des actions.',
      ],
      [
        '**Nature** · droits sur le code',
        'Oui, à la valeur retenue[^1]',
        'Pas d’encaissement',
        'Acte d’apport : droits transférés contre actions.',
      ],
      [
        '**Industrie** · travail promis',
        'Non[^1]',
        'Pas d’encaissement',
        'Statuts : actions inaliénables possibles et droits à définir[^2].',
      ],
      [
        '**Compte courant** · avance',
        'Non',
        'Somme avancée',
        'Convention : dette à rembourser, pas d’action nouvelle.',
      ],
    ],
    ['C. civ., art. 1843-2 et 1843-3', 'C. com., art. L. 227-1'],
  ),
  compare(
    'Constitution · Simulation à 100 actions de 500 €, sans prime',
    '60/40 si les droits de Noé valent 20 000 €',
    [
      [
        'Lina · 60 actions, 30 000 € versés',
        'Lina souscrit et verse 30 000 €. Si Noé reçoit 40 actions contre ses droits, la SAS démarre avec **50 000 € de capital** mais seulement **30 000 € en banque** au titre des apports.',
      ],
      [
        'Noé · 40 actions à justifier',
        'Devis fictif d’un équivalent prêt à exploiter : 25 000 €. Avec 5 000 € de remise à niveau, le coût ajusté est de 20 000 €. Si l’audit chiffre les travaux à 12 000 €, il tombe à 13 000 € : le calcul des 40 actions est à revoir.',
      ],
    ],
    ['CPI, art. L. 131-3 · Chiffrage fictif, à documenter'],
    'Avant de fixer les parts : vérifier l’acte de cession[^1] et les usages autorisés. Recouper le coût par les revenus plausibles. Exclure le travail futur et le moteur du laboratoire.',
  ),
  compare(
    'Constitution · Valeur de l’apport et commissaire aux apports',
    'La dispense ne valide pas les 20 000 €',
    [
      [
        'Variante · 28 000 € en nature et 22 000 € en argent',
        'Le seul apport en nature passe le seuil individuel de 30 000 €, mais dépasse 25 000 €, la moitié du capital. **Commissaire requis**, même si les deux fondateurs sont d’accord[^1].',
      ],
      [
        'Test · Si l’apport est confirmé à 20 000 €',
        'Il ne dépasse ni **30 000 € par apport** ni **25 000 € au total** (moitié du capital de 50 000 € ici). À la constitution, la dispense reste un choix unanime des futurs associés[^1].',
      ],
    ],
    ['C. com., art. L. 227-1 et D. 227-3'],
    'Responsabilité : sans commissaire, ou si la valeur retenue diffère de sa proposition, les associés répondent solidairement de cette valeur pendant cinq ans envers les tiers[^1].',
  ),
];
