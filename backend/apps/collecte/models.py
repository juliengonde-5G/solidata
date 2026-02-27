import uuid

from django.db import models
from django.conf import settings


class Vehicule(models.Model):
    """Véhicule de collecte de Solidarité Textile."""

    class TypeVehicule(models.TextChoices):
        CAMION = 'camion', 'Camion'
        CAMIONNETTE = 'camionnette', 'Camionnette'
        UTILITAIRE = 'utilitaire', 'Utilitaire'

    class Statut(models.TextChoices):
        DISPONIBLE = 'disponible', 'Disponible'
        EN_TOURNEE = 'en_tournee', 'En tournée'
        MAINTENANCE = 'maintenance', 'En maintenance'
        HORS_SERVICE = 'hors_service', 'Hors service'

    nom = models.CharField(max_length=100, help_text='Nom usuel du véhicule')
    immatriculation = models.CharField(max_length=20, unique=True)
    type_vehicule = models.CharField(max_length=20, choices=TypeVehicule.choices, default=TypeVehicule.CAMION)
    marque = models.CharField(max_length=100, blank=True)
    modele = models.CharField(max_length=100, blank=True)
    annee = models.PositiveIntegerField(null=True, blank=True)
    capacite_kg = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Capacité de charge en kg'
    )
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.DISPONIBLE)
    kilometrage = models.PositiveIntegerField(default=0)
    date_derniere_revision = models.DateField(null=True, blank=True)
    date_prochain_controle_technique = models.DateField(null=True, blank=True)
    # Geo Coyote
    geo_coyote_id = models.CharField(
        max_length=100, blank=True,
        help_text='Identifiant du véhicule dans Geo Coyote'
    )
    photo = models.ImageField(upload_to='collecte/vehicules/', blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Véhicule'
        verbose_name_plural = 'Véhicules'
        ordering = ['nom']

    def __str__(self):
        return f"{self.nom} ({self.immatriculation})"


class EntretienVehicule(models.Model):
    """Suivi de l'entretien des véhicules."""

    class TypeEntretien(models.TextChoices):
        REVISION = 'revision', 'Révision'
        REPARATION = 'reparation', 'Réparation'
        CONTROLE_TECHNIQUE = 'controle_technique', 'Contrôle technique'
        PNEUMATIQUES = 'pneumatiques', 'Pneumatiques'
        CARROSSERIE = 'carrosserie', 'Carrosserie'
        AUTRE = 'autre', 'Autre'

    vehicule = models.ForeignKey(Vehicule, on_delete=models.CASCADE, related_name='entretiens')
    type_entretien = models.CharField(max_length=20, choices=TypeEntretien.choices)
    date = models.DateField()
    kilometrage = models.PositiveIntegerField(null=True, blank=True)
    description = models.TextField()
    cout = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    prestataire = models.CharField(max_length=200, blank=True)
    facture = models.FileField(upload_to='collecte/factures/', blank=True, null=True)
    prochaine_echeance = models.DateField(
        null=True, blank=True,
        help_text='Date du prochain entretien prévu'
    )
    saisi_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Entretien véhicule'
        verbose_name_plural = 'Entretiens véhicule'
        ordering = ['-date']

    def __str__(self):
        return f"{self.vehicule} - {self.get_type_entretien_display()} ({self.date})"


class CAV(models.Model):
    """Conteneur d'Apport Volontaire (borne textile)."""

    class Statut(models.TextChoices):
        ACTIF = 'actif', 'Actif'
        INACTIF = 'inactif', 'Inactif'
        EN_MAINTENANCE = 'en_maintenance', 'En maintenance'
        A_REMPLACER = 'a_remplacer', 'À remplacer'

    class TypeCAV(models.TextChoices):
        BORNE_3M3 = 'borne_3m3', 'Borne 3m³'
        BORNE_4M3 = 'borne_4m3', 'Borne 4m³'
        CONTENEUR = 'conteneur', 'Conteneur'

    identifiant = models.CharField(max_length=50, unique=True, help_text='Identifiant unique de la CAV')
    qr_code = models.UUIDField(default=uuid.uuid4, unique=True, help_text='UUID pour le QR code')
    nom_emplacement = models.CharField(max_length=200, help_text='Nom de l\'emplacement (ex: Parking Leclerc)')
    adresse = models.TextField()
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    commune = models.CharField(max_length=100, blank=True)
    code_postal = models.CharField(max_length=10, blank=True)
    type_cav = models.CharField(max_length=20, choices=TypeCAV.choices, default=TypeCAV.BORNE_3M3)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.ACTIF)
    date_installation = models.DateField(null=True, blank=True)
    photo = models.ImageField(upload_to='collecte/cav/', blank=True, null=True)
    notes = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'CAV'
        verbose_name_plural = 'CAV'
        ordering = ['commune', 'nom_emplacement']

    def __str__(self):
        return f"{self.identifiant} - {self.nom_emplacement}"


class Tournee(models.Model):
    """Tournée de collecte prédéfinie."""

    class Jour(models.TextChoices):
        LUNDI = 'lundi', 'Lundi'
        MARDI = 'mardi', 'Mardi'
        MERCREDI = 'mercredi', 'Mercredi'
        JEUDI = 'jeudi', 'Jeudi'
        VENDREDI = 'vendredi', 'Vendredi'
        SAMEDI = 'samedi', 'Samedi'

    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    jours = models.CharField(
        max_length=100, blank=True,
        help_text='Jours de la semaine (ex: lundi,mercredi,vendredi)'
    )
    vehicule_defaut = models.ForeignKey(
        Vehicule, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='tournees_defaut'
    )
    ordre_passage = models.PositiveIntegerField(
        default=1,
        help_text='Ordre de la tournée dans la journée (1=matin, 2=après-midi)'
    )
    active = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Tournée'
        verbose_name_plural = 'Tournées'
        ordering = ['nom']

    def __str__(self):
        return self.nom


class TourneeCAV(models.Model):
    """Lien entre une tournée et une CAV, avec ordre de passage."""
    tournee = models.ForeignKey(Tournee, on_delete=models.CASCADE, related_name='cav_tournee')
    cav = models.ForeignKey(CAV, on_delete=models.CASCADE, related_name='tournees_cav')
    ordre = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'CAV dans tournée'
        verbose_name_plural = 'CAV dans tournées'
        ordering = ['tournee', 'ordre']
        unique_together = ['tournee', 'cav']

    def __str__(self):
        return f"{self.tournee} - #{self.ordre} {self.cav}"


class Collecte(models.Model):
    """Instance de collecte (exécution d'une tournée un jour donné)."""

    class Statut(models.TextChoices):
        PLANIFIEE = 'planifiee', 'Planifiée'
        EN_COURS = 'en_cours', 'En cours'
        TERMINEE = 'terminee', 'Terminée'
        ANNULEE = 'annulee', 'Annulée'

    tournee = models.ForeignKey(Tournee, on_delete=models.CASCADE, related_name='collectes')
    date = models.DateField()
    vehicule = models.ForeignKey(Vehicule, on_delete=models.SET_NULL, null=True, related_name='collectes')
    chauffeur = models.ForeignKey(
        'rh.Salarie', on_delete=models.SET_NULL,
        null=True, related_name='collectes_chauffeur'
    )
    equipier = models.ForeignKey(
        'rh.Salarie', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='collectes_equipier'
    )
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.PLANIFIEE)
    heure_depart = models.TimeField(null=True, blank=True)
    heure_retour = models.TimeField(null=True, blank=True)
    kilometrage_depart = models.PositiveIntegerField(null=True, blank=True)
    kilometrage_retour = models.PositiveIntegerField(null=True, blank=True)
    # Pesée finale
    poids_total_kg = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        help_text='Poids total collecté en kg (pesée à l\'arrivée au centre de tri)'
    )
    verrouille = models.BooleanField(
        default=False,
        help_text='Collecte verrouillée après saisie du poids'
    )
    notes = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Collecte'
        verbose_name_plural = 'Collectes'
        ordering = ['-date', 'tournee']

    def __str__(self):
        return f"Collecte {self.tournee} - {self.date}"

    @property
    def nombre_cav_visitees(self):
        return self.passages.count()


class PassageCAV(models.Model):
    """Passage dans une CAV lors d'une collecte - scan QR code."""

    class NiveauRemplissage(models.TextChoices):
        VIDE = 'vide', 'Vide (0%)'
        QUART = 'quart', 'Quart (25%)'
        MOITIE = 'moitie', 'Moitié (50%)'
        TROIS_QUARTS = 'trois_quarts', 'Trois-quarts (75%)'
        PLEIN = 'plein', 'Plein (100%)'
        DEBORDEMENT = 'debordement', 'Débordement'

    collecte = models.ForeignKey(Collecte, on_delete=models.CASCADE, related_name='passages')
    cav = models.ForeignKey(CAV, on_delete=models.CASCADE, related_name='passages')
    heure_passage = models.DateTimeField(auto_now_add=True)
    niveau_remplissage = models.CharField(
        max_length=20, choices=NiveauRemplissage.choices,
        default=NiveauRemplissage.MOITIE
    )
    collecte_effectuee = models.BooleanField(default=True)
    # Géolocalisation du passage (GPS smartphone)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    photo = models.ImageField(upload_to='collecte/passages/', blank=True, null=True)
    operateur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True
    )

    class Meta:
        verbose_name = 'Passage CAV'
        verbose_name_plural = 'Passages CAV'
        ordering = ['collecte', 'heure_passage']

    def __str__(self):
        return f"Passage {self.cav} - {self.heure_passage}"


class IncidentTerrain(models.Model):
    """Remontée d'information / incident du terrain."""

    class TypeIncident(models.TextChoices):
        CAV_ENDOMMAGEE = 'cav_endommagee', 'CAV endommagée'
        CAV_INACCESSIBLE = 'cav_inaccessible', 'CAV inaccessible'
        DEPOT_SAUVAGE = 'depot_sauvage', 'Dépôt sauvage'
        PROBLEME_VEHICULE = 'probleme_vehicule', 'Problème véhicule'
        SECURITE = 'securite', 'Problème de sécurité'
        AUTRE = 'autre', 'Autre'

    class Priorite(models.TextChoices):
        BASSE = 'basse', 'Basse'
        NORMALE = 'normale', 'Normale'
        HAUTE = 'haute', 'Haute'
        URGENTE = 'urgente', 'Urgente'

    class Statut(models.TextChoices):
        OUVERT = 'ouvert', 'Ouvert'
        EN_COURS = 'en_cours', 'En cours de traitement'
        RESOLU = 'resolu', 'Résolu'
        FERME = 'ferme', 'Fermé'

    type_incident = models.CharField(max_length=20, choices=TypeIncident.choices)
    priorite = models.CharField(max_length=10, choices=Priorite.choices, default=Priorite.NORMALE)
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.OUVERT)
    titre = models.CharField(max_length=200)
    description = models.TextField()
    # Liens optionnels
    cav = models.ForeignKey(CAV, on_delete=models.SET_NULL, null=True, blank=True, related_name='incidents')
    vehicule = models.ForeignKey(Vehicule, on_delete=models.SET_NULL, null=True, blank=True, related_name='incidents')
    collecte = models.ForeignKey(Collecte, on_delete=models.SET_NULL, null=True, blank=True, related_name='incidents')
    # Localisation
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    photo = models.ImageField(upload_to='collecte/incidents/', blank=True, null=True)
    # Suivi
    signale_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='incidents_signales'
    )
    traite_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='incidents_traites'
    )
    date_signalement = models.DateTimeField(auto_now_add=True)
    date_resolution = models.DateTimeField(null=True, blank=True)
    commentaire_resolution = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Incident terrain'
        verbose_name_plural = 'Incidents terrain'
        ordering = ['-date_signalement']

    def __str__(self):
        return f"[{self.get_priorite_display()}] {self.titre}"


class PositionVehicule(models.Model):
    """Position GPS d'un véhicule (données Geo Coyote)."""
    vehicule = models.ForeignKey(Vehicule, on_delete=models.CASCADE, related_name='positions')
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    vitesse = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    cap = models.PositiveIntegerField(null=True, blank=True, help_text='Direction en degrés')
    timestamp = models.DateTimeField()
    adresse = models.CharField(max_length=300, blank=True)
    moteur_allume = models.BooleanField(null=True, blank=True)

    class Meta:
        verbose_name = 'Position véhicule'
        verbose_name_plural = 'Positions véhicules'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['vehicule', '-timestamp']),
        ]

    def __str__(self):
        return f"{self.vehicule} - {self.timestamp}"
