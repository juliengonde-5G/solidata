from rest_framework import serializers

from .models import (
    Poste, CampagneRecrutement, Candidat, Candidature, Entretien,
    MiseEnSituation, TestPersonnalite, QuestionTest, ChoixQuestion,
    PassationTest, ReponseTest,
)


class PosteSerializer(serializers.ModelSerializer):
    service_display = serializers.CharField(source='get_service_display', read_only=True)
    type_contrat_display = serializers.CharField(source='get_type_contrat_display', read_only=True)

    class Meta:
        model = Poste
        fields = '__all__'


class CampagneRecrutementSerializer(serializers.ModelSerializer):
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    nombre_candidatures = serializers.IntegerField(source='candidatures.count', read_only=True)

    class Meta:
        model = CampagneRecrutement
        fields = '__all__'


class CandidatSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = Candidat
        fields = '__all__'

    def get_nom_complet(self, obj):
        return str(obj)


class CandidatureSerializer(serializers.ModelSerializer):
    candidat_nom = serializers.CharField(source='candidat.__str__', read_only=True)
    etape_display = serializers.CharField(source='get_etape_display', read_only=True)
    poste_vise_nom = serializers.CharField(source='poste_vise.__str__', read_only=True)

    class Meta:
        model = Candidature
        fields = '__all__'


class CandidatureKanbanSerializer(serializers.ModelSerializer):
    """Sérialiseur optimisé pour l'affichage Kanban."""
    candidat_nom = serializers.CharField(source='candidat.__str__', read_only=True)
    candidat_photo = serializers.ImageField(source='candidat.photo', read_only=True)
    poste_vise_nom = serializers.CharField(source='poste_vise.__str__', read_only=True)
    etape_display = serializers.CharField(source='get_etape_display', read_only=True)
    nombre_entretiens = serializers.IntegerField(source='entretiens.count', read_only=True)

    class Meta:
        model = Candidature
        fields = [
            'id', 'candidat', 'candidat_nom', 'candidat_photo',
            'poste_vise', 'poste_vise_nom', 'etape', 'etape_display',
            'ordre_kanban', 'date_candidature', 'nombre_entretiens',
            'commentaire',
        ]


class EntretienSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_entretien_display', read_only=True)

    class Meta:
        model = Entretien
        fields = '__all__'


class MiseEnSituationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MiseEnSituation
        fields = '__all__'


class ChoixQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChoixQuestion
        fields = '__all__'


class QuestionTestSerializer(serializers.ModelSerializer):
    choix = ChoixQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = QuestionTest
        fields = '__all__'


class TestPersonnaliteSerializer(serializers.ModelSerializer):
    questions = QuestionTestSerializer(many=True, read_only=True)
    nombre_questions = serializers.IntegerField(source='questions.count', read_only=True)

    class Meta:
        model = TestPersonnalite
        fields = '__all__'


class ReponseTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReponseTest
        fields = '__all__'


class PassationTestSerializer(serializers.ModelSerializer):
    reponses = ReponseTestSerializer(many=True, read_only=True)
    scores = serializers.SerializerMethodField()

    class Meta:
        model = PassationTest
        fields = '__all__'

    def get_scores(self, obj):
        if obj.complete:
            return obj.scores_par_categorie
        return None
