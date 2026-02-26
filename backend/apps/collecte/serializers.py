from rest_framework import serializers

from .models import (
    Vehicule, EntretienVehicule, CAV, Tournee, TourneeCAV,
    Collecte, PassageCAV, IncidentTerrain, PositionVehicule,
)


class VehiculeSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    type_display = serializers.CharField(source='get_type_vehicule_display', read_only=True)

    class Meta:
        model = Vehicule
        fields = '__all__'


class EntretienVehiculeSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_entretien_display', read_only=True)
    vehicule_nom = serializers.CharField(source='vehicule.__str__', read_only=True)

    class Meta:
        model = EntretienVehicule
        fields = '__all__'


class CAVSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    type_display = serializers.CharField(source='get_type_cav_display', read_only=True)

    class Meta:
        model = CAV
        fields = '__all__'


class CAVMobileSerializer(serializers.ModelSerializer):
    """Sérialiseur léger pour l'application mobile de collecte."""
    class Meta:
        model = CAV
        fields = ['id', 'identifiant', 'qr_code', 'nom_emplacement', 'adresse', 'latitude', 'longitude', 'statut']


class TourneeCAVSerializer(serializers.ModelSerializer):
    cav_detail = CAVMobileSerializer(source='cav', read_only=True)

    class Meta:
        model = TourneeCAV
        fields = '__all__'


class TourneeSerializer(serializers.ModelSerializer):
    cav_list = TourneeCAVSerializer(source='cav_tournee', many=True, read_only=True)
    vehicule_nom = serializers.CharField(source='vehicule_defaut.__str__', read_only=True)
    nombre_cav = serializers.IntegerField(source='cav_tournee.count', read_only=True)

    class Meta:
        model = Tournee
        fields = '__all__'


class PassageCAVSerializer(serializers.ModelSerializer):
    cav_identifiant = serializers.CharField(source='cav.identifiant', read_only=True)
    cav_nom = serializers.CharField(source='cav.nom_emplacement', read_only=True)
    niveau_display = serializers.CharField(source='get_niveau_remplissage_display', read_only=True)

    class Meta:
        model = PassageCAV
        fields = '__all__'


class CollecteSerializer(serializers.ModelSerializer):
    tournee_nom = serializers.CharField(source='tournee.nom', read_only=True)
    vehicule_nom = serializers.CharField(source='vehicule.__str__', read_only=True)
    chauffeur_nom = serializers.CharField(source='chauffeur.__str__', read_only=True)
    passages = PassageCAVSerializer(many=True, read_only=True)
    nombre_cav_visitees = serializers.IntegerField(read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = Collecte
        fields = '__all__'


class CollecteListSerializer(serializers.ModelSerializer):
    """Sérialiseur léger pour les listes."""
    tournee_nom = serializers.CharField(source='tournee.nom', read_only=True)
    vehicule_nom = serializers.CharField(source='vehicule.__str__', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    nombre_cav_visitees = serializers.IntegerField(read_only=True)

    class Meta:
        model = Collecte
        fields = [
            'id', 'tournee', 'tournee_nom', 'date', 'vehicule', 'vehicule_nom',
            'statut', 'statut_display', 'poids_total_kg', 'verrouille',
            'nombre_cav_visitees',
        ]


class IncidentTerrainSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_incident_display', read_only=True)
    priorite_display = serializers.CharField(source='get_priorite_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = IncidentTerrain
        fields = '__all__'


class PositionVehiculeSerializer(serializers.ModelSerializer):
    vehicule_nom = serializers.CharField(source='vehicule.__str__', read_only=True)

    class Meta:
        model = PositionVehicule
        fields = '__all__'
