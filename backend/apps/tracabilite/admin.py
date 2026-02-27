from django.contrib import admin

from .models import CategorieFlux, Destination, Lot


@admin.register(CategorieFlux)
class CategorieFluxAdmin(admin.ModelAdmin):
    list_display = ('code', 'nom')


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):
    list_display = ('nom', 'type_destination', 'actif')
    list_filter = ('type_destination', 'actif')


@admin.register(Lot)
class LotAdmin(admin.ModelAdmin):
    list_display = ('numero', 'type_lot', 'statut', 'poids_kg', 'categorie', 'destination')
    list_filter = ('type_lot', 'statut', 'categorie')
    search_fields = ('numero',)
