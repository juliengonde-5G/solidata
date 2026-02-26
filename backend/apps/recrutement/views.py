from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import (
    Poste, CampagneRecrutement, Candidat, Candidature, Entretien,
    MiseEnSituation, TestPersonnalite, QuestionTest, PassationTest, ReponseTest,
)
from .serializers import (
    PosteSerializer, CampagneRecrutementSerializer, CandidatSerializer,
    CandidatureSerializer, CandidatureKanbanSerializer, EntretienSerializer,
    MiseEnSituationSerializer, TestPersonnaliteSerializer,
    PassationTestSerializer, ReponseTestSerializer,
)


class PosteViewSet(viewsets.ModelViewSet):
    queryset = Poste.objects.all()
    serializer_class = PosteSerializer
    filterset_fields = ['service', 'type_contrat', 'actif']
    search_fields = ['intitule']


class CampagneRecrutementViewSet(viewsets.ModelViewSet):
    queryset = CampagneRecrutement.objects.all()
    serializer_class = CampagneRecrutementSerializer
    filterset_fields = ['statut']
    search_fields = ['titre']


class CandidatViewSet(viewsets.ModelViewSet):
    queryset = Candidat.objects.all()
    serializer_class = CandidatSerializer
    search_fields = ['nom', 'prenom', 'email']
    filterset_fields = ['rsa', 'rqth']


class CandidatureViewSet(viewsets.ModelViewSet):
    queryset = Candidature.objects.select_related('candidat', 'campagne', 'poste_vise').all()
    serializer_class = CandidatureSerializer
    filterset_fields = ['campagne', 'etape', 'poste_vise']

    @action(detail=False, methods=['get'])
    def kanban(self, request):
        """Vue Kanban des candidatures pour une campagne."""
        campagne_id = request.query_params.get('campagne')
        qs = self.get_queryset()
        if campagne_id:
            qs = qs.filter(campagne_id=campagne_id)

        serializer = CandidatureKanbanSerializer(qs, many=True)
        # Organiser par étape pour le Kanban
        kanban_data = {}
        for etape_value, etape_label in Candidature.Etape.choices:
            kanban_data[etape_value] = {
                'label': etape_label,
                'candidatures': [
                    c for c in serializer.data if c['etape'] == etape_value
                ]
            }
        return Response(kanban_data)

    @action(detail=True, methods=['post'])
    def deplacer(self, request, pk=None):
        """Déplacer une candidature dans le Kanban."""
        candidature = self.get_object()
        nouvelle_etape = request.data.get('etape')
        ordre = request.data.get('ordre_kanban', 0)

        if nouvelle_etape not in dict(Candidature.Etape.choices):
            return Response(
                {'error': 'Étape invalide'},
                status=status.HTTP_400_BAD_REQUEST
            )

        candidature.etape = nouvelle_etape
        candidature.ordre_kanban = ordre
        candidature.save()
        return Response(CandidatureSerializer(candidature).data)


class EntretienViewSet(viewsets.ModelViewSet):
    queryset = Entretien.objects.select_related('candidature__candidat', 'recruteur').all()
    serializer_class = EntretienSerializer
    filterset_fields = ['candidature', 'type_entretien', 'avis']


class MiseEnSituationViewSet(viewsets.ModelViewSet):
    queryset = MiseEnSituation.objects.select_related('candidature__candidat').all()
    serializer_class = MiseEnSituationSerializer
    filterset_fields = ['candidature']


class TestPersonnaliteViewSet(viewsets.ModelViewSet):
    queryset = TestPersonnalite.objects.prefetch_related('questions__choix').all()
    serializer_class = TestPersonnaliteSerializer
    filterset_fields = ['actif', 'version_visuelle']

    @action(detail=True, methods=['get'])
    def visuel(self, request, pk=None):
        """Retourne le test en mode visuel (pictogrammes)."""
        test = self.get_object()
        serializer = self.get_serializer(test)
        return Response(serializer.data)


class PassationTestViewSet(viewsets.ModelViewSet):
    queryset = PassationTest.objects.select_related('candidature__candidat', 'test').all()
    serializer_class = PassationTestSerializer
    filterset_fields = ['candidature', 'test', 'complete']

    @action(detail=True, methods=['post'])
    def soumettre_reponse(self, request, pk=None):
        """Soumettre une réponse à une question du test."""
        passation = self.get_object()
        if passation.complete:
            return Response(
                {'error': 'Ce test est déjà terminé'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReponseTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(passation=passation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def terminer(self, request, pk=None):
        """Marquer le test comme terminé et calculer les scores."""
        passation = self.get_object()
        passation.complete = True
        passation.date_fin = timezone.now()
        passation.save()
        return Response(PassationTestSerializer(passation).data)
