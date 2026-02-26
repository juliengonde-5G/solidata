import { defineStore } from 'pinia'
import api from '../plugins/axios'

export const useCollecteStore = defineStore('collecte', {
  state: () => ({
    collectesDuJour: [],
    collecteActive: null,
    vehicules: [],
    cav: [],
    tournees: [],
    incidents: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchCollectesDuJour() {
      this.loading = true
      try {
        const { data } = await api.get('/collecte/collectes/du_jour/')
        this.collectesDuJour = data
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async fetchCollecte(id) {
      try {
        const { data } = await api.get(`/collecte/collectes/${id}/`)
        this.collecteActive = data
        return data
      } catch (e) {
        this.error = e.message
      }
    },

    async demarrerCollecte(id, kilometrage) {
      try {
        const { data } = await api.post(`/collecte/collectes/${id}/demarrer/`, {
          kilometrage_depart: kilometrage,
        })
        this.collecteActive = data
        return data
      } catch (e) {
        this.error = e.message
      }
    },

    async enregistrerPassage(collecteId, passageData) {
      try {
        const { data } = await api.post(`/collecte/collectes/${collecteId}/passage/`, passageData)
        return data
      } catch (e) {
        this.error = e.message
      }
    },

    async peserCollecte(collecteId, poids, kilometrage) {
      try {
        const { data } = await api.post(`/collecte/collectes/${collecteId}/peser/`, {
          poids_total_kg: poids,
          kilometrage_retour: kilometrage,
        })
        this.collecteActive = data
        return data
      } catch (e) {
        this.error = e.message
      }
    },

    async scannerCAV(qrCode) {
      try {
        const { data } = await api.get(`/collecte/cav/scan/${qrCode}/`)
        return data
      } catch (e) {
        this.error = e.message
        return null
      }
    },

    async fetchVehicules() {
      try {
        const { data } = await api.get('/collecte/vehicules/')
        this.vehicules = data.results || data
      } catch (e) {
        this.error = e.message
      }
    },

    async fetchCAV() {
      try {
        const { data } = await api.get('/collecte/cav/')
        this.cav = data.results || data
      } catch (e) {
        this.error = e.message
      }
    },

    async fetchTournees() {
      try {
        const { data } = await api.get('/collecte/tournees/')
        this.tournees = data.results || data
      } catch (e) {
        this.error = e.message
      }
    },

    async fetchIncidents() {
      try {
        const { data } = await api.get('/collecte/incidents/')
        this.incidents = data.results || data
      } catch (e) {
        this.error = e.message
      }
    },

    async signalerIncident(incidentData) {
      try {
        const { data } = await api.post('/collecte/incidents/', incidentData)
        return data
      } catch (e) {
        this.error = e.message
      }
    },
  },
})
