from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import (
    Vehicule, EntretienVehicule, CAV, Tournee,
    Collecte, PassageCAV, IncidentTerrain, PositionVehicule,
)
from .serializers import (
    VehiculeSerializer, EntretienVehiculeSerializer, CAVSerializer,
    CAVMobileSerializer, TourneeSerializer, CollecteSerializer,
    CollecteListSerializer, PassageCAVSerializer,
    IncidentTerrainSerializer, PositionVehiculeSerializer,
)


class VehiculeViewSet(viewsets.ModelViewSet):
    queryset = Vehicule.objects.all()
    serializer_class = VehiculeSerializer
    filterset_fields = ['type_vehicule', 'statut']
    search_fields = ['nom', 'immatriculation']

    @action(detail=True, methods=['get'])
    def entretiens(self, request, pk=None):
        """Historique d'entretien d'un véhicule."""
        vehicule = self.get_object()
        entretiens = vehicule.entretiens.all()
        serializer = EntretienVehiculeSerializer(entretiens, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def position(self, request, pk=None):
        """Dernière position connue du véhicule."""
        vehicule = self.get_object()
        position = vehicule.positions.first()
        if position:
            return Response(PositionVehiculeSerializer(position).data)
        return Response({'detail': 'Aucune position connue'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def carte(self, request):
        """Positions actuelles de tous les véhicules pour la carte."""
        vehicules = Vehicule.objects.exclude(statut='hors_service')
        data = []
        for v in vehicules:
            pos = v.positions.first()
            data.append({
                'vehicule': VehiculeSerializer(v).data,
                'position': PositionVehiculeSerializer(pos).data if pos else None,
            })
        return Response(data)


class EntretienVehiculeViewSet(viewsets.ModelViewSet):
    queryset = EntretienVehicule.objects.select_related('vehicule').all()
    serializer_class = EntretienVehiculeSerializer
    filterset_fields = ['vehicule', 'type_entretien']


class CAVViewSet(viewsets.ModelViewSet):
    queryset = CAV.objects.all()
    serializer_class = CAVSerializer
    filterset_fields = ['statut', 'type_cav', 'commune']
    search_fields = ['identifiant', 'nom_emplacement', 'adresse']

    @action(detail=False, methods=['get'], url_path='scan/(?P<qr_code>[^/.]+)')
    def scan(self, request, qr_code=None):
        """Scanner un QR code de CAV (pour l'application mobile)."""
        cav = get_object_or_404(CAV, qr_code=qr_code)
        return Response(CAVMobileSerializer(cav).data)

    @action(detail=True, methods=['get'])
    def qrcode(self, request, pk=None):
        """Générer le QR code d'une CAV."""
        import qrcode
        import io
        from django.http import HttpResponse

        cav = self.get_object()
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(str(cav.qr_code))
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        return HttpResponse(buffer.getvalue(), content_type='image/png')


class TourneeViewSet(viewsets.ModelViewSet):
    queryset = Tournee.objects.prefetch_related('cav_tournee__cav').all()
    serializer_class = TourneeSerializer
    filterset_fields = ['active', 'vehicule_defaut']


class CollecteViewSet(viewsets.ModelViewSet):
    queryset = Collecte.objects.select_related(
        'tournee', 'vehicule', 'chauffeur', 'equipier'
    ).prefetch_related('passages__cav').all()
    filterset_fields = ['tournee', 'date', 'statut', 'vehicule', 'verrouille']
    ordering_fields = ['date']

    def get_serializer_class(self):
        if self.action == 'list':
            return CollecteListSerializer
        return CollecteSerializer

    @action(detail=True, methods=['post'])
    def demarrer(self, request, pk=None):
        """Démarrer une collecte."""
        collecte = self.get_object()
        collecte.statut = 'en_cours'
        collecte.heure_depart = timezone.now().time()
        collecte.kilometrage_depart = request.data.get('kilometrage_depart')
        collecte.save()
        return Response(CollecteSerializer(collecte).data)

    @action(detail=True, methods=['post'])
    def passage(self, request, pk=None):
        """Enregistrer un passage dans une CAV (scan QR code mobile)."""
        collecte = self.get_object()
        if collecte.verrouille:
            return Response(
                {'error': 'Cette collecte est verrouillée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = PassageCAVSerializer(data={
            **request.data,
            'collecte': collecte.id,
            'operateur': request.user.id,
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def peser(self, request, pk=None):
        """Enregistrer le poids et verrouiller la collecte."""
        collecte = self.get_object()
        poids = request.data.get('poids_total_kg')
        if not poids:
            return Response(
                {'error': 'Le poids est obligatoire'},
                status=status.HTTP_400_BAD_REQUEST
            )

        collecte.poids_total_kg = poids
        collecte.statut = 'terminee'
        collecte.heure_retour = timezone.now().time()
        collecte.kilometrage_retour = request.data.get('kilometrage_retour')
        collecte.verrouille = True
        collecte.save()
        return Response(CollecteSerializer(collecte).data)

    @action(detail=False, methods=['get'])
    def du_jour(self, request):
        """Collectes du jour."""
        today = timezone.now().date()
        collectes = self.get_queryset().filter(date=today)
        serializer = CollecteListSerializer(collectes, many=True)
        return Response(serializer.data)


class IncidentTerrainViewSet(viewsets.ModelViewSet):
    queryset = IncidentTerrain.objects.select_related('cav', 'vehicule', 'signale_par').all()
    serializer_class = IncidentTerrainSerializer
    filterset_fields = ['type_incident', 'priorite', 'statut']
    search_fields = ['titre', 'description']

    def perform_create(self, serializer):
        serializer.save(signale_par=self.request.user)

    @action(detail=True, methods=['post'])
    def resoudre(self, request, pk=None):
        """Marquer un incident comme résolu."""
        incident = self.get_object()
        incident.statut = 'resolu'
        incident.traite_par = request.user
        incident.date_resolution = timezone.now()
        incident.commentaire_resolution = request.data.get('commentaire', '')
        incident.save()
        return Response(IncidentTerrainSerializer(incident).data)
