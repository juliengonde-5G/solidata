<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-btn icon="mdi-arrow-left" variant="text" @click="$router.back()" />
      <h1 class="text-h5 ml-2">Test de personnalité</h1>
      <v-spacer />
      <v-btn-toggle v-model="modeVisuel" mandatory>
        <v-btn :value="false" prepend-icon="mdi-text">Texte</v-btn>
        <v-btn :value="true" prepend-icon="mdi-image">Visuel</v-btn>
      </v-btn-toggle>
    </div>

    <v-card v-if="test && !termine" class="mx-auto" max-width="800">
      <!-- Barre de progression -->
      <v-progress-linear
        :model-value="progression"
        color="primary"
        height="8"
      />

      <v-card-title class="text-center">
        Question {{ questionIndex + 1 }} / {{ test.questions.length }}
      </v-card-title>

      <v-card-text v-if="questionCourante">
        <!-- Mode textuel -->
        <template v-if="!modeVisuel">
          <h2 class="text-h6 mb-4 text-center">{{ questionCourante.texte }}</h2>
        </template>

        <!-- Mode visuel (pictogrammes) pour personnes avec difficultés linguistiques -->
        <template v-else>
          <div class="text-center mb-4">
            <v-img
              v-if="questionCourante.pictogramme"
              :src="questionCourante.pictogramme"
              height="200"
              contain
              class="mx-auto mb-2"
            />
            <h2 class="text-h6">{{ questionCourante.texte }}</h2>
          </div>
        </template>

        <!-- Choix unique -->
        <template v-if="questionCourante.type_question === 'choix_unique'">
          <v-row justify="center">
            <v-col
              v-for="choix in questionCourante.choix"
              :key="choix.id"
              cols="12" sm="6"
            >
              <v-card
                :color="reponse === choix.id ? 'primary' : undefined"
                :theme="reponse === choix.id ? 'dark' : undefined"
                class="text-center pa-4 cursor-pointer"
                @click="reponse = choix.id"
                variant="outlined"
                :class="{ 'border-primary': reponse === choix.id }"
              >
                <v-img
                  v-if="modeVisuel && choix.pictogramme"
                  :src="choix.pictogramme"
                  height="80"
                  contain
                  class="mb-2"
                />
                <div class="text-body-1">{{ choix.texte }}</div>
              </v-card>
            </v-col>
          </v-row>
        </template>

        <!-- Échelle 1-5 -->
        <template v-if="questionCourante.type_question === 'echelle'">
          <div class="text-center">
            <div v-if="modeVisuel" class="d-flex justify-center mb-4">
              <v-btn
                v-for="n in 5"
                :key="n"
                :color="reponse === n ? 'primary' : 'grey-lighten-2'"
                :size="modeVisuel ? 'x-large' : 'large'"
                icon
                class="mx-2"
                @click="reponse = n"
              >
                <v-icon v-if="modeVisuel">
                  {{ n <= 2 ? 'mdi-emoticon-sad' : n === 3 ? 'mdi-emoticon-neutral' : 'mdi-emoticon-happy' }}
                </v-icon>
                <span v-else>{{ n }}</span>
              </v-btn>
            </div>
            <div v-else>
              <v-slider
                v-model="reponse"
                :min="1"
                :max="5"
                :step="1"
                show-ticks="always"
                thumb-label="always"
                tick-size="4"
              />
              <div class="d-flex justify-space-between text-caption">
                <span>Pas du tout d'accord</span>
                <span>Tout à fait d'accord</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Texte libre -->
        <template v-if="questionCourante.type_question === 'texte_libre'">
          <v-textarea
            v-model="reponseTexte"
            label="Votre réponse"
            rows="4"
          />
        </template>
      </v-card-text>

      <v-card-actions class="justify-space-between pa-4">
        <v-btn
          :disabled="questionIndex === 0"
          @click="questionPrecedente"
          prepend-icon="mdi-arrow-left"
        >
          Précédent
        </v-btn>
        <v-btn
          v-if="questionIndex < test.questions.length - 1"
          color="primary"
          @click="questionSuivante"
          append-icon="mdi-arrow-right"
        >
          Suivant
        </v-btn>
        <v-btn
          v-else
          color="success"
          @click="terminerTest"
          append-icon="mdi-check"
        >
          Terminer
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Résultats -->
    <v-card v-if="termine" class="mx-auto" max-width="600">
      <v-card-title class="text-center">
        <v-icon color="success" size="64">mdi-check-circle</v-icon>
        <div class="mt-2">Test terminé</div>
      </v-card-title>
      <v-card-text v-if="scores" class="text-center">
        <h3 class="mb-4">Résultats par catégorie</h3>
        <v-row>
          <v-col v-for="(score, categorie) in scores" :key="categorie" cols="6">
            <v-progress-circular
              :model-value="score * 20"
              :size="80"
              :width="8"
              color="primary"
            >
              {{ score }}/5
            </v-progress-circular>
            <div class="text-body-2 mt-2">{{ categorieLabel(categorie) }}</div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../plugins/axios'

const route = useRoute()
const passationId = route.params.passationId

const test = ref(null)
const passation = ref(null)
const questionIndex = ref(0)
const reponse = ref(null)
const reponseTexte = ref('')
const modeVisuel = ref(false)
const termine = ref(false)
const scores = ref(null)
const reponses = ref({})

const questionCourante = computed(() => {
  return test.value?.questions?.[questionIndex.value]
})

const progression = computed(() => {
  if (!test.value?.questions?.length) return 0
  return ((questionIndex.value + 1) / test.value.questions.length) * 100
})

const categorieLabel = (cat) => ({
  motivation: 'Motivation',
  relationnel: 'Relationnel',
  organisation: 'Organisation',
  adaptation: 'Adaptation',
  stress: 'Gestion du stress',
}[cat] || cat)

const questionSuivante = async () => {
  await sauvegarderReponse()
  questionIndex.value++
  chargerReponse()
}

const questionPrecedente = () => {
  questionIndex.value--
  chargerReponse()
}

const chargerReponse = () => {
  const q = questionCourante.value
  if (!q) return
  const r = reponses.value[q.id]
  if (r) {
    reponse.value = r.valeur || r.choix
    reponseTexte.value = r.texte || ''
  } else {
    reponse.value = null
    reponseTexte.value = ''
  }
}

const sauvegarderReponse = async () => {
  const q = questionCourante.value
  if (!q) return

  const data = {
    question: q.id,
  }

  if (q.type_question === 'choix_unique' || q.type_question === 'choix_multiple') {
    data.choix_selectionne = reponse.value
    const choix = q.choix.find(c => c.id === reponse.value)
    data.valeur_numerique = choix?.valeur
  } else if (q.type_question === 'echelle') {
    data.valeur_numerique = reponse.value
  } else if (q.type_question === 'texte_libre') {
    data.texte_libre = reponseTexte.value
  }

  reponses.value[q.id] = { valeur: reponse.value, choix: reponse.value, texte: reponseTexte.value }

  try {
    await api.post(`/recrutement/passations/${passationId}/soumettre_reponse/`, data)
  } catch (e) { /* */ }
}

const terminerTest = async () => {
  await sauvegarderReponse()
  try {
    const { data } = await api.post(`/recrutement/passations/${passationId}/terminer/`)
    scores.value = data.scores
    termine.value = true
  } catch (e) { /* */ }
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/recrutement/passations/${passationId}/`)
    passation.value = data
    test.value = { questions: [] }
    // Charger le test complet
    const testRes = await api.get(`/recrutement/tests/${data.test}/`)
    test.value = testRes.data
    modeVisuel.value = data.mode_visuel
  } catch (e) { /* */ }
})
</script>
