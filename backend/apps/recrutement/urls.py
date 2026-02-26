from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'postes', views.PosteViewSet)
router.register(r'campagnes', views.CampagneRecrutementViewSet)
router.register(r'candidats', views.CandidatViewSet)
router.register(r'candidatures', views.CandidatureViewSet)
router.register(r'entretiens', views.EntretienViewSet)
router.register(r'mises-en-situation', views.MiseEnSituationViewSet)
router.register(r'tests', views.TestPersonnaliteViewSet)
router.register(r'passations', views.PassationTestViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
