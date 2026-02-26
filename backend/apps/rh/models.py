from django.db import models
from django.conf import settings


class Competence(models.Model):
    """Compétence ou certification (CACES, Permis B, etc.)."""

    class TypeCompetence(models.TextChoices):
        PERMIS = 'permis', 'Permis de conduire'
        CACES = 'caces', 'CACES'
        HABILITATION = 'habilitation', 'Habilitation'
        FORMATION = 'formation', 'Formation'
        AUTRE = 'autre', 'Autre'

    nom = models.CharField(max_length=200)
    type_competence = models.CharField(max_length=20, choices=TypeCompetence.choices)
    description = models.TextField(blank=True)
    duree_validite_mois = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Durée de validité en mois (null = pas d\'expiration)'
    )
    obligatoire_collecte = models.BooleanField(
        default=False,
        help_text='Obligatoire pour les postes de collecte'
    )

    class Meta:
        verbose_name = 'Compétence'
        verbose_name_plural = 'Compétences'
        ordering = ['type_competence', 'nom']

    def __str__(self):
        return f"{self.nom} ({self.get_type_competence_display()})"


class Salarie(models.Model):
    """Salarié de Solidarité Textile."""

    class Statut(models.TextChoices):
        ACTIF = 'actif', 'Actif'
        SUSPENDU = 'suspendu', 'Suspendu'
        SORTI = 'sorti', 'Sorti'

    class Service(models.TextChoices):
        COLLECTE = 'collecte', 'Collecte'
        TRI = 'tri', 'Tri'
        LOGISTIQUE = 'logistique', 'Logistique'
        BOUTIQUE = 'boutique', 'Boutique'
        ADMINISTRATIF = 'administratif', 'Administratif'

    utilisateur = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='salarie'
    )
    # Lien avec le candidat recruté
    candidat_origine = models.OneToOneField(
        'recrutement.Candidat', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='salarie'
    )
    matricule = models.CharField(max_length=20, unique=True)
    prenom = models.CharField(max_length=100)
    nom = models.CharField(max_length=100)
    date_naissance = models.DateField(null=True, blank=True)
    adresse = models.TextField(blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    photo = models.ImageField(upload_to='rh/photos/', blank=True, null=True)
    # Contrat
    type_contrat = models.CharField(
        max_length=20,
        choices=[
            ('cddi', 'CDDI'),
            ('cdd', 'CDD'),
            ('cdi', 'CDI'),
            ('stage', 'Stage'),
            ('service_civique', 'Service Civique'),
        ],
        default='cddi'
    )
    date_debut_contrat = models.DateField()
    date_fin_contrat = models.DateField(null=True, blank=True)
    service = models.CharField(max_length=20, choices=Service.choices)
    poste = models.ForeignKey(
        'recrutement.Poste', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='salaries'
    )
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.ACTIF)
    # Insertion
    numero_pole_emploi = models.CharField(max_length=50, blank=True)
    prescripteur = models.CharField(max_length=200, blank=True)
    referent_insertion = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='salaries_suivis'
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Salarié'
        verbose_name_plural = 'Salariés'
        ordering = ['nom', 'prenom']

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.matricule})"

    @property
    def competences_valides(self):
        """Retourne les compétences valides (non expirées) du salarié."""
        from django.utils import timezone
        today = timezone.now().date()
        return self.competences_salarie.filter(
            models.Q(date_expiration__isnull=True) |
            models.Q(date_expiration__gte=today)
        )


class SalarieCompetence(models.Model):
    """Compétence détenue par un salarié."""
    salarie = models.ForeignKey(Salarie, on_delete=models.CASCADE, related_name='competences_salarie')
    competence = models.ForeignKey(Competence, on_delete=models.CASCADE, related_name='salaries_competence')
    date_obtention = models.DateField()
    date_expiration = models.DateField(null=True, blank=True)
    numero_certificat = models.CharField(max_length=100, blank=True)
    document = models.FileField(upload_to='rh/competences/', blank=True, null=True)
    commentaire = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Compétence du salarié'
        verbose_name_plural = 'Compétences des salariés'
        unique_together = ['salarie', 'competence']

    def __str__(self):
        return f"{self.salarie} - {self.competence}"

    @property
    def est_valide(self):
        if not self.date_expiration:
            return True
        from django.utils import timezone
        return self.date_expiration >= timezone.now().date()


class Planning(models.Model):
    """Planning hebdomadaire ou mensuel."""

    class TypePlanning(models.TextChoices):
        HEBDOMADAIRE = 'hebdomadaire', 'Hebdomadaire'
        MENSUEL = 'mensuel', 'Mensuel'

    titre = models.CharField(max_length=200)
    type_planning = models.CharField(max_length=20, choices=TypePlanning.choices)
    service = models.CharField(max_length=20, choices=Salarie.Service.choices)
    date_debut = models.DateField()
    date_fin = models.DateField()
    publie = models.BooleanField(default=False)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='plannings_crees'
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Planning'
        verbose_name_plural = 'Plannings'
        ordering = ['-date_debut']

    def __str__(self):
        return f"{self.titre} ({self.date_debut} - {self.date_fin})"


class CreneauPlanning(models.Model):
    """Créneau d'un salarié dans un planning."""
    planning = models.ForeignKey(Planning, on_delete=models.CASCADE, related_name='creneaux')
    salarie = models.ForeignKey(Salarie, on_delete=models.CASCADE, related_name='creneaux')
    date = models.DateField()
    heure_debut = models.TimeField()
    heure_fin = models.TimeField()
    poste_affecte = models.ForeignKey(
        'recrutement.Poste', on_delete=models.SET_NULL,
        null=True, blank=True
    )
    commentaire = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'Créneau de planning'
        verbose_name_plural = 'Créneaux de planning'
        ordering = ['date', 'heure_debut']

    def __str__(self):
        return f"{self.salarie} - {self.date} {self.heure_debut}-{self.heure_fin}"


class Presence(models.Model):
    """Suivi de présence/absence des salariés."""

    class TypePresence(models.TextChoices):
        PRESENT = 'present', 'Présent'
        ABSENT_JUSTIFIE = 'absent_justifie', 'Absent justifié'
        ABSENT_NON_JUSTIFIE = 'absent_non_justifie', 'Absent non justifié'
        MALADIE = 'maladie', 'Maladie'
        CONGE = 'conge', 'Congé'
        FORMATION = 'formation', 'Formation'
        RETARD = 'retard', 'Retard'

    salarie = models.ForeignKey(Salarie, on_delete=models.CASCADE, related_name='presences')
    date = models.DateField()
    type_presence = models.CharField(max_length=25, choices=TypePresence.choices, default=TypePresence.PRESENT)
    heure_arrivee = models.TimeField(null=True, blank=True)
    heure_depart = models.TimeField(null=True, blank=True)
    commentaire = models.TextField(blank=True)
    justificatif = models.FileField(upload_to='rh/justificatifs/', blank=True, null=True)
    saisi_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='presences_saisies'
    )

    class Meta:
        verbose_name = 'Présence'
        verbose_name_plural = 'Présences'
        ordering = ['-date']
        unique_together = ['salarie', 'date']

    def __str__(self):
        return f"{self.salarie} - {self.date} ({self.get_type_presence_display()})"
