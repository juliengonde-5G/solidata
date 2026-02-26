<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Candidats</h1>
      <v-spacer />
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        label="Rechercher"
        density="compact"
        hide-details
        class="mr-4"
        style="max-width: 300px"
      />
    </div>

    <v-data-table
      :headers="headers"
      :items="candidats"
      :search="search"
      :loading="loading"
    >
      <template v-slot:item.nom_complet="{ item }">
        <router-link :to="{ name: 'candidat-detail', params: { id: item.id } }" class="text-decoration-none">
          {{ item.prenom }} {{ item.nom }}
        </router-link>
      </template>
      <template v-slot:item.rsa="{ item }">
        <v-icon v-if="item.rsa" color="success">mdi-check</v-icon>
      </template>
      <template v-slot:item.rqth="{ item }">
        <v-icon v-if="item.rqth" color="success">mdi-check</v-icon>
      </template>
    </v-data-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../plugins/axios'

const candidats = ref([])
const search = ref('')
const loading = ref(false)

const headers = [
  { title: 'Nom', key: 'nom_complet' },
  { title: 'Téléphone', key: 'telephone' },
  { title: 'Prescripteur', key: 'prescripteur' },
  { title: 'RSA', key: 'rsa', align: 'center' },
  { title: 'RQTH', key: 'rqth', align: 'center' },
  { title: 'Date', key: 'date_creation' },
]

onMounted(async () => {
  loading.value = true
  try {
    const { data } = await api.get('/recrutement/candidats/')
    candidats.value = data.results || data
  } catch (e) { /* */ }
  loading.value = false
})
</script>
