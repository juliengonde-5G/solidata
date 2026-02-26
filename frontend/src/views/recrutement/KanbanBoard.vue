<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-btn icon="mdi-arrow-left" variant="text" :to="{ name: 'recrutement' }" />
      <h1 class="text-h5 ml-2">Suivi des candidatures</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showNewCandidature = true">
        Nouvelle candidature
      </v-btn>
    </div>

    <div class="kanban-container">
      <div
        v-for="(colonne, etape) in kanbanData"
        :key="etape"
        class="kanban-column"
      >
        <div class="kanban-header" :style="{ borderTopColor: etapeColor(etape) }">
          <span class="font-weight-bold">{{ colonne.label }}</span>
          <v-chip size="x-small" class="ml-2">{{ colonne.candidatures.length }}</v-chip>
        </div>

        <div
          class="kanban-cards"
          @dragover.prevent
          @drop="onDrop($event, etape)"
        >
          <v-card
            v-for="candidature in colonne.candidatures"
            :key="candidature.id"
            class="kanban-card mb-2"
            :draggable="true"
            @dragstart="onDragStart($event, candidature)"
            elevation="1"
          >
            <v-card-text class="pa-3">
              <div class="d-flex align-center mb-1">
                <v-avatar v-if="candidature.candidat_photo" size="32" class="mr-2">
                  <v-img :src="candidature.candidat_photo" />
                </v-avatar>
                <v-avatar v-else size="32" color="primary" class="mr-2">
                  <span class="text-white text-caption">
                    {{ candidature.candidat_nom?.charAt(0) }}
                  </span>
                </v-avatar>
                <div>
                  <div class="font-weight-medium text-body-2">{{ candidature.candidat_nom }}</div>
                  <div class="text-caption text-grey">{{ candidature.poste_vise_nom }}</div>
                </div>
              </div>
              <div class="d-flex align-center mt-2">
                <v-chip size="x-small" class="mr-1" v-if="candidature.nombre_entretiens">
                  <v-icon size="x-small" start>mdi-message</v-icon>
                  {{ candidature.nombre_entretiens }}
                </v-chip>
                <v-spacer />
                <span class="text-caption text-grey">{{ candidature.date_candidature }}</span>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </div>

    <!-- Dialog nouvelle candidature -->
    <v-dialog v-model="showNewCandidature" max-width="700">
      <v-card>
        <v-card-title>Nouvelle candidature</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="newCandidat.prenom" label="Prénom" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="newCandidat.nom" label="Nom" />
            </v-col>
          </v-row>
          <v-text-field v-model="newCandidat.telephone" label="Téléphone" />
          <v-text-field v-model="newCandidat.email" label="Email" type="email" />
          <v-text-field v-model="newCandidat.prescripteur" label="Prescripteur (Pôle Emploi, Mission Locale...)" />
          <v-row>
            <v-col cols="6">
              <v-checkbox v-model="newCandidat.rsa" label="Bénéficiaire RSA" />
            </v-col>
            <v-col cols="6">
              <v-checkbox v-model="newCandidat.rqth" label="RQTH" />
            </v-col>
          </v-row>
          <v-file-input v-model="newCandidat.cv" label="CV" accept=".pdf,.doc,.docx" />
          <v-select
            v-model="newCandidature.poste_vise"
            :items="postes"
            item-title="intitule"
            item-value="id"
            label="Poste visé"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showNewCandidature = false">Annuler</v-btn>
          <v-btn color="primary" @click="creerCandidature">Créer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../plugins/axios'

const route = useRoute()
const campagneId = route.params.campagneId

const kanbanData = ref({})
const postes = ref([])
const showNewCandidature = ref(false)
const newCandidat = ref({ prenom: '', nom: '', telephone: '', email: '', prescripteur: '', rsa: false, rqth: false, cv: null })
const newCandidature = ref({ poste_vise: null })
let draggedItem = null

const etapeColor = (etape) => ({
  reception: '#9E9E9E',
  preselection: '#2196F3',
  entretien: '#FF9800',
  mise_en_situation: '#9C27B0',
  test_personnalite: '#00BCD4',
  decision: '#FFC107',
  accepte: '#4CAF50',
  refuse: '#F44336',
  desistement: '#795548',
}[etape] || '#9E9E9E')

const fetchKanban = async () => {
  try {
    const { data } = await api.get('/recrutement/candidatures/kanban/', {
      params: { campagne: campagneId }
    })
    kanbanData.value = data
  } catch (e) { /* */ }
}

const fetchPostes = async () => {
  try {
    const { data } = await api.get('/recrutement/postes/')
    postes.value = data.results || data
  } catch (e) { /* */ }
}

const onDragStart = (event, candidature) => {
  draggedItem = candidature
  event.dataTransfer.effectAllowed = 'move'
}

const onDrop = async (event, targetEtape) => {
  if (!draggedItem) return
  try {
    await api.post(`/recrutement/candidatures/${draggedItem.id}/deplacer/`, {
      etape: targetEtape,
      ordre_kanban: 0,
    })
    await fetchKanban()
  } catch (e) { /* */ }
  draggedItem = null
}

const creerCandidature = async () => {
  try {
    // Créer le candidat d'abord
    const { data: candidat } = await api.post('/recrutement/candidats/', newCandidat.value)
    // Puis la candidature
    await api.post('/recrutement/candidatures/', {
      candidat: candidat.id,
      campagne: campagneId,
      poste_vise: newCandidature.value.poste_vise,
    })
    showNewCandidature.value = false
    newCandidat.value = { prenom: '', nom: '', telephone: '', email: '', prescripteur: '', rsa: false, rqth: false, cv: null }
    newCandidature.value = { poste_vise: null }
    await fetchKanban()
  } catch (e) { /* */ }
}

onMounted(() => {
  fetchKanban()
  fetchPostes()
})
</script>

<style scoped>
.kanban-container {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 16px;
  min-height: 500px;
}

.kanban-column {
  min-width: 260px;
  max-width: 300px;
  flex-shrink: 0;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 8px;
}

.kanban-header {
  padding: 8px 12px;
  border-top: 3px solid;
  border-radius: 4px;
  background: white;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.kanban-cards {
  min-height: 100px;
}

.kanban-card {
  cursor: grab;
}

.kanban-card:active {
  cursor: grabbing;
}
</style>
