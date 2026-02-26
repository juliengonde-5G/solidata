"""Service d'intégration avec l'API Geo Coyote pour la géolocalisation des véhicules."""

import logging
from datetime import datetime

import requests
from django.conf import settings

from .models import Vehicule, PositionVehicule

logger = logging.getLogger(__name__)


class GeoCoyoteService:
    """Client pour l'API Geo Coyote."""

    def __init__(self):
        self.api_url = settings.GEO_COYOTE_API_URL
        self.api_key = settings.GEO_COYOTE_API_KEY
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
        })

    @property
    def is_configured(self):
        return bool(self.api_url and self.api_key)

    def get_positions(self):
        """Récupère les positions actuelles de tous les véhicules géolocalisés."""
        if not self.is_configured:
            logger.warning("Geo Coyote non configuré")
            return []

        try:
            response = self.session.get(f'{self.api_url}/vehicles/positions')
            response.raise_for_status()
            return response.json().get('data', [])
        except requests.RequestException as e:
            logger.error(f"Erreur API Geo Coyote: {e}")
            return []

    def get_vehicle_position(self, geo_coyote_id):
        """Récupère la position d'un véhicule spécifique."""
        if not self.is_configured:
            return None

        try:
            response = self.session.get(
                f'{self.api_url}/vehicles/{geo_coyote_id}/position'
            )
            response.raise_for_status()
            return response.json().get('data')
        except requests.RequestException as e:
            logger.error(f"Erreur API Geo Coyote pour {geo_coyote_id}: {e}")
            return None

    def get_vehicle_history(self, geo_coyote_id, date_debut, date_fin):
        """Récupère l'historique de positions d'un véhicule."""
        if not self.is_configured:
            return []

        try:
            response = self.session.get(
                f'{self.api_url}/vehicles/{geo_coyote_id}/history',
                params={
                    'start': date_debut.isoformat(),
                    'end': date_fin.isoformat(),
                }
            )
            response.raise_for_status()
            return response.json().get('data', [])
        except requests.RequestException as e:
            logger.error(f"Erreur historique Geo Coyote: {e}")
            return []

    def sync_positions(self):
        """Synchronise les positions de tous les véhicules avec Geo Coyote."""
        positions_data = self.get_positions()
        updated = 0

        for pos_data in positions_data:
            try:
                vehicule = Vehicule.objects.get(geo_coyote_id=pos_data.get('vehicle_id'))
                PositionVehicule.objects.create(
                    vehicule=vehicule,
                    latitude=pos_data.get('latitude'),
                    longitude=pos_data.get('longitude'),
                    vitesse=pos_data.get('speed'),
                    cap=pos_data.get('heading'),
                    timestamp=datetime.fromisoformat(pos_data.get('timestamp', '')),
                    adresse=pos_data.get('address', ''),
                    moteur_allume=pos_data.get('ignition'),
                )
                updated += 1
            except Vehicule.DoesNotExist:
                logger.warning(f"Véhicule Geo Coyote inconnu: {pos_data.get('vehicle_id')}")
            except (ValueError, KeyError) as e:
                logger.error(f"Erreur parsing position: {e}")

        logger.info(f"Geo Coyote: {updated} positions synchronisées")
        return updated


# Singleton
geo_coyote = GeoCoyoteService()
