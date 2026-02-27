from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import (
    Competence, Salarie, SalarieCompetence, Planning,
    CreneauPlanning, Presence,
)
from .serializers import (
    CompetenceSerializer, SalarieSerializer, SalarieListSerializer,
    SalarieCompetenceSerializer, PlanningSerializer,
    CreneauPlanningSerializer, PresenceSerializer,
)


class CompetenceViewSet(viewsets.ModelViewSet):
    queryset = Competence.objects.all()
    serializer_class = CompetenceSerializer
    filterset_fields = ['type_competence', 'obligatoire_collecte']


class SalarieViewSet(viewsets.ModelViewSet):
    queryset = Salarie.objects.prefetch_related('competences_salarie__competence').all()
    filterset_fields = ['service', 'statut', 'type_contrat']
    search_fields = ['nom', 'prenom', 'matricule']

    def get_serializer_class(self):
        if self.action == 'list':
            return SalarieListSerializer
        return SalarieSerializer

    @action(detail=True, methods=['get'])
    def competences(self, request, pk=None):
        """Liste des compétences d'un salarié."""
        salarie = self.get_object()
        competences = salarie.competences_salarie.select_related('competence').all()
        serializer = SalarieCompetenceSerializer(competences, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def alertes_competences(self, request):
        """Compétences expirant dans les 30 prochains jours."""
        from datetime import timedelta
        today = timezone.now().date()
        bientot = today + timedelta(days=30)
        expirations = SalarieCompetence.objects.filter(
            date_expiration__lte=bientot,
            date_expiration__gte=today,
            salarie__statut='actif',
        ).select_related('salarie', 'competence')
        serializer = SalarieCompetenceSerializer(expirations, many=True)
        return Response(serializer.data)


class PlanningViewSet(viewsets.ModelViewSet):
    queryset = Planning.objects.prefetch_related('creneaux__salarie').all()
    serializer_class = PlanningSerializer
    filterset_fields = ['service', 'publie', 'type_planning']

    @action(detail=True, methods=['post'])
    def ajouter_creneau(self, request, pk=None):
        """Ajouter un créneau au planning."""
        planning = self.get_object()
        serializer = CreneauPlanningSerializer(data={**request.data, 'planning': planning.id})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PresenceViewSet(viewsets.ModelViewSet):
    queryset = Presence.objects.select_related('salarie').all()
    serializer_class = PresenceSerializer
    filterset_fields = ['salarie', 'date', 'type_presence']

    @action(detail=False, methods=['get'])
    def journee(self, request):
        """Présences d'une journée donnée."""
        date = request.query_params.get('date', timezone.now().date())
        presences = self.get_queryset().filter(date=date)
        serializer = self.get_serializer(presences, many=True)
        return Response(serializer.data)
