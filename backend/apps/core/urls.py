from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'utilisateurs', views.UtilisateurViewSet)
router.register(r'parametres', views.ParametreAssociationViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/', include('rest_framework.urls')),
    path('me/', views.CurrentUserView.as_view(), name='current-user'),
]
