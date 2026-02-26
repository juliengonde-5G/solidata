<template>
  <div>
    <h1 class="text-h4 mb-6">Tableau de bord</h1>

    <!-- Indicateurs clés -->
    <v-row>
      <v-col cols="12" sm="6" md="3">
        <v-card color="primary" theme="dark">
          <v-card-text class="d-flex align-center">
            <v-icon size="48" class="mr-4">mdi-truck</v-icon>
            <div>
              <div class="text-h4">{{ stats.collectesDuJour }}</div>
              <div class="text-body-2">Collectes du jour</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="secondary" theme="dark">
          <v-card-text class="d-flex align-center">
            <v-icon size="48" class="mr-4">mdi-weight-kilogram</v-icon>
            <div>
              <div class="text-h4">{{ stats.poidsJour }} kg</div>
              <div class="text-body-2">Collecté aujourd'hui</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="accent" theme="dark">
          <v-card-text class="d-flex align-center">
            <v-icon size="48" class="mr-4">mdi-account-group</v-icon>
            <div>
              <div class="text-h4">{{ stats.salariesActifs }}</div>
              <div class="text-body-2">Salariés actifs</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="info" theme="dark">
          <v-card-text class="d-flex align-center">
            <v-icon size="48" class="mr-4">mdi-account-search</v-icon>
            <div>
              <div class="text-h4">{{ stats.candidaturesEnCours }}</div>
              <div class="text-body-2">Candidatures en cours</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <!-- Collectes du jour -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-truck</v-icon>
            Collectes du jour
          </v-card-title>
          <v-card-text>
            <v-list v-if="collectesDuJour.length">
              <v-list-item
                v-for="c in collectesDuJour"
                :key="c.id"
                :subtitle="c.vehicule_nom"
              >
                <template v-slot:prepend>
                  <v-chip
                    :color="statutColor(c.statut)"
                    size="small"
                    class="mr-2"
                  >
                    {{ c.statut_display }}
                  </v-chip>
                </template>
                <v-list-item-title>{{ c.tournee_nom }}</v-list-item-title>
                <template v-slot:append>
                  <span v-if="c.poids_total_kg" class="font-weight-bold">
                    {{ c.poids_total_kg }} kg
                  </span>
                </template>
              </v-list-item>
            </v-list>
            <div v-else class="text-center text-grey pa-4">
              Aucune collecte planifiée aujourd'hui
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Alertes -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-alert</v-icon>
            Alertes
          </v-card-title>
          <v-card-text>
            <v-alert
              v-for="alerte in alertes"
              :key="alerte.id"
              :type="alerte.type"
              variant="tonal"
              class="mb-2"
              density="compact"
            >
              {{ alerte.message }}
            </v-alert>
            <div v-if="!alertes.length" class="text-center text-grey pa-4">
              Aucune alerte
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Incidents ouverts -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-alert-circle</v-icon>
            Incidents ouverts
            <v-spacer />
            <v-btn size="small" color="primary" :to="{ name: 'incidents' }">Voir tous</v-btn>
          </v-card-title>
          <v-table v-if="incidents.length">
            <thead>
              <tr>
                <th>Priorité</th>
                <th>Titre</th>
                <th>Type</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inc in incidents.slice(0, 5)" :key="inc.id">
                <td>
                  <v-chip :color="prioriteColor(inc.priorite)" size="small">
                    {{ inc.priorite_display }}
                  </v-chip>
                </td>
                <td>{{ inc.titre }}</td>
                <td>{{ inc.type_display }}</td>
                <td>{{ inc.date_signalement }}</td>
              </tr>
            </tbody>
          </v-table>
          <v-card-text v-else class="text-center text-grey">
            Aucun incident ouvert
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../plugins/axios'

const stats = ref({
  collectesDuJour: 0,
  poidsJour: 0,
  salariesActifs: 0,
  candidaturesEnCours: 0,
})

const collectesDuJour = ref([])
const alertes = ref([])
const incidents = ref([])

const statutColor = (statut) => {
  const colors = {
    planifiee: 'grey',
    en_cours: 'blue',
    terminee: 'green',
    annulee: 'red',
  }
  return colors[statut] || 'grey'
}

const prioriteColor = (priorite) => {
  const colors = {
    basse: 'green',
    normale: 'blue',
    haute: 'orange',
    urgente: 'red',
  }
  return colors[priorite] || 'grey'
}

onMounted(async () => {
  try {
    const [collectesRes, incidentsRes] = await Promise.all([
      api.get('/collecte/collectes/du_jour/'),
      api.get('/collecte/incidents/', { params: { statut: 'ouvert' } }),
    ])
    collectesDuJour.value = collectesRes.data
    incidents.value = incidentsRes.data.results || incidentsRes.data

    stats.value.collectesDuJour = collectesDuJour.value.length
    stats.value.poidsJour = collectesDuJour.value
      .reduce((sum, c) => sum + (parseFloat(c.poids_total_kg) || 0), 0)
      .toFixed(0)
  } catch (e) {
    // API non connectée en dev
  }
})
</script>
