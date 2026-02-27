from rest_framework import viewsets

from .models import CategorieFlux, Destination, Lot
from .serializers import CategorieFluxSerializer, DestinationSerializer, LotSerializer


class CategorieFluxViewSet(viewsets.ModelViewSet):
    queryset = CategorieFlux.objects.all()
    serializer_class = CategorieFluxSerializer


class DestinationViewSet(viewsets.ModelViewSet):
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    filterset_fields = ['type_destination', 'actif']


class LotViewSet(viewsets.ModelViewSet):
    queryset = Lot.objects.select_related('categorie', 'destination', 'collecte_origine').all()
    serializer_class = LotSerializer
    filterset_fields = ['type_lot', 'statut', 'categorie', 'destination']
    search_fields = ['numero']
