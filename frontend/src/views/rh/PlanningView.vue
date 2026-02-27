<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Planning</h1>
      <v-spacer />
      <v-select
        v-model="filtreService"
        :items="services"
        label="Service"
        density="compact"
        hide-details
        clearable
        style="max-width: 200px"
      />
    </div>

    <v-card v-for="planning in plannings" :key="planning.id" class="mb-4">
      <v-card-title>
        {{ planning.titre }}
        <v-chip size="small" :color="planning.publie ? 'success' : 'grey'" class="ml-2">
          {{ planning.publie ? 'Publié' : 'Brouillon' }}
        </v-chip>
      </v-card-title>
      <v-card-subtitle>{{ planning.service_display }} - {{ planning.date_debut }} au {{ planning.date_fin }}</v-card-subtitle>
      <v-card-text>
        <v-table v-if="planning.creneaux?.length">
          <thead>
            <tr>
              <th>Salarié</th>
              <th>Date</th>
              <th>Horaires</th>
              <th>Poste</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="creneau in planning.creneaux" :key="creneau.id">
              <td>{{ creneau.salarie_nom }}</td>
              <td>{{ creneau.date }}</td>
              <td>{{ creneau.heure_debut }} - {{ creneau.heure_fin }}</td>
              <td>{{ creneau.poste_affecte || '-' }}</td>
            </tr>
          </tbody>
        </v-table>
        <div v-else class="text-grey text-center pa-4">Aucun créneau défini</div>
      </v-card-text>
    </v-card>

    <div v-if="!plannings.length" class="text-center text-grey pa-8">
      Aucun planning trouvé
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import api from '../../plugins/axios'

const plannings = ref([])
const filtreService = ref(null)

const services = [
  { title: 'Collecte', value: 'collecte' },
  { title: 'Tri', value: 'tri' },
  { title: 'Logistique', value: 'logistique' },
]

const fetchPlannings = async () => {
  try {
    const params = {}
    if (filtreService.value) params.service = filtreService.value
    const { data } = await api.get('/rh/plannings/', { params })
    plannings.value = data.results || data
  } catch (e) { /* */ }
}

watch(filtreService, fetchPlannings)
onMounted(fetchPlannings)
</script>
