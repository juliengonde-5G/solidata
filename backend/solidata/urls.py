from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.core.urls')),
    path('api/recrutement/', include('apps.recrutement.urls')),
    path('api/rh/', include('apps.rh.urls')),
    path('api/collecte/', include('apps.collecte.urls')),
    path('api/tracabilite/', include('apps.tracabilite.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
