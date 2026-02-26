<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Compétences & Certifications</h1>
    </div>

    <!-- Alertes expirations -->
    <v-alert v-if="alertes.length" type="warning" variant="tonal" class="mb-4">
      <div class="font-weight-bold mb-2">Compétences expirant dans les 30 jours</div>
      <div v-for="alerte in alertes" :key="alerte.id">
        {{ alerte.competence_nom }} - expire le {{ alerte.date_expiration }}
      </div>
    </v-alert>

    <v-card>
      <v-card-title>Référentiel des compétences</v-card-title>
      <v-data-table :headers="headers" :items="competences">
        <template v-slot:item.obligatoire_collecte="{ item }">
          <v-icon v-if="item.obligatoire_collecte" color="warning">mdi-alert</v-icon>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../plugins/axios'

const competences = ref([])
const alertes = ref([])

const headers = [
  { title: 'Nom', key: 'nom' },
  { title: 'Type', key: 'type_display' },
  { title: 'Validité (mois)', key: 'duree_validite_mois' },
  { title: 'Obligatoire collecte', key: 'obligatoire_collecte', align: 'center' },
]

onMounted(async () => {
  try {
    const [compRes, alerteRes] = await Promise.all([
      api.get('/rh/competences/'),
      api.get('/rh/salaries/alertes_competences/'),
    ])
    competences.value = compRes.data.results || compRes.data
    alertes.value = alerteRes.data
  } catch (e) { /* */ }
})
</script>
