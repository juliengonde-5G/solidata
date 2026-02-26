<template>
  <div class="mobile-scanner">
    <v-card>
      <v-card-title class="text-center">
        <v-icon size="32" class="mr-2">mdi-qrcode-scan</v-icon>
        Scanner une borne CAV
      </v-card-title>

      <v-card-text>
        <!-- Zone caméra -->
        <div class="scanner-area mb-4">
          <div id="qr-reader-mobile" ref="qrReaderRef"></div>
        </div>

        <v-divider class="mb-4" />

        <!-- Saisie manuelle -->
        <v-text-field
          v-model="codeManuel"
          label="Code de la borne (saisie manuelle)"
          prepend-inner-icon="mdi-keyboard"
          append-inner-icon="mdi-magnify"
          @click:append-inner="rechercherManuel"
          @keyup.enter="rechercherManuel"
        />
      </v-card-text>
    </v-card>

    <!-- Résultat du scan -->
    <v-card v-if="cavTrouvee" class="mt-4" color="green-lighten-5">
      <v-card-title>
        <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
        {{ cavTrouvee.nom_emplacement }}
      </v-card-title>
      <v-card-subtitle>{{ cavTrouvee.adresse }}</v-card-subtitle>
      <v-card-text>
        <div class="text-body-2">ID: {{ cavTrouvee.identifiant }}</div>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" block>
          Accéder à la collecte en cours
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-alert v-if="erreur" type="error" variant="tonal" class="mt-4">
      {{ erreur }}
    </v-alert>

    <!-- Collectes du jour rapide -->
    <v-card class="mt-4">
      <v-card-title>Mes collectes du jour</v-card-title>
      <v-list>
        <v-list-item
          v-for="c in collectesDuJour"
          :key="c.id"
          :to="{ name: 'mobile-collecte', params: { collecteId: c.id } }"
        >
          <v-list-item-title>{{ c.tournee_nom }}</v-list-item-title>
          <v-list-item-subtitle>{{ c.vehicule_nom }}</v-list-item-subtitle>
          <template v-slot:append>
            <v-chip :color="statutColor(c.statut)" size="x-small">{{ c.statut_display }}</v-chip>
          </template>
        </v-list-item>
      </v-list>
      <v-card-text v-if="!collectesDuJour.length" class="text-grey text-center">
        Aucune collecte aujourd'hui
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../plugins/axios'

const codeManuel = ref('')
const cavTrouvee = ref(null)
const erreur = ref('')
const collectesDuJour = ref([])

const statutColor = (s) => ({
  planifiee: 'grey', en_cours: 'blue', terminee: 'green', annulee: 'red',
}[s] || 'grey')

const rechercherManuel = async () => {
  erreur.value = ''
  cavTrouvee.value = null
  if (!codeManuel.value) return

  try {
    const { data } = await api.get(`/collecte/cav/scan/${codeManuel.value}/`)
    cavTrouvee.value = data
  } catch (e) {
    erreur.value = 'Borne non trouvée. Vérifiez le code.'
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get('/collecte/collectes/du_jour/')
    collectesDuJour.value = data
  } catch (e) { /* */ }
})
</script>

<style scoped>
.mobile-scanner {
  max-width: 500px;
  margin: 0 auto;
}

.scanner-area {
  min-height: 300px;
  background: #000;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
