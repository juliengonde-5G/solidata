<template>
  <div class="mobile-collecte">
    <!-- En-tête collecte -->
    <v-card v-if="collecte" class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-btn icon="mdi-arrow-left" variant="text" size="small" @click="$router.back()" />
        {{ collecte.tournee_nom }}
        <v-spacer />
        <v-chip :color="statutColor(collecte.statut)" size="small">
          {{ collecte.statut_display }}
        </v-chip>
      </v-card-title>
      <v-card-text>
        <div class="text-body-2">{{ collecte.vehicule_nom }}</div>
        <v-progress-linear
          :model-value="progressionTournee"
          color="primary"
          height="8"
          rounded
          class="mt-2"
        />
        <div class="text-caption text-center mt-1">
          {{ collecte.passages?.length || 0 }} / {{ totalCAV }} CAV visitées
        </div>
      </v-card-text>
    </v-card>

    <!-- Démarrage de la collecte -->
    <v-card v-if="collecte?.statut === 'planifiee'" class="mb-4">
      <v-card-title>Démarrer la collecte</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="kilometrageDepart"
          label="Kilométrage départ"
          type="number"
          prepend-icon="mdi-speedometer"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" block size="large" @click="demarrer">
          <v-icon start>mdi-play</v-icon>
          Démarrer la tournée
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Collecte en cours -->
    <template v-if="collecte?.statut === 'en_cours'">
      <!-- Bouton scanner -->
      <v-btn
        color="primary"
        size="x-large"
        block
        class="mb-4"
        @click="ouvrirScanner"
        prepend-icon="mdi-qrcode-scan"
      >
        Scanner une CAV
      </v-btn>

      <!-- CAV scannée - saisie niveau de remplissage -->
      <v-card v-if="cavScannee" class="mb-4" color="blue-lighten-5">
        <v-card-title>{{ cavScannee.nom_emplacement }}</v-card-title>
        <v-card-subtitle>{{ cavScannee.adresse }}</v-card-subtitle>
        <v-card-text>
          <div class="text-body-2 mb-3">Niveau de remplissage :</div>
          <v-btn-toggle v-model="niveauRemplissage" mandatory class="d-flex flex-wrap">
            <v-btn value="vide" size="small">0%</v-btn>
            <v-btn value="quart" size="small">25%</v-btn>
            <v-btn value="moitie" size="small">50%</v-btn>
            <v-btn value="trois_quarts" size="small">75%</v-btn>
            <v-btn value="plein" size="small">100%</v-btn>
            <v-btn value="debordement" size="small" color="red">D&eacute;bord.</v-btn>
          </v-btn-toggle>

          <v-checkbox v-model="collecteEffectuee" label="Collecte effectuée" class="mt-2" />
        </v-card-text>
        <v-card-actions>
          <v-btn color="success" block @click="enregistrerPassage">
            <v-icon start>mdi-check</v-icon>
            Valider le passage
          </v-btn>
        </v-card-actions>
      </v-card>

      <!-- Signaler un incident -->
      <v-btn
        color="warning"
        variant="outlined"
        block
        class="mb-4"
        @click="showIncident = true"
        prepend-icon="mdi-alert"
      >
        Signaler un incident
      </v-btn>

      <!-- Historique des passages de cette collecte -->
      <v-card>
        <v-card-title>Passages effectués</v-card-title>
        <v-list v-if="collecte.passages?.length">
          <v-list-item
            v-for="p in collecte.passages"
            :key="p.id"
            :title="p.cav_nom"
            :subtitle="p.heure_passage"
          >
            <template v-slot:append>
              <v-chip size="x-small" :color="niveauColor(p.niveau_remplissage)">
                {{ p.niveau_display }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>
        <v-card-text v-else class="text-grey text-center">
          Aucun passage encore
        </v-card-text>
      </v-card>

      <!-- Terminer la collecte -->
      <v-card class="mt-4">
        <v-card-title>Terminer la collecte</v-card-title>
        <v-card-text>
          <v-text-field
            v-model.number="poidsTotal"
            label="Poids total collecté (kg)"
            type="number"
            prepend-icon="mdi-weight-kilogram"
          />
          <v-text-field
            v-model.number="kilometrageRetour"
            label="Kilométrage retour"
            type="number"
            prepend-icon="mdi-speedometer"
          />
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="success"
            block
            size="large"
            :disabled="!poidsTotal"
            @click="terminer"
          >
            <v-icon start>mdi-lock</v-icon>
            Peser et verrouiller
          </v-btn>
        </v-card-actions>
      </v-card>
    </template>

    <!-- Collecte terminée -->
    <v-card v-if="collecte?.statut === 'terminee'" class="text-center pa-8">
      <v-icon size="64" color="success">mdi-check-circle</v-icon>
      <h2 class="mt-4">Collecte terminée</h2>
      <div class="text-h4 mt-2">{{ collecte.poids_total_kg }} kg</div>
      <div class="text-body-2 mt-1">{{ collecte.passages?.length || 0 }} CAV visitées</div>
    </v-card>

    <!-- Dialog incident -->
    <v-dialog v-model="showIncident" max-width="500">
      <v-card>
        <v-card-title>Signaler un incident</v-card-title>
        <v-card-text>
          <v-select
            v-model="incident.type_incident"
            :items="typesIncident"
            label="Type"
          />
          <v-select
            v-model="incident.priorite"
            :items="priorites"
            label="Priorité"
          />
          <v-text-field v-model="incident.titre" label="Titre" />
          <v-textarea v-model="incident.description" label="Description" rows="3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showIncident = false">Annuler</v-btn>
          <v-btn color="warning" @click="envoyerIncident">Envoyer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog scanner QR -->
    <v-dialog v-model="showScanner" fullscreen>
      <v-card>
        <v-card-title class="d-flex align-center">
          Scanner QR Code
          <v-spacer />
          <v-btn icon="mdi-close" @click="showScanner = false" />
        </v-card-title>
        <v-card-text>
          <div id="qr-reader" style="width: 100%"></div>
          <v-text-field
            v-model="manualQR"
            label="Ou saisir le code manuellement"
            class="mt-4"
            append-inner-icon="mdi-check"
            @click:append-inner="rechercherCAV(manualQR)"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../plugins/axios'

const route = useRoute()
const collecteId = route.params.collecteId

const collecte = ref(null)
const totalCAV = ref(0)
const cavScannee = ref(null)
const niveauRemplissage = ref('moitie')
const collecteEffectuee = ref(true)
const poidsTotal = ref(null)
const kilometrageDepart = ref(null)
const kilometrageRetour = ref(null)
const showScanner = ref(false)
const showIncident = ref(false)
const manualQR = ref('')

const incident = ref({
  type_incident: '', priorite: 'normale', titre: '', description: '',
})

const typesIncident = [
  { title: 'CAV endommagée', value: 'cav_endommagee' },
  { title: 'CAV inaccessible', value: 'cav_inaccessible' },
  { title: 'Dépôt sauvage', value: 'depot_sauvage' },
  { title: 'Problème véhicule', value: 'probleme_vehicule' },
  { title: 'Sécurité', value: 'securite' },
  { title: 'Autre', value: 'autre' },
]

const priorites = [
  { title: 'Basse', value: 'basse' },
  { title: 'Normale', value: 'normale' },
  { title: 'Haute', value: 'haute' },
  { title: 'Urgente', value: 'urgente' },
]

const progressionTournee = computed(() => {
  if (!totalCAV.value) return 0
  return ((collecte.value?.passages?.length || 0) / totalCAV.value) * 100
})

const statutColor = (s) => ({
  planifiee: 'grey', en_cours: 'blue', terminee: 'green', annulee: 'red',
}[s] || 'grey')

const niveauColor = (n) => ({
  vide: 'grey', quart: 'green', moitie: 'blue', trois_quarts: 'orange', plein: 'red', debordement: 'red-darken-3',
}[n] || 'grey')

const fetchCollecte = async () => {
  try {
    const { data } = await api.get(`/collecte/collectes/${collecteId}/`)
    collecte.value = data
  } catch (e) { /* */ }
}

const demarrer = async () => {
  try {
    const { data } = await api.post(`/collecte/collectes/${collecteId}/demarrer/`, {
      kilometrage_depart: kilometrageDepart.value,
    })
    collecte.value = data
  } catch (e) { /* */ }
}

const ouvrirScanner = () => {
  showScanner.value = true
}

const rechercherCAV = async (qrCode) => {
  try {
    const { data } = await api.get(`/collecte/cav/scan/${qrCode}/`)
    cavScannee.value = data
    showScanner.value = false
    niveauRemplissage.value = 'moitie'
    collecteEffectuee.value = true
  } catch (e) {
    alert('CAV non trouvée')
  }
}

const enregistrerPassage = async () => {
  if (!cavScannee.value) return

  // Récupérer la géolocalisation si possible
  let lat = null, lng = null
  if (navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      })
      lat = pos.coords.latitude
      lng = pos.coords.longitude
    } catch (e) { /* GPS indisponible */ }
  }

  try {
    await api.post(`/collecte/collectes/${collecteId}/passage/`, {
      cav: cavScannee.value.id,
      niveau_remplissage: niveauRemplissage.value,
      collecte_effectuee: collecteEffectuee.value,
      latitude: lat,
      longitude: lng,
    })
    cavScannee.value = null
    await fetchCollecte()
  } catch (e) { /* */ }
}

const terminer = async () => {
  try {
    const { data } = await api.post(`/collecte/collectes/${collecteId}/peser/`, {
      poids_total_kg: poidsTotal.value,
      kilometrage_retour: kilometrageRetour.value,
    })
    collecte.value = data
  } catch (e) { /* */ }
}

const envoyerIncident = async () => {
  try {
    await api.post('/collecte/incidents/', {
      ...incident.value,
      collecte: collecteId,
    })
    showIncident.value = false
    incident.value = { type_incident: '', priorite: 'normale', titre: '', description: '' }
  } catch (e) { /* */ }
}

onMounted(fetchCollecte)
</script>

<style scoped>
.mobile-collecte {
  max-width: 600px;
  margin: 0 auto;
}
</style>
