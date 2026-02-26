<template>
  <div v-if="salarie">
    <div class="d-flex align-center mb-4">
      <v-btn icon="mdi-arrow-left" variant="text" @click="$router.back()" />
      <h1 class="text-h5 ml-2">{{ salarie.prenom }} {{ salarie.nom }}</h1>
      <v-chip class="ml-3" :color="statutColor(salarie.statut)" size="small">{{ salarie.statut }}</v-chip>
    </div>

    <v-row>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Informations</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item prepend-icon="mdi-badge-account" :title="salarie.matricule" subtitle="Matricule" />
              <v-list-item prepend-icon="mdi-briefcase" :title="salarie.service_display" subtitle="Service" />
              <v-list-item prepend-icon="mdi-file-document" :title="salarie.type_contrat" subtitle="Contrat" />
              <v-list-item prepend-icon="mdi-calendar" :title="salarie.date_debut_contrat" subtitle="Début contrat" />
              <v-list-item v-if="salarie.date_fin_contrat" prepend-icon="mdi-calendar-end" :title="salarie.date_fin_contrat" subtitle="Fin contrat" />
              <v-list-item prepend-icon="mdi-phone" :title="salarie.telephone" subtitle="Téléphone" />
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>
            Compétences & Certifications
            <v-spacer />
          </v-card-title>
          <v-card-text>
            <v-chip
              v-for="comp in salarie.competences"
              :key="comp.id"
              :color="comp.est_valide ? 'success' : 'error'"
              class="ma-1"
            >
              <v-icon start>{{ comp.est_valide ? 'mdi-check' : 'mdi-alert' }}</v-icon>
              {{ comp.competence_nom }}
              <span v-if="comp.date_expiration" class="ml-1 text-caption">
                (exp. {{ comp.date_expiration }})
              </span>
            </v-chip>
            <div v-if="!salarie.competences?.length" class="text-grey">
              Aucune compétence enregistrée
            </div>
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
const salarie = ref(null)

const statutColor = (statut) => ({
  actif: 'success', suspendu: 'warning', sorti: 'grey',
}[statut] || 'grey')

onMounted(async () => {
  try {
    const { data } = await api.get(`/rh/salaries/${route.params.id}/`)
    salarie.value = data
  } catch (e) { /* */ }
})
</script>
