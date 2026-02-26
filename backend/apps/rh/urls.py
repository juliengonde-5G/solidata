from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'competences', views.CompetenceViewSet)
router.register(r'salaries', views.SalarieViewSet)
router.register(r'plannings', views.PlanningViewSet)
router.register(r'presences', views.PresenceViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
