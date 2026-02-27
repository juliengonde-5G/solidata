import { defineStore } from 'pinia'
import api from '../plugins/axios'

export const useRecrutementStore = defineStore('recrutement', {
  state: () => ({
    campagnes: [],
    candidats: [],
    candidatures: [],
    kanbanData: {},
    postes: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchCampagnes() {
      this.loading = true
      try {
        const { data } = await api.get('/recrutement/campagnes/')
        this.campagnes = data.results || data
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async fetchCandidats() {
      this.loading = true
      try {
        const { data } = await api.get('/recrutement/candidats/')
        this.candidats = data.results || data
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async fetchKanban(campagneId) {
      this.loading = true
      try {
        const { data } = await api.get('/recrutement/candidatures/kanban/', {
          params: { campagne: campagneId }
        })
        this.kanbanData = data
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async deplacerCandidature(candidatureId, etape, ordre) {
      try {
        await api.post(`/recrutement/candidatures/${candidatureId}/deplacer/`, {
          etape,
          ordre_kanban: ordre,
        })
      } catch (e) {
        this.error = e.message
      }
    },

    async fetchPostes() {
      try {
        const { data } = await api.get('/recrutement/postes/')
        this.postes = data.results || data
      } catch (e) {
        this.error = e.message
      }
    },
  },
})
