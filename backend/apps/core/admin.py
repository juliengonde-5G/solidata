from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Utilisateur, ParametreAssociation


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    list_display = ('username', 'first_name', 'last_name', 'role', 'is_active')
    list_filter = ('role', 'is_active')
    fieldsets = UserAdmin.fieldsets + (
        ('Solidarité Textile', {'fields': ('role', 'telephone', 'photo')}),
    )


@admin.register(ParametreAssociation)
class ParametreAssociationAdmin(admin.ModelAdmin):
    list_display = ('nom', 'code_refashion', 'numero_dsp')
