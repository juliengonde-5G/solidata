from django.contrib import admin

from .models import (
    Vehicule, EntretienVehicule, CAV, Tournee, TourneeCAV,
    Collecte, PassageCAV, IncidentTerrain, PositionVehicule,
)


class TourneeCAVInline(admin.TabularInline):
    model = TourneeCAV
    extra = 3


class PassageCAVInline(admin.TabularInline):
    model = PassageCAV
    extra = 0
    readonly_fields = ('heure_passage',)


@admin.register(Vehicule)
class VehiculeAdmin(admin.ModelAdmin):
    list_display = ('nom', 'immatriculation', 'type_vehicule', 'statut', 'kilometrage')
    list_filter = ('type_vehicule', 'statut')
    search_fields = ('nom', 'immatriculation')


@admin.register(EntretienVehicule)
class EntretienVehiculeAdmin(admin.ModelAdmin):
    list_display = ('vehicule', 'type_entretien', 'date', 'cout', 'prestataire')
    list_filter = ('type_entretien',)


@admin.register(CAV)
class CAVAdmin(admin.ModelAdmin):
    list_display = ('identifiant', 'nom_emplacement', 'commune', 'type_cav', 'statut')
    list_filter = ('statut', 'type_cav', 'commune')
    search_fields = ('identifiant', 'nom_emplacement', 'adresse')


@admin.register(Tournee)
class TourneeAdmin(admin.ModelAdmin):
    list_display = ('nom', 'vehicule_defaut', 'jours', 'ordre_passage', 'active')
    list_filter = ('active',)
    inlines = [TourneeCAVInline]


@admin.register(Collecte)
class CollecteAdmin(admin.ModelAdmin):
    list_display = ('tournee', 'date', 'vehicule', 'chauffeur', 'statut', 'poids_total_kg', 'verrouille')
    list_filter = ('statut', 'verrouille', 'date')
    inlines = [PassageCAVInline]


@admin.register(IncidentTerrain)
class IncidentTerrainAdmin(admin.ModelAdmin):
    list_display = ('titre', 'type_incident', 'priorite', 'statut', 'signale_par', 'date_signalement')
    list_filter = ('type_incident', 'priorite', 'statut')
    search_fields = ('titre', 'description')
