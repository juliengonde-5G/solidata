<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Véhicules</h1>
    </div>

    <v-row>
      <v-col v-for="v in vehicules" :key="v.id" cols="12" md="6" lg="3">
        <v-card>
          <v-img v-if="v.photo" :src="v.photo" height="150" cover />
          <v-card-title>{{ v.nom }}</v-card-title>
          <v-card-subtitle>{{ v.immatriculation }}</v-card-subtitle>
          <v-card-text>
            <v-chip :color="statutColor(v.statut)" size="small" class="mb-2">
              {{ v.statut_display }}
            </v-chip>
            <v-list density="compact">
              <v-list-item>
                <template v-slot:prepend><v-icon size="small">mdi-speedometer</v-icon></template>
                {{ v.kilometrage }} km
              </v-list-item>
              <v-list-item v-if="v.date_prochain_controle_technique">
                <template v-slot:prepend><v-icon size="small">mdi-wrench</v-icon></template>
                CT: {{ v.date_prochain_controle_technique }}
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../plugins/axios'

const vehicules = ref([])

const statutColor = (statut) => ({
  disponible: 'success', en_tournee: 'blue', maintenance: 'orange', hors_service: 'red',
}[statut] || 'grey')

onMounted(async () => {
  try {
    const { data } = await api.get('/collecte/vehicules/')
    vehicules.value = data.results || data
  } catch (e) { /* */ }
})
</script>
