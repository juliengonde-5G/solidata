<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Incidents terrain</h1>
      <v-spacer />
      <v-btn-toggle v-model="filtreStatut" mandatory>
        <v-btn value="ouvert">Ouverts</v-btn>
        <v-btn value="">Tous</v-btn>
      </v-btn-toggle>
    </div>

    <v-data-table :headers="headers" :items="incidents" :loading="loading">
      <template v-slot:item.priorite="{ item }">
        <v-chip :color="prioriteColor(item.priorite)" size="small">{{ item.priorite_display }}</v-chip>
      </template>
      <template v-slot:item.statut="{ item }">
        <v-chip :color="statutColor(item.statut)" size="small">{{ item.statut_display }}</v-chip>
      </template>
    </v-data-table>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import api from '../../plugins/axios'

const incidents = ref([])
const loading = ref(false)
const filtreStatut = ref('ouvert')

const headers = [
  { title: 'Priorité', key: 'priorite' },
  { title: 'Titre', key: 'titre' },
  { title: 'Type', key: 'type_display' },
  { title: 'Statut', key: 'statut' },
  { title: 'Date', key: 'date_signalement' },
]

const prioriteColor = (p) => ({
  basse: 'green', normale: 'blue', haute: 'orange', urgente: 'red',
}[p] || 'grey')

const statutColor = (s) => ({
  ouvert: 'red', en_cours: 'orange', resolu: 'green', ferme: 'grey',
}[s] || 'grey')

const fetchIncidents = async () => {
  loading.value = true
  try {
    const params = {}
    if (filtreStatut.value) params.statut = filtreStatut.value
    const { data } = await api.get('/collecte/incidents/', { params })
    incidents.value = data.results || data
  } catch (e) { /* */ }
  loading.value = false
}

watch(filtreStatut, fetchIncidents)
onMounted(fetchIncidents)
</script>
