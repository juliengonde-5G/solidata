import { defineStore } from 'pinia'
import api from '../plugins/axios'

export const useRHStore = defineStore('rh', {
  state: () => ({
    salaries: [],
    competences: [],
    alertesCompetences: [],
    plannings: [],
    presences: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchSalaries() {
      this.loading = true
      try {
        const { data } = await api.get('/rh/salaries/')
        this.salaries = data.results || data
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async fetchCompetences() {
      try {
        const { data } = await api.get('/rh/competences/')
        this.competences = data.results || data
      } catch (e) {
        this.error = e.message
      }
    },

    async fetchAlertesCompetences() {
      try {
        const { data } = await api.get('/rh/salaries/alertes_competences/')
        this.alertesCompetences = data
      } catch (e) {
        this.error = e.message
      }
    },

    async fetchPlannings() {
      this.loading = true
      try {
        const { data } = await api.get('/rh/plannings/')
        this.plannings = data.results || data
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async fetchPresences(date) {
      this.loading = true
      try {
        const { data } = await api.get('/rh/presences/journee/', {
          params: { date }
        })
        this.presences = data
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },
  },
})
