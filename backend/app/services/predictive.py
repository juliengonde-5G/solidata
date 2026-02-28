from datetime import timedelta

# Coefficients saisonniers (base 1.0 = moyenne annuelle)
COEFFICIENTS_SAISONNIERS = {
    1: 0.75, 2: 0.70, 3: 0.80,
    4: 0.95, 5: 1.00,
    6: 1.20, 7: 1.30, 8: 1.25, 9: 1.20,
    10: 1.05, 11: 0.85, 12: 0.80,
}

CAPACITE_CAMION_KG = 800

MOIS_NOMS = [
    "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]


def get_predictions(start_date):
    """Retourne les recommandations prédictives pour une semaine."""
    predictions = []
    for day_offset in range(5):
        current = start_date + timedelta(days=day_offset)
        mois = current.month
        coeff = COEFFICIENTS_SAISONNIERS.get(mois, 1.0)
        nb_tournees = max(2, round(4 * coeff))
        tonnage_prevu = nb_tournees * 2 * CAPACITE_CAMION_KG  # matin + après-midi

        saison = "haute" if coeff >= 1.1 else "basse" if coeff <= 0.8 else "normale"
        predictions.append({
            "date": current.strftime("%Y-%m-%d"),
            "jour": ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"][day_offset],
            "mois": MOIS_NOMS[mois],
            "coefficient": coeff,
            "saison": saison,
            "nb_tournees_recommandees": nb_tournees,
            "tonnage_prevu_kg": tonnage_prevu,
        })
    return predictions
