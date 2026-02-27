from django.db import models
from django.conf import settings


class CategorieFlux(models.Model):
    """Catégorie de flux matière (selon nomenclature Refashion)."""
    code = models.CharField(max_length=20, unique=True)
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Catégorie de flux'
        verbose_name_plural = 'Catégories de flux'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.nom}"


class Destination(models.Model):
    """Destination des matières triées."""

    class TypeDestination(models.TextChoices):
        REEMPLOI = 'reemploi', 'Réemploi (état original)'
        RECYCLAGE = 'recyclage', 'Recyclage (CSR)'
        UPCYCLING = 'upcycling', 'Revalorisation (Upcycling)'
        BOUTIQUE = 'boutique', 'Boutique'
        VAK = 'vak', 'VAK (Vente au Kilo)'
        ELIMINATION = 'elimination', 'Élimination'

    nom = models.CharField(max_length=200)
    type_destination = models.CharField(max_length=20, choices=TypeDestination.choices)
    adresse = models.TextField(blank=True)
    contact = models.CharField(max_length=200, blank=True)
    numero_agrement = models.CharField(max_length=100, blank=True)
    actif = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Destination'
        verbose_name_plural = 'Destinations'
        ordering = ['type_destination', 'nom']

    def __str__(self):
        return f"{self.nom} ({self.get_type_destination_display()})"


class Lot(models.Model):
    """Lot de matière (entrant ou sortant)."""

    class TypeLot(models.TextChoices):
        ENTRANT = 'entrant', 'Entrant (collecte)'
        SORTANT = 'sortant', 'Sortant (après tri)'

    class Statut(models.TextChoices):
        EN_ATTENTE = 'en_attente', 'En attente de tri'
        EN_COURS = 'en_cours', 'Tri en cours'
        TRIE = 'trie', 'Trié'
        EXPEDIE = 'expedie', 'Expédié'

    numero = models.CharField(max_length=50, unique=True)
    type_lot = models.CharField(max_length=10, choices=TypeLot.choices)
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.EN_ATTENTE)
    categorie = models.ForeignKey(CategorieFlux, on_delete=models.SET_NULL, null=True, blank=True)
    poids_kg = models.DecimalField(max_digits=10, decimal_places=2)
    collecte_origine = models.ForeignKey(
        'collecte.Collecte', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='lots'
    )
    destination = models.ForeignKey(
        Destination, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='lots'
    )
    date_creation = models.DateField(auto_now_add=True)
    date_expedition = models.DateField(null=True, blank=True)
    bordereau = models.FileField(upload_to='tracabilite/bordereaux/', blank=True, null=True)
    notes = models.TextField(blank=True)
    saisi_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True
    )

    class Meta:
        verbose_name = 'Lot'
        verbose_name_plural = 'Lots'
        ordering = ['-date_creation']

    def __str__(self):
        return f"Lot {self.numero} - {self.poids_kg}kg"
