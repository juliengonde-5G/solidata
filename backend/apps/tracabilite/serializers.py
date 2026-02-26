from rest_framework import serializers

from .models import CategorieFlux, Destination, Lot


class CategorieFluxSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategorieFlux
        fields = '__all__'


class DestinationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_destination_display', read_only=True)

    class Meta:
        model = Destination
        fields = '__all__'


class LotSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_lot_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    categorie_nom = serializers.CharField(source='categorie.__str__', read_only=True)
    destination_nom = serializers.CharField(source='destination.__str__', read_only=True)

    class Meta:
        model = Lot
        fields = '__all__'
