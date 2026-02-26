from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'vehicules', views.VehiculeViewSet)
router.register(r'entretiens-vehicule', views.EntretienVehiculeViewSet)
router.register(r'cav', views.CAVViewSet)
router.register(r'tournees', views.TourneeViewSet)
router.register(r'collectes', views.CollecteViewSet)
router.register(r'incidents', views.IncidentTerrainViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
