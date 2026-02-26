<template>
  <div v-if="candidat">
    <div class="d-flex align-center mb-4">
      <v-btn icon="mdi-arrow-left" variant="text" @click="$router.back()" />
      <h1 class="text-h5 ml-2">{{ candidat.prenom }} {{ candidat.nom }}</h1>
    </div>

    <v-row>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Informations</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item prepend-icon="mdi-phone" :title="candidat.telephone" subtitle="Téléphone" />
              <v-list-item prepend-icon="mdi-email" :title="candidat.email" subtitle="Email" />
              <v-list-item prepend-icon="mdi-map-marker" :title="candidat.adresse" subtitle="Adresse" />
              <v-list-item prepend-icon="mdi-account-tie" :title="candidat.prescripteur" subtitle="Prescripteur" />
            </v-list>
            <div class="d-flex gap-2 mt-2">
              <v-chip v-if="candidat.rsa" color="info" size="small">RSA</v-chip>
              <v-chip v-if="candidat.rqth" color="warning" size="small">RQTH</v-chip>
            </div>
            <v-btn
              v-if="candidat.cv"
              class="mt-4"
              color="primary"
              variant="outlined"
              :href="candidat.cv"
              target="_blank"
              prepend-icon="mdi-file-document"
              block
            >
              Voir le CV
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Candidatures</v-card-title>
          <v-card-text>
            <v-timeline side="end" density="compact">
              <v-timeline-item
                v-for="c in candidatures"
                :key="c.id"
                :dot-color="etapeColor(c.etape)"
                size="small"
              >
                <v-card variant="tonal">
                  <v-card-text>
                    <div class="font-weight-bold">{{ c.etape_display }}</div>
                    <div class="text-caption">{{ c.poste_vise_nom }} - {{ c.date_candidature }}</div>
                    <div v-if="c.commentaire" class="mt-1 text-body-2">{{ c.commentaire }}</div>
                  </v-card-text>
                </v-card>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Entretiens</v-card-title>
          <v-card-text>
            <div v-for="entretien in entretiens" :key="entretien.id" class="mb-4">
              <div class="d-flex align-center">
                <v-chip :color="avisColor(entretien.avis)" size="small" class="mr-2">
                  {{ entretien.avis || 'En attente' }}
                </v-chip>
                <span class="font-weight-medium">{{ entretien.type_display }} - {{ entretien.date }}</span>
              </div>
              <div v-if="entretien.compte_rendu" class="text-body-2 mt-1">{{ entretien.compte_rendu }}</div>
              <div v-if="entretien.points_forts" class="mt-1">
                <strong>Points forts :</strong> {{ entretien.points_forts }}
              </div>
              <div v-if="entretien.points_vigilance" class="mt-1">
                <strong>Vigilance :</strong> {{ entretien.points_vigilance }}
              </div>
            </div>
            <div v-if="!entretiens.length" class="text-grey">Aucun entretien</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../plugins/axios'

const route = useRoute()
const candidat = ref(null)
const candidatures = ref([])
const entretiens = ref([])

const etapeColor = (etape) => ({
  reception: 'grey', preselection: 'blue', entretien: 'orange',
  mise_en_situation: 'purple', test_personnalite: 'cyan',
  decision: 'amber', accepte: 'green', refuse: 'red', desistement: 'brown',
}[etape] || 'grey')

const avisColor = (avis) => ({
  favorable: 'green', reserve: 'orange', defavorable: 'red',
}[avis] || 'grey')

onMounted(async () => {
  try {
    const [candidatRes, candidaturesRes] = await Promise.all([
      api.get(`/recrutement/candidats/${route.params.id}/`),
      api.get('/recrutement/candidatures/', { params: { candidat: route.params.id } }),
    ])
    candidat.value = candidatRes.data
    candidatures.value = candidaturesRes.data.results || candidaturesRes.data

    if (candidatures.value.length) {
      const entretienRes = await api.get('/recrutement/entretiens/', {
        params: { candidature: candidatures.value[0].id }
      })
      entretiens.value = entretienRes.data.results || entretienRes.data
    }
  } catch (e) { /* */ }
})
</script>
