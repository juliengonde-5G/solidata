from django.contrib import admin

from .models import (
    Competence, Salarie, SalarieCompetence, Planning,
    CreneauPlanning, Presence,
)


class SalarieCompetenceInline(admin.TabularInline):
    model = SalarieCompetence
    extra = 1


@admin.register(Competence)
class CompetenceAdmin(admin.ModelAdmin):
    list_display = ('nom', 'type_competence', 'duree_validite_mois', 'obligatoire_collecte')
    list_filter = ('type_competence', 'obligatoire_collecte')


@admin.register(Salarie)
class SalarieAdmin(admin.ModelAdmin):
    list_display = ('matricule', 'nom', 'prenom', 'service', 'type_contrat', 'statut')
    list_filter = ('service', 'statut', 'type_contrat')
    search_fields = ('nom', 'prenom', 'matricule')
    inlines = [SalarieCompetenceInline]


@admin.register(Planning)
class PlanningAdmin(admin.ModelAdmin):
    list_display = ('titre', 'type_planning', 'service', 'date_debut', 'date_fin', 'publie')
    list_filter = ('type_planning', 'service', 'publie')


@admin.register(Presence)
class PresenceAdmin(admin.ModelAdmin):
    list_display = ('salarie', 'date', 'type_presence', 'heure_arrivee', 'heure_depart')
    list_filter = ('type_presence', 'date')
    search_fields = ('salarie__nom', 'salarie__prenom')
