from rest_framework import viewsets, permissions, views
from rest_framework.response import Response

from .models import Utilisateur, ParametreAssociation
from .serializers import UtilisateurSerializer, ParametreAssociationSerializer


class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['role', 'is_active']
    search_fields = ['first_name', 'last_name', 'username']


class ParametreAssociationViewSet(viewsets.ModelViewSet):
    queryset = ParametreAssociation.objects.all()
    serializer_class = ParametreAssociationSerializer
    permission_classes = [permissions.IsAuthenticated]


class CurrentUserView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UtilisateurSerializer(request.user)
        return Response(serializer.data)
