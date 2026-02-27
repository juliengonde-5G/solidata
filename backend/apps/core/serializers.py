from rest_framework import serializers

from .models import Utilisateur, ParametreAssociation


class UtilisateurSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'role', 'telephone', 'photo', 'is_active', 'nom_complet',
        ]
        read_only_fields = ['id']

    def get_nom_complet(self, obj):
        return str(obj)


class ParametreAssociationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametreAssociation
        fields = '__all__'
