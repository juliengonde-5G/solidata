/**
 * Service de Test de Personnalité PCM (Process Communication Model de Kahler)
 *
 * 6 types de personnalité :
 * - Empathique : chaleureux, sensible, compatissant
 * - Travaillomane (Analyseur) : logique, responsable, organisé
 * - Persévérant : dévoué, observateur, consciencieux
 * - Rêveur (Imagineur) : calme, imaginatif, réfléchi
 * - Promoteur (Energiseur) : adaptable, charmeur, plein de ressources
 * - Rebelle (Energiseur ludique) : créatif, spontané, ludique
 */

// Questionnaire PCM adapté pour personnes avec compétences linguistiques limitées
// 15 questions, vie privée et professionnelle, avec indices visuels par option
const PCM_QUESTIONS = [
  // === BLOC 1 : Perception du monde (identifier la base) ===
  {
    id: 'q1',
    category: 'perception',
    text: "Quand vous rencontrez quelqu'un pour la première fois, qu'est-ce qui est le plus important pour vous ?",
    visualHint: "people_meeting",
    options: [
      { id: 'a', text: "Que la personne soit gentille et chaleureuse", type: 'empathique', score: 3, emoji: '🤗' },
      { id: 'b', text: "Que la personne soit sérieuse et organisée", type: 'travaillomane', score: 3, emoji: '📋' },
      { id: 'c', text: "Que la personne ait de bonnes valeurs", type: 'perseverant', score: 3, emoji: '⚖️' },
      { id: 'd', text: "Que la personne me laisse tranquille", type: 'reveur', score: 3, emoji: '🧘' },
      { id: 'e', text: "Que la personne soit dynamique et efficace", type: 'promoteur', score: 3, emoji: '🚀' },
      { id: 'f', text: "Que la personne soit drôle et amusante", type: 'rebelle', score: 3, emoji: '😄' }
    ]
  },
  {
    id: 'q2',
    category: 'perception',
    text: "Quand vous êtes content(e), c'est surtout parce que :",
    visualHint: "happy_person",
    options: [
      { id: 'a', text: "Vous êtes entouré(e) de gens que vous aimez", type: 'empathique', score: 3, emoji: '👨‍👩‍👧‍👦' },
      { id: 'b', text: "Vous avez bien fait votre travail", type: 'travaillomane', score: 3, emoji: '✅' },
      { id: 'c', text: "Vous avez aidé quelqu'un ou fait quelque chose de juste", type: 'perseverant', score: 3, emoji: '🤝' },
      { id: 'd', text: "Vous avez eu du temps pour vous, au calme", type: 'reveur', score: 3, emoji: '☁️' },
      { id: 'e', text: "Vous avez relevé un défi", type: 'promoteur', score: 3, emoji: '🏆' },
      { id: 'f', text: "Vous avez ri et vous êtes amusé(e)", type: 'rebelle', score: 3, emoji: '🎉' }
    ]
  },
  {
    id: 'q3',
    category: 'perception',
    text: "Un bon week-end pour vous, c'est :",
    visualHint: "weekend",
    options: [
      { id: 'a', text: "Passer du temps avec la famille ou les amis", type: 'empathique', score: 2, emoji: '👪' },
      { id: 'b', text: "Ranger, organiser, faire des choses utiles", type: 'travaillomane', score: 2, emoji: '🧹' },
      { id: 'c', text: "Faire une activité qui a du sens (bénévolat, lecture...)", type: 'perseverant', score: 2, emoji: '📖' },
      { id: 'd', text: "Ne rien faire, rêver, être tranquille", type: 'reveur', score: 2, emoji: '🛋️' },
      { id: 'e', text: "Faire du sport, une sortie, une aventure", type: 'promoteur', score: 2, emoji: '⛰️' },
      { id: 'f', text: "Aller à une fête, voir des spectacles, s'amuser", type: 'rebelle', score: 2, emoji: '🎶' }
    ]
  },

  // === BLOC 2 : Réactions au travail (confirmer base + identifier phase) ===
  {
    id: 'q4',
    category: 'travail',
    text: "Au travail, ce qui vous motive le plus c'est :",
    visualHint: "work_motivation",
    options: [
      { id: 'a', text: "L'ambiance et les collègues", type: 'empathique', score: 3, emoji: '💬' },
      { id: 'b', text: "Être reconnu(e) pour la qualité de votre travail", type: 'travaillomane', score: 3, emoji: '🌟' },
      { id: 'c', text: "Sentir que votre travail est utile et important", type: 'perseverant', score: 3, emoji: '💪' },
      { id: 'd', text: "Avoir des consignes claires et du temps pour travailler", type: 'reveur', score: 3, emoji: '⏳' },
      { id: 'e', text: "Avoir des responsabilités et de l'autonomie", type: 'promoteur', score: 3, emoji: '👑' },
      { id: 'f', text: "Que le travail soit varié et pas ennuyeux", type: 'rebelle', score: 3, emoji: '🎨' }
    ]
  },
  {
    id: 'q5',
    category: 'travail',
    text: "Quand on vous donne une tâche à faire, vous préférez :",
    visualHint: "task_given",
    options: [
      { id: 'a', text: "Le faire en équipe, ensemble", type: 'empathique', score: 2, emoji: '👥' },
      { id: 'b', text: "Avoir des instructions précises et un planning", type: 'travaillomane', score: 2, emoji: '📅' },
      { id: 'c', text: "Comprendre pourquoi c'est important avant de commencer", type: 'perseverant', score: 2, emoji: '🔍' },
      { id: 'd', text: "Qu'on vous laisse le faire seul(e) à votre rythme", type: 'reveur', score: 2, emoji: '🐢' },
      { id: 'e', text: "Qu'on vous fasse confiance sans tout contrôler", type: 'promoteur', score: 2, emoji: '🏃' },
      { id: 'f', text: "Que ce soit amusant ou qu'il y ait un jeu", type: 'rebelle', score: 2, emoji: '🎮' }
    ]
  },
  {
    id: 'q6',
    category: 'travail',
    text: "Qu'est-ce qui vous dérange le plus au travail ?",
    visualHint: "work_frustration",
    options: [
      { id: 'a', text: "Les conflits entre les personnes", type: 'empathique', score: 2, emoji: '😢' },
      { id: 'b', text: "Le désordre, quand c'est mal organisé", type: 'travaillomane', score: 2, emoji: '😤' },
      { id: 'c', text: "L'injustice ou le manque de respect", type: 'perseverant', score: 2, emoji: '😠' },
      { id: 'd', text: "Qu'on me mette la pression ou qu'on me parle fort", type: 'reveur', score: 2, emoji: '😰' },
      { id: 'e', text: "L'ennui, faire toujours la même chose", type: 'promoteur', score: 2, emoji: '😴' },
      { id: 'f', text: "Les règles trop strictes et les gens trop sérieux", type: 'rebelle', score: 2, emoji: '🙄' }
    ]
  },

  // === BLOC 3 : Comportements sous stress (1er et 2e degré) ===
  {
    id: 'q7',
    category: 'stress',
    text: "Quand vous êtes un peu stressé(e), vous avez tendance à :",
    visualHint: "mild_stress",
    options: [
      { id: 'a', text: "Vous occuper des autres avant vous-même, trop en faire", type: 'empathique', score: 3, emoji: '🫂' },
      { id: 'b', text: "Tout contrôler, devenir trop exigeant(e)", type: 'travaillomane', score: 3, emoji: '🔧' },
      { id: 'c', text: "Critiquer les autres, donner des leçons", type: 'perseverant', score: 3, emoji: '☝️' },
      { id: 'd', text: "Vous replier sur vous, attendre que ça passe", type: 'reveur', score: 3, emoji: '🐚' },
      { id: 'e', text: "Manipuler la situation pour obtenir ce que vous voulez", type: 'promoteur', score: 3, emoji: '🎯' },
      { id: 'f', text: "Rejeter la faute sur les autres, râler", type: 'rebelle', score: 3, emoji: '👆' }
    ]
  },
  {
    id: 'q8',
    category: 'stress',
    text: "Quand vous êtes très stressé(e), que faites-vous ?",
    visualHint: "high_stress",
    options: [
      { id: 'a', text: "Vous faites des erreurs bêtes, vous vous sentez nul(le)", type: 'empathique', score: 3, emoji: '😞' },
      { id: 'b', text: "Vous pensez que les autres sont incompétents", type: 'travaillomane', score: 3, emoji: '🤨' },
      { id: 'c', text: "Vous imposez vos idées sans écouter", type: 'perseverant', score: 3, emoji: '🗣️' },
      { id: 'd', text: "Vous ne faites plus rien, vous êtes bloqué(e)", type: 'reveur', score: 3, emoji: '🧊' },
      { id: 'e', text: "Vous devenez agressif(ve) ou prenez des risques", type: 'promoteur', score: 3, emoji: '⚡' },
      { id: 'f', text: "Vous vous vengez ou sabotez les choses", type: 'rebelle', score: 3, emoji: '💣' }
    ]
  },

  // === BLOC 4 : Relations et vie privée (affiner la phase) ===
  {
    id: 'q9',
    category: 'relations',
    text: "Dans vos relations avec les autres, vous aimez surtout :",
    visualHint: "relationships",
    options: [
      { id: 'a', text: "Prendre soin des autres, être proche", type: 'empathique', score: 2, emoji: '💕' },
      { id: 'b', text: "Échanger des idées, discuter de sujets intéressants", type: 'travaillomane', score: 2, emoji: '🧠' },
      { id: 'c', text: "Partager vos convictions, défendre vos valeurs", type: 'perseverant', score: 2, emoji: '✊' },
      { id: 'd', text: "Avoir des moments de silence ensemble", type: 'reveur', score: 2, emoji: '🌅' },
      { id: 'e', text: "Faire des choses ensemble, de l'action", type: 'promoteur', score: 2, emoji: '🏄' },
      { id: 'f', text: "Rigoler, plaisanter, ne pas se prendre au sérieux", type: 'rebelle', score: 2, emoji: '🤣' }
    ]
  },
  {
    id: 'q10',
    category: 'relations',
    text: "Comment réagissez-vous quand quelqu'un est triste ?",
    visualHint: "comforting",
    options: [
      { id: 'a', text: "Vous le prenez dans vos bras, vous êtes très touché(e)", type: 'empathique', score: 2, emoji: '🤗' },
      { id: 'b', text: "Vous essayez de trouver une solution à son problème", type: 'travaillomane', score: 2, emoji: '💡' },
      { id: 'c', text: "Vous lui donnez des conseils basés sur vos expériences", type: 'perseverant', score: 2, emoji: '📝' },
      { id: 'd', text: "Vous restez là sans rien dire, juste présent(e)", type: 'reveur', score: 2, emoji: '🤐' },
      { id: 'e', text: "Vous l'emmenez faire quelque chose pour changer les idées", type: 'promoteur', score: 2, emoji: '🚶' },
      { id: 'f', text: "Vous essayez de le faire rire", type: 'rebelle', score: 2, emoji: '😜' }
    ]
  },

  // === BLOC 5 : Besoins psychologiques (confirmer phase + RPS) ===
  {
    id: 'q11',
    category: 'besoins',
    text: "De quoi avez-vous le plus besoin pour vous sentir bien ?",
    visualHint: "needs",
    options: [
      { id: 'a', text: "Être aimé(e) et apprécié(e) pour qui vous êtes", type: 'empathique', score: 3, emoji: '❤️' },
      { id: 'b', text: "Être reconnu(e) pour vos compétences et votre travail", type: 'travaillomane', score: 3, emoji: '🏅' },
      { id: 'c', text: "Que l'on reconnaisse vos opinions et votre engagement", type: 'perseverant', score: 3, emoji: '🎖️' },
      { id: 'd', text: "Avoir du temps seul(e) et de l'espace personnel", type: 'reveur', score: 3, emoji: '🏠' },
      { id: 'e', text: "Vivre des sensations fortes et de l'excitation", type: 'promoteur', score: 3, emoji: '🎢' },
      { id: 'f', text: "Avoir des contacts amusants et stimulants", type: 'rebelle', score: 3, emoji: '🎪' }
    ]
  },
  {
    id: 'q12',
    category: 'besoins',
    text: "Quand vous n'allez pas bien, c'est souvent parce que :",
    visualHint: "unmet_needs",
    options: [
      { id: 'a', text: "Vous vous sentez rejeté(e) ou pas aimé(e)", type: 'empathique', score: 3, emoji: '💔' },
      { id: 'b', text: "Vous n'avez pas assez de temps pour bien faire les choses", type: 'travaillomane', score: 3, emoji: '⏰' },
      { id: 'c', text: "Personne n'écoute ce que vous pensez", type: 'perseverant', score: 3, emoji: '🔇' },
      { id: 'd', text: "Il y a trop de bruit, trop de monde, trop de pression", type: 'reveur', score: 3, emoji: '🔊' },
      { id: 'e', text: "Vous vous ennuyez, il ne se passe rien", type: 'promoteur', score: 3, emoji: '😐' },
      { id: 'f', text: "L'ambiance est trop lourde, pas assez fun", type: 'rebelle', score: 3, emoji: '☁️' }
    ]
  },

  // === BLOC 6 : Scénarios de vie quotidienne ===
  {
    id: 'q13',
    category: 'scenarios',
    text: "Vous êtes en retard au travail. Que ressentez-vous ?",
    visualHint: "running_late",
    options: [
      { id: 'a', text: "Vous vous sentez coupable de déranger les autres", type: 'empathique', score: 2, emoji: '😔' },
      { id: 'b', text: "Vous êtes contrarié(e) car vous aimez être ponctuel(le)", type: 'travaillomane', score: 2, emoji: '⌚' },
      { id: 'c', text: "Vous trouvez ça irrespectueux et essayez de prévenir", type: 'perseverant', score: 2, emoji: '📱' },
      { id: 'd', text: "Vous ne stressez pas trop, ça arrive", type: 'reveur', score: 2, emoji: '🤷' },
      { id: 'e', text: "Vous courez et trouvez une solution rapide", type: 'promoteur', score: 2, emoji: '🏃' },
      { id: 'f', text: "Vous en riez et trouvez une excuse originale", type: 'rebelle', score: 2, emoji: '😅' }
    ]
  },
  {
    id: 'q14',
    category: 'scenarios',
    text: "On vous critique sur votre travail. Comment réagissez-vous ?",
    visualHint: "criticism",
    options: [
      { id: 'a', text: "Vous êtes blessé(e) et triste", type: 'empathique', score: 2, emoji: '😢' },
      { id: 'b', text: "Vous demandez des détails précis pour vous améliorer", type: 'travaillomane', score: 2, emoji: '📊' },
      { id: 'c', text: "Vous vous défendez et argumentez", type: 'perseverant', score: 2, emoji: '🛡️' },
      { id: 'd', text: "Vous ne dites rien et vous repliez en silence", type: 'reveur', score: 2, emoji: '🤐' },
      { id: 'e', text: "Vous vous en fichez et passez à autre chose", type: 'promoteur', score: 2, emoji: '💨' },
      { id: 'f', text: "Vous boudez ou faites une blague pour détourner", type: 'rebelle', score: 2, emoji: '🙃' }
    ]
  },
  {
    id: 'q15',
    category: 'scenarios',
    text: "Si vous pouviez choisir votre métier idéal, ce serait :",
    visualHint: "dream_job",
    options: [
      { id: 'a', text: "Infirmier(ère), éducateur(trice), aide-soignant(e)", type: 'empathique', score: 2, emoji: '🏥' },
      { id: 'b', text: "Comptable, ingénieur(e), chercheur(euse)", type: 'travaillomane', score: 2, emoji: '🔬' },
      { id: 'c', text: "Avocat(e), professeur(e), militant(e)", type: 'perseverant', score: 2, emoji: '⚖️' },
      { id: 'd', text: "Artiste, écrivain(e), jardinier(ère)", type: 'reveur', score: 2, emoji: '🌿' },
      { id: 'e', text: "Chef d'entreprise, sportif(ve), pilote", type: 'promoteur', score: 2, emoji: '✈️' },
      { id: 'f', text: "Artiste, DJ, animateur(trice), cuisinier(ère)", type: 'rebelle', score: 2, emoji: '🎧' }
    ]
  }
];

// Profils de référence détaillés avec comportement collectif
const PCM_PROFILES = {
  empathique: {
    name: 'Empathique',
    perception: 'Émotions',
    strengths: ['Chaleureux', 'Sensible', 'Compatissant', 'À l\'écoute'],
    weaknesses: ['Difficulté à dire non', 'Prise de décision lente', 'Trop dépendant du regard des autres', 'Se sacrifie pour les autres'],
    channel: 'Nourricier',
    needs: ['Reconnaissance de la personne', 'Besoins sensoriels'],
    stressLevel1: 'Se suradapte, fait plaisir à tout le monde, n\'ose pas dire non',
    stressLevel2: 'Fait des erreurs inhabituelles, se sent incompétent(e), invite à être rejeté(e)',
    riskFactors: ['Surcharge émotionnelle', 'Difficulté à poser des limites', 'Épuisement par sur-adaptation'],
    managementTips: 'Environnement chaleureux, reconnaissance personnelle, travail en équipe bienveillante',
    collectiveBehavior: {
      integration: 'S\'intègre naturellement au groupe grâce à sa bienveillance et son écoute. Crée facilement des liens avec les collègues.',
      roleInTeam: 'Joue le rôle de médiateur et de soutien émotionnel. Contribue à la cohésion d\'équipe.',
      conflicts: 'Évite les conflits, peut s\'effacer au détriment de ses propres besoins. Risque de ressentiment accumulé.',
      collaboration: 'Excellent(e) en binôme. Travaille mieux dans un environnement harmonieux et sécurisant.',
      riskCollective: 'Peut créer de la dépendance affective au sein de l\'équipe. Sous stress, ses erreurs impactent la productivité du groupe.'
    }
  },
  travaillomane: {
    name: 'Travaillomane (Analyseur)',
    perception: 'Pensées (faits)',
    strengths: ['Logique', 'Responsable', 'Organisé', 'Rigoureux'],
    weaknesses: ['Perfectionnisme', 'Difficulté à déléguer', 'Trop focalisé sur les détails', 'Peut paraître froid'],
    channel: 'Informatif/Interrogatif',
    needs: ['Reconnaissance du travail', 'Structuration du temps'],
    stressLevel1: 'Surcontrôle, perfectionnisme excessif, sur-détaille',
    stressLevel2: 'Pense que les autres sont incompétents, prend tout en charge',
    riskFactors: ['Surmenage', 'Perfectionnisme paralysant', 'Isolement par surcharge'],
    managementTips: 'Instructions claires, reconnaissance du travail, feedback factuel, planning structuré',
    collectiveBehavior: {
      integration: 'S\'intègre par la compétence et la fiabilité. Respecté pour son sérieux mais peut sembler distant.',
      roleInTeam: 'Organise, structure et planifie. Le pilier logistique de l\'équipe.',
      conflicts: 'Peut entrer en conflit avec les profils désorganisés. Critique l\'incompétence perçue.',
      collaboration: 'Travaille efficacement si les rôles et les processus sont clairs.',
      riskCollective: 'Sous stress, surcontrôle l\'équipe et crée des tensions. Peut devenir le goulot d\'étranglement.'
    }
  },
  perseverant: {
    name: 'Persévérant',
    perception: 'Opinions',
    strengths: ['Dévoué', 'Observateur', 'Consciencieux', 'Engagé'],
    weaknesses: ['Rigide dans ses convictions', 'Difficulté à accepter d\'autres points de vue', 'Peut être moralisateur', 'Intolérant'],
    channel: 'Interrogatif/Informatif',
    needs: ['Reconnaissance des opinions', 'Reconnaissance du travail'],
    stressLevel1: 'Devient critique, impose ses convictions, part en croisade',
    stressLevel2: 'Fanatisme, intolérance, rejet de ceux qui ne pensent pas comme lui/elle',
    riskFactors: ['Rigidité relationnelle', 'Conflits de valeurs', 'Frustration face à l\'injustice perçue'],
    managementTips: 'Valoriser les opinions, donner du sens au travail, respecter les valeurs',
    collectiveBehavior: {
      integration: 'S\'intègre quand les valeurs du groupe correspondent aux siennes. Fidèle et fiable.',
      roleInTeam: 'Gardien des valeurs et de l\'éthique. Pousse l\'équipe vers l\'excellence morale.',
      conflicts: 'Conflits fréquents avec ceux qui ne partagent pas ses valeurs. Peut diviser le groupe.',
      collaboration: 'Excellent quand le travail a du sens. Démotivé par les tâches qu\'il juge inutiles.',
      riskCollective: 'Sous stress, impose ses croyances et crée un climat d\'intolérance. Risque de clivage dans l\'équipe.'
    }
  },
  reveur: {
    name: 'Rêveur (Imagineur)',
    perception: 'Imagination (inaction)',
    strengths: ['Calme', 'Imaginatif', 'Réfléchi', 'Patient'],
    weaknesses: ['Passif', 'Difficulté à prendre des initiatives', 'Communication limitée', 'Peut sembler détaché'],
    channel: 'Directif',
    needs: ['Solitude', 'Espace personnel'],
    stressLevel1: 'Se retire, attend passivement, attend qu\'on lui dise quoi faire',
    stressLevel2: 'Repli total, incapacité à agir, s\'exclut du groupe',
    riskFactors: ['Isolement social', 'Passivité', 'Difficulté à demander de l\'aide'],
    managementTips: 'Directives claires et courtes, temps de solitude, ne pas mettre la pression sociale',
    collectiveBehavior: {
      integration: 'S\'intègre discrètement. Ne cherche pas à être au centre de l\'attention. Calme apaisant.',
      roleInTeam: 'Apporte de la sérénité et de la réflexion. Exécute les tâches individuelles avec fiabilité.',
      conflicts: 'Évite tout conflit. Se retire en cas de tension. Ne s\'exprime pas sur les problèmes.',
      collaboration: 'Préfère les tâches individuelles. Peut avoir du mal en équipe bruyante ou agitée.',
      riskCollective: 'Sous stress, se déconnecte du groupe. Son retrait peut être interprété comme du désintérêt, créant des malentendus.'
    }
  },
  promoteur: {
    name: 'Promoteur (Energiseur)',
    perception: 'Actions',
    strengths: ['Adaptable', 'Charmeur', 'Plein de ressources', 'Direct'],
    weaknesses: ['Impatient', 'Peut manipuler', 'Difficulté avec la routine', 'Prend des risques excessifs'],
    channel: 'Directif',
    needs: ['Excitation', 'Sensations fortes'],
    stressLevel1: 'Manipule, crée du drame, attend que les autres se débrouillent',
    stressLevel2: 'Prend des risques dangereux, provoque les conflits, agression',
    riskFactors: ['Prise de risques inconsidérée', 'Manipulation relationnelle', 'Conflits violents'],
    managementTips: 'Challenges et défis, autonomie, pas de micro-management, environnement stimulant',
    collectiveBehavior: {
      integration: 'S\'impose rapidement comme leader naturel. Charisme et énergie attirent l\'attention.',
      roleInTeam: 'Moteur de l\'action. Pousse l\'équipe à avancer et à prendre des décisions rapides.',
      conflicts: 'Peut provoquer des conflits par sa franchise ou sa manipulation. Teste les limites.',
      collaboration: 'Efficace dans les situations de crise. S\'ennuie dans la routine.',
      riskCollective: 'PROFIL À SURVEILLER - Sous stress, peut manipuler les collègues ou provoquer des situations dangereuses. Risque d\'accident ou de conflit physique.'
    }
  },
  rebelle: {
    name: 'Rebelle (Energiseur ludique)',
    perception: 'Réactions (j\'aime/j\'aime pas)',
    strengths: ['Créatif', 'Spontané', 'Ludique', 'Expressif'],
    weaknesses: ['Instable', 'Difficulté avec l\'autorité', 'Rejette la responsabilité', 'Inconstant'],
    channel: 'Émotif/Ludique',
    needs: ['Contacts ludiques', 'Stimulation'],
    stressLevel1: 'Râle, blâme les autres ("c\'est pas ma faute"), fait la tête',
    stressLevel2: 'Provocation, sabotage, vengeance passive',
    riskFactors: ['Conflits avec l\'autorité', 'Instabilité', 'Rejet des règles'],
    managementTips: 'Ambiance détendue, humour, variété des tâches, contacts stimulants',
    collectiveBehavior: {
      integration: 'Apporte de la bonne humeur et de l\'énergie. S\'intègre vite si l\'ambiance est détendue.',
      roleInTeam: 'Créatif et source d\'énergie positive. Dynamise le groupe par son humour.',
      conflicts: 'Conflits avec les profils autoritaires ou trop stricts. Rejette les règles rigides.',
      collaboration: 'Excellent quand le travail est varié et ludique. Décroche si c\'est monotone.',
      riskCollective: 'Sous stress, peut saboter le travail d\'équipe ou blâmer les collègues. Sa provocation peut dégrader l\'ambiance collective.'
    }
  }
};

/**
 * Calcule les scores PCM à partir des réponses
 */
function calculateScores(responses) {
  const scores = {
    empathique: 0,
    travaillomane: 0,
    perseverant: 0,
    reveur: 0,
    promoteur: 0,
    rebelle: 0
  };

  let maxPossible = 0;

  responses.forEach(response => {
    const question = PCM_QUESTIONS.find(q => q.id === response.questionId);
    if (!question) return;

    const selectedOption = question.options.find(o => o.id === response.answer);
    if (!selectedOption) return;

    scores[selectedOption.type] += selectedOption.score;
    maxPossible += 3;
  });

  // Normaliser sur 100
  if (maxPossible > 0) {
    const factor = 100 / maxPossible;
    Object.keys(scores).forEach(type => {
      scores[type] = Math.round(scores[type] * factor);
    });
  }

  return scores;
}

/**
 * Détermine la base et la phase PCM
 */
function determineBaseAndPhase(scores, responses) {
  const sortedTypes = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);

  const baseType = sortedTypes[0][0];

  // La phase se détermine par les questions de stress et besoins actuels
  const phaseQuestions = responses.filter(r => {
    const q = PCM_QUESTIONS.find(q => q.id === r.questionId);
    return q && (q.category === 'stress' || q.category === 'besoins');
  });

  const phaseScores = { ...scores };
  phaseQuestions.forEach(response => {
    const question = PCM_QUESTIONS.find(q => q.id === response.questionId);
    if (!question) return;
    const selectedOption = question.options.find(o => o.id === response.answer);
    if (!selectedOption) return;
    phaseScores[selectedOption.type] += selectedOption.score * 2;
  });

  const sortedPhase = Object.entries(phaseScores)
    .sort(([, a], [, b]) => b - a);

  const phaseType = sortedPhase[0][0];

  return { baseType, phaseType };
}

/**
 * Analyse les comportements sous stress
 */
function analyzeStressBehaviors(baseType, phaseType) {
  const baseProfile = PCM_PROFILES[baseType];
  const phaseProfile = PCM_PROFILES[phaseType];

  return {
    stressNiveau1: baseProfile.stressLevel1,
    stressNiveau2: baseProfile.stressLevel2,
    phaseCourante: phaseProfile.stressLevel1,
    signesAlerte: [
      `En stress léger (base ${baseProfile.name}): ${baseProfile.stressLevel1}`,
      `En stress fort (phase ${phaseProfile.name}): ${phaseProfile.stressLevel2}`
    ]
  };
}

/**
 * Évalue les facteurs de risque RPS
 */
function evaluateRiskFactors(baseType, phaseType, scores) {
  const baseProfile = PCM_PROFILES[baseType];
  const phaseProfile = PCM_PROFILES[phaseType];

  const allRisks = [...new Set([...baseProfile.riskFactors, ...phaseProfile.riskFactors])];

  const dominance = scores[baseType] - (Object.values(scores).reduce((a, b) => a + b, 0) / 6);
  const riskLevel = dominance > 30 ? 'élevé' : dominance > 15 ? 'modéré' : 'faible';

  return {
    niveau: riskLevel,
    facteurs: allRisks,
    recommandationsManagement: baseProfile.managementTips,
    recommandationsPhase: phaseProfile.managementTips
  };
}

/**
 * Identifie les incompatibilités potentielles avec d'autres profils
 */
function identifyIncompatibilities(baseType) {
  const incompatibilityMap = {
    empathique: ['promoteur'],
    travaillomane: ['rebelle'],
    perseverant: ['rebelle', 'promoteur'],
    reveur: ['promoteur', 'rebelle'],
    promoteur: ['empathique', 'reveur', 'perseverant'],
    rebelle: ['perseverant', 'travaillomane']
  };

  return {
    profilsVigilance: (incompatibilityMap[baseType] || []).map(type => ({
      type,
      nom: PCM_PROFILES[type].name,
      raison: `Différence de perception (${PCM_PROFILES[baseType].perception} vs ${PCM_PROFILES[type].perception})`
    })),
    profilsComplementaires: Object.keys(PCM_PROFILES)
      .filter(t => t !== baseType && !(incompatibilityMap[baseType] || []).includes(t))
      .map(type => ({
        type,
        nom: PCM_PROFILES[type].name
      }))
  };
}

/**
 * Analyse le comportement en milieu collectif
 */
function analyzeCollectiveBehavior(baseType, phaseType, scores) {
  const baseProfile = PCM_PROFILES[baseType];
  const phaseProfile = PCM_PROFILES[phaseType];
  const sameBaseAndPhase = baseType === phaseType;

  const collective = baseProfile.collectiveBehavior;

  let riskAlert = null;

  // Détection des profils à risque individuel ou collectif
  if (baseType === 'promoteur' || phaseType === 'promoteur') {
    riskAlert = {
      level: 'attention',
      type: 'individuel_et_collectif',
      message: `Profil Promoteur ${baseType === 'promoteur' ? '(base)' : '(phase)'} : sous stress, risque de manipulation, de prise de risques inconsidérée ou de comportement agressif. Vigilance accrue en environnement collectif.`
    };
  } else if (baseType === 'rebelle' && phaseType !== 'rebelle') {
    riskAlert = {
      level: 'modere',
      type: 'collectif',
      message: `Profil Rebelle en phase ${phaseProfile.name} : peut générer des tensions avec l'autorité et les règles. Le passage en phase ${phaseProfile.name} accentue ${phaseProfile.stressLevel1.toLowerCase()}.`
    };
  } else if (baseType === 'reveur' && scores.reveur > 60) {
    riskAlert = {
      level: 'modere',
      type: 'individuel',
      message: `Profil Rêveur dominant (${scores.reveur}%) : risque d'isolement important en milieu collectif. Nécessite un encadrement directif et bienveillant.`
    };
  }

  if (!sameBaseAndPhase && phaseType === 'promoteur' && !riskAlert) {
    riskAlert = {
      level: 'attention',
      type: 'individuel_et_collectif',
      message: `Base ${baseProfile.name} en phase Promoteur : la personne traverse une phase où elle recherche l'excitation et peut prendre des risques. Combiné avec sa base ${baseProfile.name}, cela crée une situation à surveiller en environnement collectif.`
    };
  }

  return {
    integration: collective.integration,
    roleEquipe: collective.roleInTeam,
    gestionConflits: collective.conflicts,
    collaboration: collective.collaboration,
    risqueCollectif: collective.riskCollective,
    risqueAlerte: riskAlert
  };
}

/**
 * Analyse les forces et faiblesses détaillées
 */
function analyzeStrengthsWeaknesses(baseType, phaseType) {
  const baseProfile = PCM_PROFILES[baseType];
  const phaseProfile = PCM_PROFILES[phaseType];
  const sameBaseAndPhase = baseType === phaseType;

  const strengths = [...baseProfile.strengths];
  const weaknesses = [...baseProfile.weaknesses];

  if (!sameBaseAndPhase) {
    phaseProfile.strengths.forEach(s => {
      if (!strengths.includes(s)) strengths.push(s);
    });
    phaseProfile.weaknesses.forEach(w => {
      if (!weaknesses.includes(w)) weaknesses.push(w);
    });
  }

  return {
    forces: strengths,
    faiblesses: weaknesses,
    contexteForces: `En tant que ${baseProfile.name}, la personne excelle dans un environnement qui valorise ${baseProfile.perception.toLowerCase()}. ${baseProfile.managementTips}.`,
    contexteFaiblesses: `Sous pression, les faiblesses se manifestent : ${baseProfile.stressLevel1}. Si la situation perdure : ${baseProfile.stressLevel2}.`
  };
}

/**
 * Génère la synthèse complète enrichie du test
 */
function generateSummary(baseType, phaseType, scores, collectiveBehavior, strengthsWeaknesses) {
  const baseProfile = PCM_PROFILES[baseType];
  const phaseProfile = PCM_PROFILES[phaseType];
  const sameBaseAndPhase = baseType === phaseType;

  let summary = `## Profil de personnalité PCM\n\n`;
  summary += `**Type de base : ${baseProfile.name}**\n`;
  summary += `Perception dominante : ${baseProfile.perception}\n`;
  summary += `Canal de communication préféré : ${baseProfile.channel}\n`;
  summary += `Besoins psychologiques : ${baseProfile.needs.join(', ')}\n\n`;

  if (!sameBaseAndPhase) {
    summary += `**Phase actuelle : ${phaseProfile.name}**\n`;
    summary += `La personne traverse actuellement une phase ${phaseProfile.name}, `;
    summary += `ce qui signifie que ses motivations actuelles sont liées à : ${phaseProfile.needs.join(', ')}.\n\n`;
  } else {
    summary += `La personne est en phase de base, ses motivations sont stables.\n\n`;
  }

  // Forces et faiblesses
  summary += `### Forces\n`;
  strengthsWeaknesses.forces.forEach(f => { summary += `- ${f}\n`; });
  summary += `\n${strengthsWeaknesses.contexteForces}\n\n`;

  summary += `### Faiblesses\n`;
  strengthsWeaknesses.faiblesses.forEach(f => { summary += `- ${f}\n`; });
  summary += `\n${strengthsWeaknesses.contexteFaiblesses}\n\n`;

  // Comportement en milieu collectif
  summary += `### Comportement en milieu collectif\n`;
  summary += `**Intégration** : ${collectiveBehavior.integration}\n`;
  summary += `**Rôle dans l'équipe** : ${collectiveBehavior.roleEquipe}\n`;
  summary += `**Gestion des conflits** : ${collectiveBehavior.gestionConflits}\n`;
  summary += `**Mode de collaboration** : ${collectiveBehavior.collaboration}\n\n`;

  // Comportements sous stress
  summary += `### Comportements sous stress\n`;
  summary += `**Stress léger (niveau 1)** : ${baseProfile.stressLevel1}\n`;
  summary += `**Stress fort (niveau 2)** : ${baseProfile.stressLevel2}\n\n`;

  // Alerte risque
  if (collectiveBehavior.risqueAlerte) {
    const alert = collectiveBehavior.risqueAlerte;
    summary += `### ALERTE PROFIL À RISQUE (${alert.type})\n`;
    summary += `Niveau : ${alert.level}\n`;
    summary += `${alert.message}\n\n`;
  }

  // Recommandations de management
  summary += `### Recommandations de management\n`;
  summary += `${baseProfile.managementTips}\n`;
  if (!sameBaseAndPhase) {
    summary += `\nEn phase ${phaseProfile.name} : ${phaseProfile.managementTips}\n`;
  }
  summary += `\n`;

  // Scores détaillés
  summary += `### Scores détaillés\n`;
  Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, score]) => {
      summary += `- ${PCM_PROFILES[type].name} : ${score}%\n`;
    });

  return summary;
}

/**
 * Traite l'ensemble des résultats du test
 */
function processTestResults(responses) {
  const scores = calculateScores(responses);
  const { baseType, phaseType } = determineBaseAndPhase(scores, responses);
  const stressBehaviors = analyzeStressBehaviors(baseType, phaseType);
  const riskFactors = evaluateRiskFactors(baseType, phaseType, scores);
  const incompatibilities = identifyIncompatibilities(baseType);
  const collectiveBehavior = analyzeCollectiveBehavior(baseType, phaseType, scores);
  const strengthsWeaknesses = analyzeStrengthsWeaknesses(baseType, phaseType);
  const summary = generateSummary(baseType, phaseType, scores, collectiveBehavior, strengthsWeaknesses);

  return {
    scores,
    baseType,
    phaseType,
    stressBehaviors,
    riskFactors,
    incompatibilities,
    collectiveBehavior,
    strengthsWeaknesses,
    summary
  };
}

module.exports = {
  PCM_QUESTIONS,
  PCM_PROFILES,
  processTestResults,
  calculateScores
};
