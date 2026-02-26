import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: 'Tableau de bord' },
      },
      // Recrutement
      {
        path: 'recrutement',
        children: [
          {
            path: '',
            name: 'recrutement',
            component: () => import('../views/recrutement/CampagnesList.vue'),
            meta: { title: 'Recrutement' },
          },
          {
            path: 'kanban/:campagneId',
            name: 'recrutement-kanban',
            component: () => import('../views/recrutement/KanbanBoard.vue'),
            meta: { title: 'Suivi candidatures' },
          },
          {
            path: 'candidats',
            name: 'candidats',
            component: () => import('../views/recrutement/CandidatsList.vue'),
            meta: { title: 'Candidats' },
          },
          {
            path: 'candidats/:id',
            name: 'candidat-detail',
            component: () => import('../views/recrutement/CandidatDetail.vue'),
            meta: { title: 'Fiche candidat' },
          },
          {
            path: 'test/:passationId',
            name: 'test-personnalite',
            component: () => import('../views/recrutement/TestPersonnalite.vue'),
            meta: { title: 'Test de personnalité' },
          },
          {
            path: 'postes',
            name: 'postes',
            component: () => import('../views/recrutement/PostesList.vue'),
            meta: { title: 'Postes' },
          },
        ],
      },
      // RH
      {
        path: 'rh',
        children: [
          {
            path: 'salaries',
            name: 'salaries',
            component: () => import('../views/rh/SalariesList.vue'),
            meta: { title: 'Salariés' },
          },
          {
            path: 'salaries/:id',
            name: 'salarie-detail',
            component: () => import('../views/rh/SalarieDetail.vue'),
            meta: { title: 'Fiche salarié' },
          },
          {
            path: 'planning',
            name: 'planning',
            component: () => import('../views/rh/PlanningView.vue'),
            meta: { title: 'Planning' },
          },
          {
            path: 'presences',
            name: 'presences',
            component: () => import('../views/rh/PresencesView.vue'),
            meta: { title: 'Présences' },
          },
          {
            path: 'competences',
            name: 'competences',
            component: () => import('../views/rh/CompetencesView.vue'),
            meta: { title: 'Compétences' },
          },
        ],
      },
      // Collecte
      {
        path: 'collecte',
        children: [
          {
            path: '',
            name: 'collecte',
            component: () => import('../views/collecte/CollectesDuJour.vue'),
            meta: { title: 'Collectes du jour' },
          },
          {
            path: 'tournees',
            name: 'tournees',
            component: () => import('../views/collecte/TourneesList.vue'),
            meta: { title: 'Tournées' },
          },
          {
            path: 'vehicules',
            name: 'vehicules',
            component: () => import('../views/collecte/VehiculesList.vue'),
            meta: { title: 'Véhicules' },
          },
          {
            path: 'cav',
            name: 'cav',
            component: () => import('../views/collecte/CAVList.vue'),
            meta: { title: 'Bornes (CAV)' },
          },
          {
            path: 'carte',
            name: 'carte',
            component: () => import('../views/collecte/CarteVehicules.vue'),
            meta: { title: 'Carte véhicules' },
          },
          {
            path: 'incidents',
            name: 'incidents',
            component: () => import('../views/collecte/IncidentsList.vue'),
            meta: { title: 'Incidents' },
          },
        ],
      },
      // Collecte mobile
      {
        path: 'mobile',
        children: [
          {
            path: 'collecte/:collecteId',
            name: 'mobile-collecte',
            component: () => import('../views/mobile/MobileCollecte.vue'),
            meta: { title: 'Collecte mobile', mobile: true },
          },
          {
            path: 'scan',
            name: 'mobile-scan',
            component: () => import('../views/mobile/QRScanner.vue'),
            meta: { title: 'Scanner CAV', mobile: true },
          },
        ],
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  document.title = `${to.meta.title || 'Solidarité Textile'} - SoliData`
})

export default router
