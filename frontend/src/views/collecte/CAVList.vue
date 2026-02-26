<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Bornes d'apport volontaire (CAV)</h1>
      <v-spacer />
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        label="Rechercher"
        density="compact"
        hide-details
        style="max-width: 300px"
      />
    </div>

    <v-data-table :headers="headers" :items="cavList" :search="search" :loading="loading">
      <template v-slot:item.statut="{ item }">
        <v-chip :color="statutColor(item.statut)" size="small">{{ item.statut_display }}</v-chip>
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn icon="mdi-qrcode" size="small" variant="text" @click="voirQRCode(item)" />
      </template>
    </v-data-table>

    <!-- Dialog QR Code -->
    <v-dialog v-model="showQR" max-width="400">
      <v-card v-if="selectedCAV">
        <v-card-title class="text-center">{{ selectedCAV.nom_emplacement }}</v-card-title>
        <v-card-text class="text-center">
          <v-img :src="`/api/collecte/cav/${selectedCAV.id}/qrcode/`" width="300" class="mx-auto" />
          <div class="mt-2 text-body-2">ID: {{ selectedCAV.identifiant }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showQR = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../plugins/axios'

const cavList = ref([])
const search = ref('')
const loading = ref(false)
const showQR = ref(false)
const selectedCAV = ref(null)

const headers = [
  { title: 'ID', key: 'identifiant' },
  { title: 'Emplacement', key: 'nom_emplacement' },
  { title: 'Commune', key: 'commune' },
  { title: 'Type', key: 'type_display' },
  { title: 'Statut', key: 'statut' },
  { title: 'Actions', key: 'actions', sortable: false },
]

const statutColor = (statut) => ({
  actif: 'success', inactif: 'grey', en_maintenance: 'warning', a_remplacer: 'error',
}[statut] || 'grey')

const voirQRCode = (cav) => {
  selectedCAV.value = cav
  showQR.value = true
}

onMounted(async () => {
  loading.value = true
  try {
    const { data } = await api.get('/collecte/cav/')
    cavList.value = data.results || data
  } catch (e) { /* */ }
  loading.value = false
})
</script>
