<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Présences</h1>
      <v-spacer />
      <v-text-field
        v-model="dateSelectionnee"
        type="date"
        label="Date"
        density="compact"
        hide-details
        style="max-width: 200px"
      />
    </div>

    <v-card>
      <v-data-table :headers="headers" :items="presences" :loading="loading">
        <template v-slot:item.type_presence="{ item }">
          <v-chip :color="typeColor(item.type_presence)" size="small">
            {{ item.type_display }}
          </v-chip>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import api from '../../plugins/axios'

const presences = ref([])
const loading = ref(false)
const dateSelectionnee = ref(new Date().toISOString().split('T')[0])

const headers = [
  { title: 'Salarié', key: 'salarie_nom' },
  { title: 'Statut', key: 'type_presence' },
  { title: 'Arrivée', key: 'heure_arrivee' },
  { title: 'Départ', key: 'heure_depart' },
  { title: 'Commentaire', key: 'commentaire' },
]

const typeColor = (type) => ({
  present: 'success',
  absent_justifie: 'warning',
  absent_non_justifie: 'error',
  maladie: 'orange',
  conge: 'blue',
  formation: 'purple',
  retard: 'amber',
}[type] || 'grey')

const fetchPresences = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/rh/presences/journee/', {
      params: { date: dateSelectionnee.value }
    })
    presences.value = data
  } catch (e) { /* */ }
  loading.value = false
}

watch(dateSelectionnee, fetchPresences)
onMounted(fetchPresences)
</script>
