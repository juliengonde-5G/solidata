from django.contrib.auth.models import AbstractUser
from django.db import models


class Utilisateur(AbstractUser):
    """Utilisateur de l'application Solidarité Textile."""

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrateur'
        RH = 'rh', 'Ressources Humaines'
        CHEF_EQUIPE = 'chef_equipe', 'Chef d\'équipe'
        OPERATEUR = 'operateur', 'Opérateur collecte'
        TRIEUR = 'trieur', 'Trieur'
        LOGISTIQUE = 'logistique', 'Logistique'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.OPERATEUR,
    )
    telephone = models.CharField(max_length=20, blank=True)
    photo = models.ImageField(upload_to='utilisateurs/photos/', blank=True, null=True)

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name}" if self.first_name else self.username


class ParametreAssociation(models.Model):
    """Paramètres globaux de Solidarité Textile."""
    nom = models.CharField(max_length=200, default='Solidarité Textile')
    adresse = models.TextField(blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    siret = models.CharField(max_length=14, blank=True)
    logo = models.ImageField(upload_to='association/', blank=True, null=True)
    # Paramètres Refashion
    code_refashion = models.CharField(max_length=50, blank=True, verbose_name='Code Refashion')
    # Paramètres DSP (Délégation de Service Public)
    numero_dsp = models.CharField(max_length=100, blank=True, verbose_name='N° DSP')
    date_debut_dsp = models.DateField(null=True, blank=True)
    date_fin_dsp = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = 'Paramètre association'
        verbose_name_plural = 'Paramètres association'

    def __str__(self):
        return self.nom
