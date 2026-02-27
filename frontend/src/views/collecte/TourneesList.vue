<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Tournées</h1>
    </div>

    <v-card v-for="t in tournees" :key="t.id" class="mb-4">
      <v-card-title class="d-flex align-center">
        {{ t.nom }}
        <v-chip :color="t.active ? 'success' : 'grey'" size="small" class="ml-2">
          {{ t.active ? 'Active' : 'Inactive' }}
        </v-chip>
        <v-spacer />
        <span class="text-body-2">{{ t.nombre_cav }} CAV</span>
      </v-card-title>
      <v-card-subtitle>
        {{ t.vehicule_nom || 'Aucun véhicule par défaut' }} - Passage n°{{ t.ordre_passage }}
      </v-card-subtitle>
      <v-card-text v-if="t.jours">
        <v-chip v-for="jour in t.jours.split(',')" :key="jour" size="small" class="mr-1">
          {{ jour.trim() }}
        </v-chip>
      </v-card-text>
      <v-expansion-panels v-if="t.cav_list?.length">
        <v-expansion-panel title="Liste des CAV">
          <v-expansion-panel-text>
            <v-list density="compact">
              <v-list-item
                v-for="tc in t.cav_list"
                :key="tc.id"
                :title="tc.cav_detail.nom_emplacement"
                :subtitle="tc.cav_detail.adresse"
              >
                <template v-slot:prepend>
                  <v-avatar size="24" color="primary" class="mr-2">
                    <span class="text-white text-caption">{{ tc.ordre }}</span>
                  </v-avatar>
                </template>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../plugins/axios'

const tournees = ref([])

onMounted(async () => {
  try {
    const { data } = await api.get('/collecte/tournees/')
    tournees.value = data.results || data
  } catch (e) { /* */ }
})
</script>
