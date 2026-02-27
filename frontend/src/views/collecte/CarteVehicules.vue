<template>
  <div>
    <h1 class="text-h5 mb-4">Carte des véhicules</h1>
    <v-card>
      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4">
          La carte affiche les positions en temps réel des véhicules via Geo Coyote.
          Les positions sont mises à jour automatiquement.
        </v-alert>
        <v-row>
          <v-col v-for="v in vehiculesPositions" :key="v.vehicule.id" cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title class="text-body-1">
                <v-icon :color="v.position ? 'success' : 'grey'" class="mr-2">mdi-truck</v-icon>
                {{ v.vehicule.nom }}
              </v-card-title>
              <v-card-text v-if="v.position">
                <div class="text-body-2">
                  <v-icon size="small">mdi-map-marker</v-icon>
                  {{ v.position.adresse || `${v.position.latitude}, ${v.position.longitude}` }}
                </div>
                <div class="text-body-2">
                  <v-icon size="small">mdi-speedometer</v-icon>
                  {{ v.position.vitesse || 0 }} km/h
                </div>
                <div class="text-caption text-grey">
                  Dernière position: {{ v.position.timestamp }}
                </div>
                <v-chip
                  :color="v.position.moteur_allume ? 'success' : 'grey'"
                  size="x-small"
                  class="mt-1"
                >
                  Moteur {{ v.position.moteur_allume ? 'allumé' : 'éteint' }}
                </v-chip>
              </v-card-text>
              <v-card-text v-else>
                <span class="text-grey">Position non disponible</span>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../plugins/axios'

const vehiculesPositions = ref([])

onMounted(async () => {
  try {
    const { data } = await api.get('/collecte/vehicules/carte/')
    vehiculesPositions.value = data
  } catch (e) { /* */ }
})
</script>
