from django.db import models
from django.conf import settings


class Poste(models.Model):
    """Poste disponible au sein de l'association."""

    class Service(models.TextChoices):
        COLLECTE = 'collecte', 'Collecte'
        TRI = 'tri', 'Tri'
        LOGISTIQUE = 'logistique', 'Logistique'
        BOUTIQUE = 'boutique', 'Boutique'
        ADMINISTRATIF = 'administratif', 'Administratif'

    class TypeContrat(models.TextChoices):
        CDDI = 'cddi', 'CDDI (Contrat à Durée Déterminée d\'Insertion)'
        CDD = 'cdd', 'CDD'
        CDI = 'cdi', 'CDI'
        STAGE = 'stage', 'Stage'
        SERVICE_CIVIQUE = 'service_civique', 'Service Civique'

    intitule = models.CharField(max_length=200)
    service = models.CharField(max_length=20, choices=Service.choices)
    type_contrat = models.CharField(max_length=20, choices=TypeContrat.choices, default=TypeContrat.CDDI)
    description = models.TextField(blank=True)
    competences_requises = models.ManyToManyField(
        'rh.Competence', blank=True, related_name='postes_requis',
        verbose_name='Compétences requises'
    )
    nombre_postes = models.PositiveIntegerField(default=1)
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Poste'
        verbose_name_plural = 'Postes'
        ordering = ['-date_creation']

    def __str__(self):
        return f"{self.intitule} ({self.get_service_display()})"


class CampagneRecrutement(models.Model):
    """Campagne de recrutement pour un ou plusieurs postes."""

    class Statut(models.TextChoices):
        BROUILLON = 'brouillon', 'Brouillon'
        OUVERTE = 'ouverte', 'Ouverte'
        FERMEE = 'fermee', 'Fermée'

    titre = models.CharField(max_length=200)
    postes = models.ManyToManyField(Poste, related_name='campagnes')
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.BROUILLON)
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='campagnes_responsable'
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Campagne de recrutement'
        verbose_name_plural = 'Campagnes de recrutement'
        ordering = ['-date_debut']

    def __str__(self):
        return self.titre


class Candidat(models.Model):
    """Personne candidate à un poste."""
    prenom = models.CharField(max_length=100)
    nom = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    adresse = models.TextField(blank=True)
    date_naissance = models.DateField(null=True, blank=True)
    cv = models.FileField(upload_to='recrutement/cv/', blank=True, null=True)
    photo = models.ImageField(upload_to='recrutement/photos/', blank=True, null=True)
    notes = models.TextField(blank=True, verbose_name='Notes générales')
    # Contexte insertion
    prescripteur = models.CharField(
        max_length=200, blank=True,
        help_text='Organisme prescripteur (Pôle Emploi, Mission Locale, etc.)'
    )
    numero_pole_emploi = models.CharField(max_length=50, blank=True)
    rsa = models.BooleanField(default=False, verbose_name='Bénéficiaire RSA')
    rqth = models.BooleanField(default=False, verbose_name='RQTH')
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Candidat'
        verbose_name_plural = 'Candidats'
        ordering = ['nom', 'prenom']

    def __str__(self):
        return f"{self.prenom} {self.nom}"


class Candidature(models.Model):
    """Candidature d'un candidat pour une campagne - suivi Kanban."""

    class Etape(models.TextChoices):
        RECEPTION = 'reception', 'Réception'
        PRESELECTION = 'preselection', 'Présélection'
        ENTRETIEN = 'entretien', 'Entretien'
        MISE_EN_SITUATION = 'mise_en_situation', 'Mise en situation'
        TEST_PERSONNALITE = 'test_personnalite', 'Test de personnalité'
        DECISION = 'decision', 'Décision'
        ACCEPTE = 'accepte', 'Accepté'
        REFUSE = 'refuse', 'Refusé'
        DESISTEMENT = 'desistement', 'Désistement'

    candidat = models.ForeignKey(Candidat, on_delete=models.CASCADE, related_name='candidatures')
    campagne = models.ForeignKey(CampagneRecrutement, on_delete=models.CASCADE, related_name='candidatures')
    poste_vise = models.ForeignKey(Poste, on_delete=models.SET_NULL, null=True, related_name='candidatures')
    etape = models.CharField(max_length=20, choices=Etape.choices, default=Etape.RECEPTION)
    ordre_kanban = models.PositiveIntegerField(default=0, help_text='Position dans la colonne Kanban')
    date_candidature = models.DateField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    commentaire = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Candidature'
        verbose_name_plural = 'Candidatures'
        ordering = ['etape', 'ordre_kanban']
        unique_together = ['candidat', 'campagne']

    def __str__(self):
        return f"{self.candidat} - {self.campagne} ({self.get_etape_display()})"


class Entretien(models.Model):
    """Entretien de recrutement."""

    class TypeEntretien(models.TextChoices):
        TELEPHONIQUE = 'telephonique', 'Téléphonique'
        PHYSIQUE = 'physique', 'Physique'
        VISIO = 'visio', 'Visioconférence'

    candidature = models.ForeignKey(Candidature, on_delete=models.CASCADE, related_name='entretiens')
    type_entretien = models.CharField(max_length=20, choices=TypeEntretien.choices, default=TypeEntretien.PHYSIQUE)
    date = models.DateTimeField()
    duree_minutes = models.PositiveIntegerField(default=30)
    recruteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='entretiens_menes'
    )
    compte_rendu = models.TextField(blank=True)
    points_forts = models.TextField(blank=True)
    points_vigilance = models.TextField(blank=True)
    avis = models.CharField(
        max_length=20,
        choices=[
            ('favorable', 'Favorable'),
            ('reserve', 'Réservé'),
            ('defavorable', 'Défavorable'),
        ],
        blank=True
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Entretien'
        verbose_name_plural = 'Entretiens'
        ordering = ['-date']

    def __str__(self):
        return f"Entretien {self.candidature.candidat} - {self.date:%d/%m/%Y}"


class MiseEnSituation(models.Model):
    """Mise en situation professionnelle lors du recrutement."""
    candidature = models.ForeignKey(Candidature, on_delete=models.CASCADE, related_name='mises_en_situation')
    poste_teste = models.ForeignKey(Poste, on_delete=models.SET_NULL, null=True)
    date = models.DateTimeField()
    duree_minutes = models.PositiveIntegerField(default=120)
    evaluateur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='evaluations_mes'
    )
    observations = models.TextField(blank=True)
    respect_consignes = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text='Note sur 5'
    )
    rapidite = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text='Note sur 5'
    )
    qualite_travail = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text='Note sur 5'
    )
    travail_equipe = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text='Note sur 5'
    )
    autonomie = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text='Note sur 5'
    )
    avis_global = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Mise en situation'
        verbose_name_plural = 'Mises en situation'
        ordering = ['-date']

    def __str__(self):
        return f"MES {self.candidature.candidat} - {self.date:%d/%m/%Y}"


class TestPersonnalite(models.Model):
    """Questionnaire de personnalité configurable."""
    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    actif = models.BooleanField(default=True)
    version_visuelle = models.BooleanField(
        default=False,
        help_text='Activer la version visuelle (pictogrammes) pour les personnes '
                  'ayant des difficultés avec la langue française'
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Test de personnalité'
        verbose_name_plural = 'Tests de personnalité'

    def __str__(self):
        return self.titre


class QuestionTest(models.Model):
    """Question d'un test de personnalité."""

    class TypeQuestion(models.TextChoices):
        CHOIX_UNIQUE = 'choix_unique', 'Choix unique'
        CHOIX_MULTIPLE = 'choix_multiple', 'Choix multiple'
        ECHELLE = 'echelle', 'Échelle (1-5)'
        TEXTE_LIBRE = 'texte_libre', 'Texte libre'

    class Categorie(models.TextChoices):
        MOTIVATION = 'motivation', 'Motivation'
        RELATIONNEL = 'relationnel', 'Relationnel'
        ORGANISATION = 'organisation', 'Organisation'
        ADAPTATION = 'adaptation', 'Adaptation'
        STRESS = 'stress', 'Gestion du stress'

    test = models.ForeignKey(TestPersonnalite, on_delete=models.CASCADE, related_name='questions')
    texte = models.TextField()
    type_question = models.CharField(max_length=20, choices=TypeQuestion.choices)
    categorie = models.CharField(max_length=20, choices=Categorie.choices)
    ordre = models.PositiveIntegerField(default=0)
    obligatoire = models.BooleanField(default=True)
    # Version visuelle : pictogramme associé à la question
    pictogramme = models.ImageField(
        upload_to='recrutement/pictogrammes/',
        blank=True, null=True,
        help_text='Image/pictogramme pour la version visuelle du test'
    )

    class Meta:
        verbose_name = 'Question de test'
        verbose_name_plural = 'Questions de test'
        ordering = ['test', 'ordre']

    def __str__(self):
        return f"Q{self.ordre}: {self.texte[:50]}"


class ChoixQuestion(models.Model):
    """Choix de réponse pour une question à choix."""
    question = models.ForeignKey(QuestionTest, on_delete=models.CASCADE, related_name='choix')
    texte = models.CharField(max_length=300)
    valeur = models.IntegerField(default=0, help_text='Valeur numérique du choix')
    # Version visuelle
    pictogramme = models.ImageField(
        upload_to='recrutement/pictogrammes_choix/',
        blank=True, null=True,
        help_text='Image/pictogramme pour ce choix (version visuelle)'
    )
    ordre = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Choix de question'
        verbose_name_plural = 'Choix de questions'
        ordering = ['question', 'ordre']

    def __str__(self):
        return self.texte


class PassationTest(models.Model):
    """Passation d'un test de personnalité par un candidat."""
    candidature = models.ForeignKey(Candidature, on_delete=models.CASCADE, related_name='passations_test')
    test = models.ForeignKey(TestPersonnalite, on_delete=models.CASCADE)
    date_debut = models.DateTimeField(auto_now_add=True)
    date_fin = models.DateTimeField(null=True, blank=True)
    mode_visuel = models.BooleanField(default=False, help_text='Passé en mode visuel')
    complete = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Passation de test'
        verbose_name_plural = 'Passations de test'

    def __str__(self):
        return f"Test {self.test} - {self.candidature.candidat}"

    @property
    def scores_par_categorie(self):
        """Calcule les scores par catégorie de question."""
        scores = {}
        for reponse in self.reponses.select_related('question'):
            cat = reponse.question.categorie
            if cat not in scores:
                scores[cat] = {'total': 0, 'count': 0}
            scores[cat]['total'] += reponse.valeur_numerique or 0
            scores[cat]['count'] += 1
        return {
            cat: round(data['total'] / data['count'], 1) if data['count'] else 0
            for cat, data in scores.items()
        }


class ReponseTest(models.Model):
    """Réponse à une question lors d'une passation."""
    passation = models.ForeignKey(PassationTest, on_delete=models.CASCADE, related_name='reponses')
    question = models.ForeignKey(QuestionTest, on_delete=models.CASCADE)
    choix_selectionne = models.ForeignKey(
        ChoixQuestion, on_delete=models.SET_NULL, null=True, blank=True
    )
    texte_libre = models.TextField(blank=True)
    valeur_numerique = models.IntegerField(null=True, blank=True, help_text='Valeur échelle 1-5')

    class Meta:
        verbose_name = 'Réponse de test'
        verbose_name_plural = 'Réponses de test'
        unique_together = ['passation', 'question']

    def __str__(self):
        return f"Réponse Q{self.question.ordre} - {self.passation}"
