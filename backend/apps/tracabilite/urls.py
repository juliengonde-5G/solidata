from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'categories', views.CategorieFluxViewSet)
router.register(r'destinations', views.DestinationViewSet)
router.register(r'lots', views.LotViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
