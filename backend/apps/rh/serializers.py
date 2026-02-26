from rest_framework import serializers

from .models import (
    Competence, Salarie, SalarieCompetence, Planning,
    CreneauPlanning, Presence,
)


class CompetenceSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_competence_display', read_only=True)

    class Meta:
        model = Competence
        fields = '__all__'


class SalarieCompetenceSerializer(serializers.ModelSerializer):
    competence_nom = serializers.CharField(source='competence.__str__', read_only=True)
    est_valide = serializers.BooleanField(read_only=True)

    class Meta:
        model = SalarieCompetence
        fields = '__all__'


class SalarieSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()
    competences = SalarieCompetenceSerializer(source='competences_salarie', many=True, read_only=True)
    service_display = serializers.CharField(source='get_service_display', read_only=True)

    class Meta:
        model = Salarie
        fields = '__all__'

    def get_nom_complet(self, obj):
        return str(obj)


class SalarieListSerializer(serializers.ModelSerializer):
    """Sérialiseur léger pour les listes."""
    nom_complet = serializers.SerializerMethodField()
    service_display = serializers.CharField(source='get_service_display', read_only=True)

    class Meta:
        model = Salarie
        fields = ['id', 'matricule', 'prenom', 'nom', 'nom_complet', 'service', 'service_display', 'statut', 'photo']

    def get_nom_complet(self, obj):
        return str(obj)


class CreneauPlanningSerializer(serializers.ModelSerializer):
    salarie_nom = serializers.CharField(source='salarie.__str__', read_only=True)

    class Meta:
        model = CreneauPlanning
        fields = '__all__'


class PlanningSerializer(serializers.ModelSerializer):
    creneaux = CreneauPlanningSerializer(many=True, read_only=True)
    service_display = serializers.CharField(source='get_service_display', read_only=True)

    class Meta:
        model = Planning
        fields = '__all__'


class PresenceSerializer(serializers.ModelSerializer):
    salarie_nom = serializers.CharField(source='salarie.__str__', read_only=True)
    type_display = serializers.CharField(source='get_type_presence_display', read_only=True)

    class Meta:
        model = Presence
        fields = '__all__'
