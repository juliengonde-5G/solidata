<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Campagnes de recrutement</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showForm = true">
        Nouvelle campagne
      </v-btn>
    </div>

    <v-row>
      <v-col
        v-for="campagne in campagnes"
        :key="campagne.id"
        cols="12" md="6" lg="4"
      >
        <v-card>
          <v-card-title>{{ campagne.titre }}</v-card-title>
          <v-card-subtitle>
            <v-chip :color="statutColor(campagne.statut)" size="small" class="mr-2">
              {{ campagne.statut_display }}
            </v-chip>
            {{ campagne.nombre_candidatures || 0 }} candidature(s)
          </v-card-subtitle>
          <v-card-text>
            <div class="text-body-2">
              Du {{ campagne.date_debut }} au {{ campagne.date_fin || '...' }}
            </div>
            <div v-if="campagne.description" class="mt-2 text-body-2">
              {{ campagne.description }}
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn
              color="primary"
              variant="text"
              :to="{ name: 'recrutement-kanban', params: { campagneId: campagne.id } }"
            >
              Kanban
            </v-btn>
            <v-spacer />
            <v-btn icon="mdi-pencil" size="small" variant="text" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog nouvelle campagne -->
    <v-dialog v-model="showForm" max-width="600">
      <v-card>
        <v-card-title>Nouvelle campagne de recrutement</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.titre" label="Titre" required />
          <v-textarea v-model="form.description" label="Description" rows="3" />
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="form.date_debut" label="Date début" type="date" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.date_fin" label="Date fin" type="date" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showForm = false">Annuler</v-btn>
          <v-btn color="primary" @click="creerCampagne">Créer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../plugins/axios'

const campagnes = ref([])
const showForm = ref(false)
const form = ref({ titre: '', description: '', date_debut: '', date_fin: '' })

const statutColor = (statut) => ({
  brouillon: 'grey',
  ouverte: 'green',
  fermee: 'red',
}[statut] || 'grey')

const fetchCampagnes = async () => {
  try {
    const { data } = await api.get('/recrutement/campagnes/')
    campagnes.value = data.results || data
  } catch (e) { /* */ }
}

const creerCampagne = async () => {
  try {
    await api.post('/recrutement/campagnes/', form.value)
    showForm.value = false
    form.value = { titre: '', description: '', date_debut: '', date_fin: '' }
    await fetchCampagnes()
  } catch (e) { /* */ }
}

onMounted(fetchCampagnes)
</script>
