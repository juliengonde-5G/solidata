from django.contrib import admin

from .models import (
    Poste, CampagneRecrutement, Candidat, Candidature, Entretien,
    MiseEnSituation, TestPersonnalite, QuestionTest, ChoixQuestion,
    PassationTest, ReponseTest,
)


class ChoixQuestionInline(admin.TabularInline):
    model = ChoixQuestion
    extra = 3


class QuestionTestInline(admin.TabularInline):
    model = QuestionTest
    extra = 1
    show_change_link = True


@admin.register(Poste)
class PosteAdmin(admin.ModelAdmin):
    list_display = ('intitule', 'service', 'type_contrat', 'nombre_postes', 'actif')
    list_filter = ('service', 'type_contrat', 'actif')
    search_fields = ('intitule',)


@admin.register(CampagneRecrutement)
class CampagneRecrutementAdmin(admin.ModelAdmin):
    list_display = ('titre', 'statut', 'date_debut', 'date_fin', 'responsable')
    list_filter = ('statut',)
    filter_horizontal = ('postes',)


@admin.register(Candidat)
class CandidatAdmin(admin.ModelAdmin):
    list_display = ('nom', 'prenom', 'telephone', 'prescripteur', 'rsa', 'rqth')
    search_fields = ('nom', 'prenom', 'email')
    list_filter = ('rsa', 'rqth')


@admin.register(Candidature)
class CandidatureAdmin(admin.ModelAdmin):
    list_display = ('candidat', 'campagne', 'poste_vise', 'etape', 'date_candidature')
    list_filter = ('etape', 'campagne')
    search_fields = ('candidat__nom', 'candidat__prenom')


@admin.register(Entretien)
class EntretienAdmin(admin.ModelAdmin):
    list_display = ('candidature', 'type_entretien', 'date', 'recruteur', 'avis')
    list_filter = ('type_entretien', 'avis')


@admin.register(MiseEnSituation)
class MiseEnSituationAdmin(admin.ModelAdmin):
    list_display = ('candidature', 'poste_teste', 'date', 'evaluateur')


@admin.register(TestPersonnalite)
class TestPersonnaliteAdmin(admin.ModelAdmin):
    list_display = ('titre', 'version_visuelle', 'actif')
    inlines = [QuestionTestInline]


@admin.register(QuestionTest)
class QuestionTestAdmin(admin.ModelAdmin):
    list_display = ('test', 'ordre', 'texte', 'type_question', 'categorie')
    list_filter = ('test', 'categorie', 'type_question')
    inlines = [ChoixQuestionInline]


@admin.register(PassationTest)
class PassationTestAdmin(admin.ModelAdmin):
    list_display = ('candidature', 'test', 'date_debut', 'mode_visuel', 'complete')
    list_filter = ('test', 'mode_visuel', 'complete')
