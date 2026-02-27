<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Collectes du jour</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreate = true">
        Nouvelle collecte
      </v-btn>
    </div>

    <v-row>
      <v-col v-for="collecte in collectes" :key="collecte.id" cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            {{ collecte.tournee_nom }}
            <v-spacer />
            <v-chip :color="statutColor(collecte.statut)" size="small">
              {{ collecte.statut_display }}
            </v-chip>
          </v-card-title>
          <v-card-subtitle>{{ collecte.vehicule_nom }}</v-card-subtitle>
          <v-card-text>
            <v-row>
              <v-col cols="6">
                <div class="text-body-2">CAV visitées</div>
                <div class="text-h6">{{ collecte.nombre_cav_visitees || 0 }}</div>
              </v-col>
              <v-col cols="6">
                <div class="text-body-2">Poids collecté</div>
                <div class="text-h6">
                  {{ collecte.poids_total_kg ? `${collecte.poids_total_kg} kg` : '-' }}
                </div>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-btn
              v-if="collecte.statut === 'planifiee'"
              color="primary"
              :to="{ name: 'mobile-collecte', params: { collecteId: collecte.id } }"
            >
              Démarrer
            </v-btn>
            <v-btn
              v-if="collecte.statut === 'en_cours'"
              color="success"
              :to="{ name: 'mobile-collecte', params: { collecteId: collecte.id } }"
            >
              Continuer
            </v-btn>
            <v-icon v-if="collecte.verrouille" color="grey" class="ml-auto">mdi-lock</v-icon>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <div v-if="!collectes.length" class="text-center text-grey pa-8">
      Aucune collecte planifiée aujourd'hui
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../plugins/axios'

const collectes = ref([])
const showCreate = ref(false)

const statutColor = (statut) => ({
  planifiee: 'grey', en_cours: 'blue', terminee: 'green', annulee: 'red',
}[statut] || 'grey')

onMounted(async () => {
  try {
    const { data } = await api.get('/collecte/collectes/du_jour/')
    collectes.value = data
  } catch (e) { /* */ }
})
</script>
