<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Postes</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showForm = true">Nouveau poste</v-btn>
    </div>

    <v-row>
      <v-col v-for="poste in postes" :key="poste.id" cols="12" md="4">
        <v-card>
          <v-card-title>{{ poste.intitule }}</v-card-title>
          <v-card-subtitle>
            <v-chip size="small" color="primary" class="mr-1">{{ poste.service_display }}</v-chip>
            <v-chip size="small">{{ poste.type_contrat_display }}</v-chip>
          </v-card-subtitle>
          <v-card-text>
            <div>{{ poste.nombre_postes }} poste(s) disponible(s)</div>
            <div v-if="poste.description" class="mt-2 text-body-2">{{ poste.description }}</div>
          </v-card-text>
          <v-card-actions>
            <v-chip :color="poste.actif ? 'success' : 'grey'" size="small">
              {{ poste.actif ? 'Actif' : 'Inactif' }}
            </v-chip>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="showForm" max-width="500">
      <v-card>
        <v-card-title>Nouveau poste</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.intitule" label="Intitulé" />
          <v-select
            v-model="form.service"
            :items="services"
            label="Service"
          />
          <v-select
            v-model="form.type_contrat"
            :items="typesContrat"
            label="Type de contrat"
          />
          <v-text-field v-model.number="form.nombre_postes" label="Nombre de postes" type="number" />
          <v-textarea v-model="form.description" label="Description" rows="3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showForm = false">Annuler</v-btn>
          <v-btn color="primary" @click="creer">Créer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../plugins/axios'

const postes = ref([])
const showForm = ref(false)
const form = ref({ intitule: '', service: '', type_contrat: 'cddi', nombre_postes: 1, description: '' })

const services = [
  { title: 'Collecte', value: 'collecte' },
  { title: 'Tri', value: 'tri' },
  { title: 'Logistique', value: 'logistique' },
  { title: 'Boutique', value: 'boutique' },
  { title: 'Administratif', value: 'administratif' },
]

const typesContrat = [
  { title: 'CDDI', value: 'cddi' },
  { title: 'CDD', value: 'cdd' },
  { title: 'CDI', value: 'cdi' },
  { title: 'Stage', value: 'stage' },
  { title: 'Service Civique', value: 'service_civique' },
]

const fetchPostes = async () => {
  try {
    const { data } = await api.get('/recrutement/postes/')
    postes.value = data.results || data
  } catch (e) { /* */ }
}

const creer = async () => {
  try {
    await api.post('/recrutement/postes/', form.value)
    showForm.value = false
    form.value = { intitule: '', service: '', type_contrat: 'cddi', nombre_postes: 1, description: '' }
    await fetchPostes()
  } catch (e) { /* */ }
}

onMounted(fetchPostes)
</script>
