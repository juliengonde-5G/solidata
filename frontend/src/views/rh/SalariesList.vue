<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Salariés</h1>
      <v-spacer />
      <v-select
        v-model="filtreService"
        :items="services"
        label="Service"
        density="compact"
        hide-details
        clearable
        class="mr-4"
        style="max-width: 200px"
      />
    </div>

    <v-data-table :headers="headers" :items="salariesFiltres" :loading="loading">
      <template v-slot:item.nom_complet="{ item }">
        <router-link :to="{ name: 'salarie-detail', params: { id: item.id } }" class="text-decoration-none">
          {{ item.nom_complet }}
        </router-link>
      </template>
      <template v-slot:item.statut="{ item }">
        <v-chip :color="statutColor(item.statut)" size="small">{{ item.statut }}</v-chip>
      </template>
    </v-data-table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../plugins/axios'

const salaries = ref([])
const loading = ref(false)
const filtreService = ref(null)

const headers = [
  { title: 'Matricule', key: 'matricule' },
  { title: 'Nom', key: 'nom_complet' },
  { title: 'Service', key: 'service_display' },
  { title: 'Statut', key: 'statut' },
]

const services = [
  { title: 'Collecte', value: 'collecte' },
  { title: 'Tri', value: 'tri' },
  { title: 'Logistique', value: 'logistique' },
  { title: 'Boutique', value: 'boutique' },
  { title: 'Administratif', value: 'administratif' },
]

const statutColor = (statut) => ({
  actif: 'success', suspendu: 'warning', sorti: 'grey',
}[statut] || 'grey')

const salariesFiltres = computed(() => {
  if (!filtreService.value) return salaries.value
  return salaries.value.filter(s => s.service === filtreService.value)
})

onMounted(async () => {
  loading.value = true
  try {
    const { data } = await api.get('/rh/salaries/')
    salaries.value = data.results || data
  } catch (e) { /* */ }
  loading.value = false
})
</script>
