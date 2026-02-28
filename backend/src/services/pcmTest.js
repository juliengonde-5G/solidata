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
// Questions simples, vie privée et professionnelle
const PCM_QUESTIONS = [
  // === BLOC 1 : Perception du monde (identifier la base) ===
  {
    id: 'q1',
    category: 'perception',
    text: "Quand vous rencontrez quelqu'un pour la première fois, qu'est-ce qui est le plus important pour vous ?",
    visualHint: "people_meeting",
    options: [
      { id: 'a', text: "Que la personne soit gentille et chaleureuse", type: 'empathique', score: 3 },
      { id: 'b', text: "Que la personne soit sérieuse et organisée", type: 'travaillomane', score: 3 },
      { id: 'c', text: "Que la personne ait de bonnes valeurs", type: 'perseverant', score: 3 },
      { id: 'd', text: "Que la personne me laisse tranquille", type: 'reveur', score: 3 },
      { id: 'e', text: "Que la personne soit dynamique et efficace", type: 'promoteur', score: 3 },
      { id: 'f', text: "Que la personne soit drôle et amusante", type: 'rebelle', score: 3 }
    ]
  },
  {
    id: 'q2',
    category: 'perception',
    text: "Quand vous êtes content(e), c'est surtout parce que :",
    visualHint: "happy_person",
    options: [
      { id: 'a', text: "Vous êtes entouré(e) de gens que vous aimez", type: 'empathique', score: 3 },
      { id: 'b', text: "Vous avez bien fait votre travail", type: 'travaillomane', score: 3 },
      { id: 'c', text: "Vous avez aidé quelqu'un ou fait quelque chose de juste", type: 'perseverant', score: 3 },
      { id: 'd', text: "Vous avez eu du temps pour vous, au calme", type: 'reveur', score: 3 },
      { id: 'e', text: "Vous avez relevé un défi", type: 'promoteur', score: 3 },
      { id: 'f', text: "Vous avez ri et vous êtes amusé(e)", type: 'rebelle', score: 3 }
    ]
  },
  {
    id: 'q3',
    category: 'perception',
    text: "Un bon week-end pour vous, c'est :",
    visualHint: "weekend",
    options: [
      { id: 'a', text: "Passer du temps avec la famille ou les amis", type: 'empathique', score: 2 },
      { id: 'b', text: "Ranger, organiser, faire des choses utiles", type: 'travaillomane', score: 2 },
      { id: 'c', text: "Faire une activité qui a du sens (bénévolat, lecture...)", type: 'perseverant', score: 2 },
      { id: 'd', text: "Ne rien faire, rêver, être tranquille", type: 'reveur', score: 2 },
      { id: 'e', text: "Faire du sport, une sortie, une aventure", type: 'promoteur', score: 2 },
      { id: 'f', text: "Aller à une fête, voir des spectacles, s'amuser", type: 'rebelle', score: 2 }
    ]
  },

  // === BLOC 2 : Réactions au travail (confirmer base + identifier phase) ===
  {
    id: 'q4',
    category: 'travail',
    text: "Au travail, ce qui vous motive le plus c'est :",
    visualHint: "work_motivation",
    options: [
      { id: 'a', text: "L'ambiance et les collègues", type: 'empathique', score: 3 },
      { id: 'b', text: "Être reconnu(e) pour la qualité de votre travail", type: 'travaillomane', score: 3 },
      { id: 'c', text: "Sentir que votre travail est utile et important", type: 'perseverant', score: 3 },
      { id: 'd', text: "Avoir des consignes claires et du temps pour travailler", type: 'reveur', score: 3 },
      { id: 'e', text: "Avoir des responsabilités et de l'autonomie", type: 'promoteur', score: 3 },
      { id: 'f', text: "Que le travail soit varié et pas ennuyeux", type: 'rebelle', score: 3 }
    ]
  },
  {
    id: 'q5',
    category: 'travail',
    text: "Quand on vous donne une tâche à faire, vous préférez :",
    visualHint: "task_given",
    options: [
      { id: 'a', text: "Le faire en équipe, ensemble", type: 'empathique', score: 2 },
      { id: 'b', text: "Avoir des instructions précises et un planning", type: 'travaillomane', score: 2 },
      { id: 'c', text: "Comprendre pourquoi c'est important avant de commencer", type: 'perseverant', score: 2 },
      { id: 'd', text: "Qu'on vous laisse le faire seul(e) à votre rythme", type: 'reveur', score: 2 },
      { id: 'e', text: "Qu'on vous fasse confiance sans tout contrôler", type: 'promoteur', score: 2 },
      { id: 'f', text: "Que ce soit amusant ou qu'il y ait un jeu", type: 'rebelle', score: 2 }
    ]
  },
  {
    id: 'q6',
    category: 'travail',
    text: "Qu'est-ce qui vous dérange le plus au travail ?",
    visualHint: "work_frustration",
    options: [
      { id: 'a', text: "Les conflits entre les personnes", type: 'empathique', score: 2 },
      { id: 'b', text: "Le désordre, quand c'est mal organisé", type: 'travaillomane', score: 2 },
      { id: 'c', text: "L'injustice ou le manque de respect", type: 'perseverant', score: 2 },
      { id: 'd', text: "Qu'on me mette la pression ou qu'on me parle fort", type: 'reveur', score: 2 },
      { id: 'e', text: "L'ennui, faire toujours la même chose", type: 'promoteur', score: 2 },
      { id: 'f', text: "Les règles trop strictes et les gens trop sérieux", type: 'rebelle', score: 2 }
    ]
  },

  // === BLOC 3 : Comportements sous stress (1er degré) ===
  {
    id: 'q7',
    category: 'stress',
    text: "Quand vous êtes un peu stressé(e), vous avez tendance à :",
    visualHint: "mild_stress",
    options: [
      { id: 'a', text: "Vous occuper des autres avant vous-même, trop en faire", type: 'empathique', score: 3 },
      { id: 'b', text: "Tout contrôler, devenir trop exigeant(e)", type: 'travaillomane', score: 3 },
      { id: 'c', text: "Critiquer les autres, donner des leçons", type: 'perseverant', score: 3 },
      { id: 'd', text: "Vous replier sur vous, attendre que ça passe", type: 'reveur', score: 3 },
      { id: 'e', text: "Manipuler la situation pour obtenir ce que vous voulez", type: 'promoteur', score: 3 },
      { id: 'f', text: "Rejeter la faute sur les autres, râler", type: 'rebelle', score: 3 }
    ]
  },
  {
    id: 'q8',
    category: 'stress',
    text: "Quand vous êtes très stressé(e), que faites-vous ?",
    visualHint: "high_stress",
    options: [
      { id: 'a', text: "Vous faites des erreurs bêtes, vous vous sentez nul(le)", type: 'empathique', score: 3 },
      { id: 'b', text: "Vous pensez que les autres sont incompétents", type: 'travaillomane', score: 3 },
      { id: 'c', text: "Vous imposez vos idées sans écouter", type: 'perseverant', score: 3 },
      { id: 'd', text: "Vous ne faites plus rien, vous êtes bloqué(e)", type: 'reveur', score: 3 },
      { id: 'e', text: "Vous devenez agressif(ve) ou prenez des risques", type: 'promoteur', score: 3 },
      { id: 'f', text: "Vous vous vengez ou sabotez les choses", type: 'rebelle', score: 3 }
    ]
  },

  // === BLOC 4 : Relations et vie privée (affiner la phase) ===
  {
    id: 'q9',
    category: 'relations',
    text: "Dans vos relations avec les autres, vous aimez surtout :",
    visualHint: "relationships",
    options: [
      { id: 'a', text: "Prendre soin des autres, être proche", type: 'empathique', score: 2 },
      { id: 'b', text: "Échanger des idées, discuter de sujets intéressants", type: 'travaillomane', score: 2 },
      { id: 'c', text: "Partager vos convictions, défendre vos valeurs", type: 'perseverant', score: 2 },
      { id: 'd', text: "Avoir des moments de silence ensemble", type: 'reveur', score: 2 },
      { id: 'e', text: "Faire des choses ensemble, de l'action", type: 'promoteur', score: 2 },
      { id: 'f', text: "Rigoler, plaisanter, ne pas se prendre au sérieux", type: 'rebelle', score: 2 }
    ]
  },
  {
    id: 'q10',
    category: 'relations',
    text: "Comment réagissez-vous quand quelqu'un est triste ?",
    visualHint: "comforting",
    options: [
      { id: 'a', text: "Vous le prenez dans vos bras, vous êtes très touché(e)", type: 'empathique', score: 2 },
      { id: 'b', text: "Vous essayez de trouver une solution à son problème", type: 'travaillomane', score: 2 },
      { id: 'c', text: "Vous lui donnez des conseils basés sur vos expériences", type: 'perseverant', score: 2 },
      { id: 'd', text: "Vous restez là sans rien dire, juste présent(e)", type: 'reveur', score: 2 },
      { id: 'e', text: "Vous l'emmenez faire quelque chose pour changer les idées", type: 'promoteur', score: 2 },
      { id: 'f', text: "Vous essayez de le faire rire", type: 'rebelle', score: 2 }
    ]
  },

  // === BLOC 5 : Besoins psychologiques (confirmer phase + RPS) ===
  {
    id: 'q11',
    category: 'besoins',
    text: "De quoi avez-vous le plus besoin pour vous sentir bien ?",
    visualHint: "needs",
    options: [
      { id: 'a', text: "Être aimé(e) et apprécié(e) pour qui vous êtes", type: 'empathique', score: 3 },
      { id: 'b', text: "Être reconnu(e) pour vos compétences et votre travail", type: 'travaillomane', score: 3 },
      { id: 'c', text: "Que l'on reconnaisse vos opinions et votre engagement", type: 'perseverant', score: 3 },
      { id: 'd', text: "Avoir du temps seul(e) et de l'espace personnel", type: 'reveur', score: 3 },
      { id: 'e', text: "Vivre des sensations fortes et de l'excitation", type: 'promoteur', score: 3 },
      { id: 'f', text: "Avoir des contacts amusants et stimulants", type: 'rebelle', score: 3 }
    ]
  },
  {
    id: 'q12',
    category: 'besoins',
    text: "Quand vous n'allez pas bien, c'est souvent parce que :",
    visualHint: "unmet_needs",
    options: [
      { id: 'a', text: "Vous vous sentez rejeté(e) ou pas aimé(e)", type: 'empathique', score: 3 },
      { id: 'b', text: "Vous n'avez pas assez de temps pour bien faire les choses", type: 'travaillomane', score: 3 },
      { id: 'c', text: "Personne n'écoute ce que vous pensez", type: 'perseverant', score: 3 },
      { id: 'd', text: "Il y a trop de bruit, trop de monde, trop de pression", type: 'reveur', score: 3 },
      { id: 'e', text: "Vous vous ennuyez, il ne se passe rien", type: 'promoteur', score: 3 },
      { id: 'f', text: "L'ambiance est trop lourde, pas assez fun", type: 'rebelle', score: 3 }
    ]
  },

  // === BLOC 6 : Scénarios de vie quotidienne ===
  {
    id: 'q13',
    category: 'scenarios',
    text: "Vous êtes en retard au travail. Que ressentez-vous ?",
    visualHint: "running_late",
    options: [
      { id: 'a', text: "Vous vous sentez coupable de déranger les autres", type: 'empathique', score: 2 },
      { id: 'b', text: "Vous êtes contrarié(e) car vous aimez être ponctuel(le)", type: 'travaillomane', score: 2 },
      { id: 'c', text: "Vous trouvez ça irrespectueux et essayez de prévenir", type: 'perseverant', score: 2 },
      { id: 'd', text: "Vous ne stressez pas trop, ça arrive", type: 'reveur', score: 2 },
      { id: 'e', text: "Vous courez et trouvez une solution rapide", type: 'promoteur', score: 2 },
      { id: 'f', text: "Vous en riez et trouvez une excuse originale", type: 'rebelle', score: 2 }
    ]
  },
  {
    id: 'q14',
    category: 'scenarios',
    text: "On vous critique sur votre travail. Comment réagissez-vous ?",
    visualHint: "criticism",
    options: [
      { id: 'a', text: "Vous êtes blessé(e) et triste", type: 'empathique', score: 2 },
      { id: 'b', text: "Vous demandez des détails précis pour vous améliorer", type: 'travaillomane', score: 2 },
      { id: 'c', text: "Vous vous défendez et argumentez", type: 'perseverant', score: 2 },
      { id: 'd', text: "Vous ne dites rien et vous repliez en silence", type: 'reveur', score: 2 },
      { id: 'e', text: "Vous vous en fichez et passez à autre chose", type: 'promoteur', score: 2 },
      { id: 'f', text: "Vous boudez ou faites une blague pour détourner", type: 'rebelle', score: 2 }
    ]
  },
  {
    id: 'q15',
    category: 'scenarios',
    text: "Si vous pouviez choisir votre métier idéal, ce serait :",
    visualHint: "dream_job",
    options: [
      { id: 'a', text: "Infirmier(ère), éducateur(trice), aide-soignant(e)", type: 'empathique', score: 2 },
      { id: 'b', text: "Comptable, ingénieur(e), chercheur(euse)", type: 'travaillomane', score: 2 },
      { id: 'c', text: "Avocat(e), professeur(e), militant(e)", type: 'perseverant', score: 2 },
      { id: 'd', text: "Artiste, écrivain(e), jardinier(ère)", type: 'reveur', score: 2 },
      { id: 'e', text: "Chef d'entreprise, sportif(ve), pilote", type: 'promoteur', score: 2 },
      { id: 'f', text: "Artiste, DJ, animateur(trice), cuisinier(ère)", type: 'rebelle', score: 2 }
    ]
  }
];

// Profils de référence détaillés
const PCM_PROFILES = {
  empathique: {
    name: 'Empathique',
    perception: 'Émotions',
    strengths: ['Chaleureux', 'Sensible', 'Compatissant', 'À l\'écoute'],
    channel: 'Nourricier',
    needs: ['Reconnaissance de la personne', 'Besoins sensoriels'],
    stressLevel1: 'Se suradapte, fait plaisir à tout le monde, n\'ose pas dire non',
    stressLevel2: 'Fait des erreurs inhabituelles, se sent incompétent(e), invite à être rejeté(e)',
    riskFactors: ['Surcharge émotionnelle', 'Difficulté à poser des limites', 'Épuisement par sur-adaptation'],
    managementTips: 'Environnement chaleureux, reconnaissance personnelle, travail en équipe bienveillante'
  },
  travaillomane: {
    name: 'Travaillomane (Analyseur)',
    perception: 'Pensées (faits)',
    strengths: ['Logique', 'Responsable', 'Organisé', 'Rigoureux'],
    channel: 'Informatif/Interrogatif',
    needs: ['Reconnaissance du travail', 'Structuration du temps'],
    stressLevel1: 'Surcontrôle, perfectionnisme excessif, sur-détaille',
    stressLevel2: 'Pense que les autres sont incompétents, prend tout en charge',
    riskFactors: ['Surmenage', 'Perfectionnisme paralysant', 'Isolement par surcharge'],
    managementTips: 'Instructions claires, reconnaissance du travail, feedback factuel, planning structuré'
  },
  perseverant: {
    name: 'Persévérant',
    perception: 'Opinions',
    strengths: ['Dévoué', 'Observateur', 'Consciencieux', 'Engagé'],
    channel: 'Interrogatif/Informatif',
    needs: ['Reconnaissance des opinions', 'Reconnaissance du travail'],
    stressLevel1: 'Devient critique, impose ses convictions, part en croisade',
    stressLevel2: 'Fanatisme, intolérance, rejet de ceux qui ne pensent pas comme lui/elle',
    riskFactors: ['Rigidité relationnelle', 'Conflits de valeurs', 'Frustration face à l\'injustice perçue'],
    managementTips: 'Valoriser les opinions, donner du sens au travail, respecter les valeurs'
  },
  reveur: {
    name: 'Rêveur (Imagineur)',
    perception: 'Imagination (inaction)',
    strengths: ['Calme', 'Imaginatif', 'Réfléchi', 'Patient'],
    channel: 'Directif',
    needs: ['Solitude', 'Espace personnel'],
    stressLevel1: 'Se retire, attend passivement, attend qu\'on lui dise quoi faire',
    stressLevel2: 'Repli total, incapacité à agir, s\'exclut du groupe',
    riskFactors: ['Isolement social', 'Passivité', 'Difficulté à demander de l\'aide'],
    managementTips: 'Directives claires et courtes, temps de solitude, ne pas mettre la pression sociale'
  },
  promoteur: {
    name: 'Promoteur (Energiseur)',
    perception: 'Actions',
    strengths: ['Adaptable', 'Charmeur', 'Plein de ressources', 'Direct'],
    channel: 'Directif',
    needs: ['Excitation', 'Sensations fortes'],
    stressLevel1: 'Manipule, crée du drame, attend que les autres se débrouillent',
    stressLevel2: 'Prend des risques dangereux, provoque les conflits, agression',
    riskFactors: ['Prise de risques inconsidérée', 'Manipulation relationnelle', 'Conflits violents'],
    managementTips: 'Challenges et défis, autonomie, pas de micro-management, environnement stimulant'
  },
  rebelle: {
    name: 'Rebelle (Energiseur ludique)',
    perception: 'Réactions (j\'aime/j\'aime pas)',
    strengths: ['Créatif', 'Spontané', 'Ludique', 'Expressif'],
    channel: 'Émotif/Ludique',
    needs: ['Contacts ludiques', 'Stimulation'],
    stressLevel1: 'Râle, blâme les autres ("c\'est pas ma faute"), fait la tête',
    stressLevel2: 'Provocation, sabotage, vengeance passive',
    riskFactors: ['Conflits avec l\'autorité', 'Instabilité', 'Rejet des règles'],
    managementTips: 'Ambiance détendue, humour, variété des tâches, contacts stimulants'
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
    maxPossible += 3; // score max par question
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
  // Pondérer davantage les réponses stress/besoins pour la phase
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

  // Niveau de risque global
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
 * Génère la synthèse complète du test
 */
function generateSummary(baseType, phaseType, scores) {
  const baseProfile = PCM_PROFILES[baseType];
  const phaseProfile = PCM_PROFILES[phaseType];

  const sameBaseAndPhase = baseType === phaseType;

  let summary = `## Profil de personnalité PCM\n\n`;
  summary += `**Type de base : ${baseProfile.name}**\n`;
  summary += `Perception dominante : ${baseProfile.perception}\n`;
  summary += `Points forts : ${baseProfile.strengths.join(', ')}\n`;
  summary += `Canal de communication préféré : ${baseProfile.channel}\n`;
  summary += `Besoins psychologiques : ${baseProfile.needs.join(', ')}\n\n`;

  if (!sameBaseAndPhase) {
    summary += `**Phase actuelle : ${phaseProfile.name}**\n`;
    summary += `La personne traverse actuellement une phase ${phaseProfile.name}, `;
    summary += `ce qui signifie que ses motivations actuelles sont liées à : ${phaseProfile.needs.join(', ')}.\n\n`;
  } else {
    summary += `La personne est en phase de base, ses motivations sont stables.\n\n`;
  }

  summary += `### Recommandations de management\n`;
  summary += `${baseProfile.managementTips}\n\n`;

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
  const summary = generateSummary(baseType, phaseType, scores);

  return {
    scores,
    baseType,
    phaseType,
    stressBehaviors,
    riskFactors,
    incompatibilities,
    summary
  };
}

module.exports = {
  PCM_QUESTIONS,
  PCM_PROFILES,
  processTestResults,
  calculateScores
};
