import json
import os

PCM_DATA_PATH = os.path.join(os.path.dirname(__file__), "pcm_data.json")


def _load_pcm_data():
    if os.path.exists(PCM_DATA_PATH):
        with open(PCM_DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return _default_pcm_data()


def _default_pcm_data():
    """Données PCM par défaut si le fichier JSON n'existe pas."""
    types = {
        "analyseur": {
            "label": "Analyseur",
            "ancien": "Travaillomane",
            "emoji": "🔍",
            "color": "#2196F3",
            "perception": "Pensées factuelles",
            "canal": "Interrogatif/Informatif",
            "besoin": "Reconnaissance du travail et structuration du temps",
            "driver": "Sois parfait",
            "masque_stress": "Surcontrôle",
            "description": "Logique, organisé, responsable. Observe, classe, identifie les données.",
        },
        "perseverant": {
            "label": "Persévérant",
            "emoji": "⚖️",
            "color": "#9C27B0",
            "perception": "Opinions",
            "canal": "Interrogatif/Informatif",
            "besoin": "Reconnaissance des opinions et engagement",
            "driver": "Sois parfait pour moi",
            "masque_stress": "Croisade",
            "description": "Engagé, observateur, consciencieux. Évalue et juge selon ses valeurs.",
        },
        "empathique": {
            "label": "Empathique",
            "emoji": "💛",
            "color": "#FF9800",
            "perception": "Émotions",
            "canal": "Nourricier",
            "besoin": "Reconnaissance en tant que personne et satisfaction sensorielle",
            "driver": "Fais plaisir",
            "masque_stress": "Suradaptation",
            "description": "Chaleureux, sensible, compatissant. Ressent le monde par les émotions.",
        },
        "imagineur": {
            "label": "Imagineur",
            "ancien": "Rêveur",
            "emoji": "🌙",
            "color": "#795548",
            "perception": "Imagination",
            "canal": "Directif",
            "besoin": "Solitude et direction claire",
            "driver": "Sois fort pour moi",
            "masque_stress": "Retrait",
            "description": "Calme, imaginatif, réfléchi. Explore le monde intérieur et l'imaginaire.",
        },
        "energiseur": {
            "label": "Énergiseur",
            "ancien": "Rebelle",
            "emoji": "⚡",
            "color": "#4CAF50",
            "perception": "Réactions",
            "canal": "Ludique/Émotif",
            "besoin": "Contact ludique et stimulation",
            "driver": "Fais effort",
            "masque_stress": "Blâme",
            "description": "Spontané, créatif, ludique. Réagit au monde par le fun et l'énergie.",
        },
        "promoteur": {
            "label": "Promoteur",
            "emoji": "🚀",
            "color": "#F44336",
            "perception": "Actions",
            "canal": "Directif",
            "besoin": "Excitation et action immédiate",
            "driver": "Sois fort",
            "masque_stress": "Manipulation",
            "description": "Adaptable, charmeur, plein de ressources. Agit d'abord, réfléchit ensuite.",
        },
    }

    questions = []
    # 20 questions PCM standard simplifiées
    q_templates = [
        {"categorie": "perception", "question": "Je suis surtout sensible à..."},
        {"categorie": "perception", "question": "Ce qui m'attire d'abord chez quelqu'un c'est..."},
        {"categorie": "perception", "question": "Pour moi, le plus important c'est..."},
        {"categorie": "points_forts", "question": "Ma plus grande qualité est..."},
        {"categorie": "points_forts", "question": "On me reconnaît surtout pour..."},
        {"categorie": "points_forts", "question": "Je suis fier(e) de..."},
        {"categorie": "relation", "question": "Avec les autres, je préfère..."},
        {"categorie": "relation", "question": "En équipe, mon rôle naturel est..."},
        {"categorie": "relation", "question": "Je communique le mieux quand..."},
        {"categorie": "relation", "question": "Quand je rencontre quelqu'un, je..."},
        {"categorie": "motivation", "question": "Ce qui me motive le plus c'est..."},
        {"categorie": "motivation", "question": "Je me sens bien quand..."},
        {"categorie": "motivation", "question": "Mon moteur principal est..."},
        {"categorie": "motivation", "question": "J'ai besoin de..."},
        {"categorie": "stress", "question": "Sous pression, j'ai tendance à..."},
        {"categorie": "stress", "question": "Quand ça ne va pas, je..."},
        {"categorie": "stress", "question": "Mon réflexe en cas de conflit est de..."},
        {"categorie": "stress", "question": "Ce qui me stresse le plus c'est..."},
        {"categorie": "stress", "question": "Quand je suis fatigué(e), je deviens..."},
        {"categorie": "perception", "question": "Ma façon de voir le monde c'est..."},
    ]

    type_keys = ["analyseur", "perseverant", "empathique", "imagineur", "energiseur", "promoteur"]
    option_sets = [
        ["La logique et les faits", "Les valeurs et convictions", "La chaleur humaine", "L'imaginaire et la réflexion", "Le fun et la spontanéité", "L'action et les résultats"],
        ["Son intelligence", "Ses convictions", "Sa gentillesse", "Sa profondeur", "Son humour", "Son charisme"],
        ["Être compétent", "Être juste", "Être aimé", "Avoir du temps pour soi", "S'amuser", "Réussir"],
        ["Ma rigueur", "Mon engagement", "Ma sensibilité", "Mon imagination", "Ma créativité", "Mon audace"],
        ["Mon organisation", "Ma fidélité à mes valeurs", "Mon écoute", "Ma réflexion", "Mon énergie", "Mon efficacité"],
        ["Ma fiabilité", "Ma détermination", "Ma compassion", "Ma sérénité", "Ma spontanéité", "Mon côté fonceur"],
        ["Analyser ensemble", "Débattre des idées", "Partager des émotions", "Avoir mon espace", "Rire et m'amuser", "Passer à l'action"],
        ["L'expert technique", "Le garant des valeurs", "Le médiateur", "Le penseur", "L'animateur", "Le leader"],
        ["On échange des données", "On partage des convictions", "On se sent connectés", "On me laisse réfléchir", "On rigole ensemble", "On est direct"],
        ["Observe ses compétences", "Évalue ses opinions", "Ressens ses émotions", "Prends du recul", "Teste son humour", "Vois ce qu'il fait"],
        ["Apprendre et comprendre", "Défendre une cause", "Aider les autres", "Réfléchir en profondeur", "Vivre des expériences fun", "Relever des défis"],
        ["Je suis efficace", "Je suis fidèle à mes valeurs", "Les gens sont heureux", "J'ai du temps calme", "Je m'éclate", "J'obtiens des résultats"],
        ["La connaissance", "La justice", "L'harmonie", "L'introspection", "La stimulation", "La compétition"],
        ["Structure et organisation", "Sens et engagement", "Affection et attention", "Calme et solitude", "Fun et variété", "Action et autonomie"],
        ["Tout vérifier en détail", "Critiquer ce qui ne va pas", "M'effacer et dire oui", "Me replier sur moi", "Râler et blâmer", "Forcer le passage"],
        ["Deviens perfectionniste", "Monte sur mes grands chevaux", "Fais passer les autres d'abord", "Me coupe du monde", "Deviens cynique", "Prends des risques"],
        ["Analyser froidement", "Imposer mon point de vue", "Céder pour la paix", "Fuir le conflit", "Ironiser", "Foncer tête baissée"],
        ["L'incompétence", "L'injustice", "Le rejet", "L'intrusion", "L'ennui", "L'inaction"],
        ["Maniaque du détail", "Moralisateur", "Trop gentil", "Absent", "Agité", "Impatient"],
        ["À travers les données", "À travers mes valeurs", "À travers mes sentiments", "À travers mon monde intérieur", "À travers mes réactions", "À travers l'action"],
    ]

    for i, qt in enumerate(q_templates):
        options = []
        for j, type_key in enumerate(type_keys):
            t = types[type_key]
            options.append({
                "type": type_key,
                "text": option_sets[i][j] if i < len(option_sets) else f"Option {t['label']}",
                "short": t["label"],
                "emoji": t["emoji"],
                "color": t["color"],
            })
        questions.append({
            "id": i + 1,
            "question": qt["question"],
            "categorie": qt["categorie"],
            "options": options,
        })

    return {"types": types, "questions": questions}


def get_questionnaire():
    data = _load_pcm_data()
    return data.get("questions", _default_pcm_data()["questions"])


def get_types_data():
    data = _load_pcm_data()
    return data.get("types", _default_pcm_data()["types"])


def compute_profile(answers: list) -> dict:
    """Calcule le profil PCM à partir des réponses (liste de type_keys)."""
    scores = {
        "analyseur": 0, "perseverant": 0, "promoteur": 0,
        "empathique": 0, "energiseur": 0, "imagineur": 0,
    }

    questions = get_questionnaire()
    base_categories = {"perception", "points_forts", "relation"}
    phase_categories = {"motivation", "stress"}

    base_scores = dict(scores)
    phase_scores = dict(scores)

    for i, answer in enumerate(answers):
        if i < len(questions):
            cat = questions[i]["categorie"]
            if answer in scores:
                scores[answer] += 1
                if cat in base_categories:
                    base_scores[answer] += 1
                elif cat in phase_categories:
                    phase_scores[answer] += 1

    base_type = max(base_scores, key=base_scores.get)
    phase_type = max(phase_scores, key=phase_scores.get)

    types_data = get_types_data()
    base_info = types_data.get(base_type, {})
    phase_info = types_data.get(phase_type, {})

    # RPS
    stress_score = phase_scores[phase_type]
    if stress_score >= 4:
        rps_level = "élevé"
    elif stress_score >= 2:
        rps_level = "modéré"
    else:
        rps_level = "faible"

    return {
        "base_type": base_type,
        "phase_type": phase_type,
        "score_analyseur": scores["analyseur"],
        "score_perseverant": scores["perseverant"],
        "score_promoteur": scores["promoteur"],
        "score_empathique": scores["empathique"],
        "score_energiseur": scores["energiseur"],
        "score_imagineur": scores["imagineur"],
        "perception_dominante": base_info.get("perception", ""),
        "canal_communication": base_info.get("canal", ""),
        "besoin_psychologique": base_info.get("besoin", ""),
        "driver_principal": phase_info.get("driver", ""),
        "masque_stress": phase_info.get("masque_stress", ""),
        "scenario_stress": f"Sous stress, {base_info.get('label', '')} en base et {phase_info.get('label', '')} en phase.",
        "rps_risk_level": rps_level,
        "rps_indicators": f"Score stress: {stress_score}/5",
        "tp_correlation": f"Base: {base_info.get('label', '')}, Phase: {phase_info.get('label', '')}",
        "communication_tips": f"Canal privilégié : {base_info.get('canal', '')}. Besoin : {base_info.get('besoin', '')}.",
        "environment_tips": f"Environnement idéal pour {base_info.get('label', '')}: {base_info.get('description', '')}",
    }
