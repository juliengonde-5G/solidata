<template>
  <v-layout>
    <!-- Navigation latérale -->
    <v-navigation-drawer v-model="drawer" :rail="rail" permanent>
      <v-list-item
        prepend-icon="mdi-recycle"
        title="Solidarité Textile"
        subtitle="ERP"
        nav
      >
        <template v-slot:append>
          <v-btn
            icon="mdi-chevron-left"
            variant="text"
            @click="rail = !rail"
          />
        </template>
      </v-list-item>

      <v-divider />

      <v-list nav density="compact">
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="Tableau de bord"
          :to="{ name: 'dashboard' }"
        />

        <v-list-group value="Recrutement">
          <template v-slot:activator="{ props }">
            <v-list-item
              v-bind="props"
              prepend-icon="mdi-account-search"
              title="Recrutement"
            />
          </template>
          <v-list-item title="Campagnes" :to="{ name: 'recrutement' }" prepend-icon="mdi-bullhorn" />
          <v-list-item title="Candidats" :to="{ name: 'candidats' }" prepend-icon="mdi-account-group" />
          <v-list-item title="Postes" :to="{ name: 'postes' }" prepend-icon="mdi-briefcase" />
        </v-list-group>

        <v-list-group value="RH">
          <template v-slot:activator="{ props }">
            <v-list-item
              v-bind="props"
              prepend-icon="mdi-account-tie"
              title="Ressources Humaines"
            />
          </template>
          <v-list-item title="Salariés" :to="{ name: 'salaries' }" prepend-icon="mdi-badge-account" />
          <v-list-item title="Planning" :to="{ name: 'planning' }" prepend-icon="mdi-calendar" />
          <v-list-item title="Présences" :to="{ name: 'presences' }" prepend-icon="mdi-clock-check" />
          <v-list-item title="Compétences" :to="{ name: 'competences' }" prepend-icon="mdi-certificate" />
        </v-list-group>

        <v-list-group value="Collecte">
          <template v-slot:activator="{ props }">
            <v-list-item
              v-bind="props"
              prepend-icon="mdi-truck"
              title="Collecte"
            />
          </template>
          <v-list-item title="Du jour" :to="{ name: 'collecte' }" prepend-icon="mdi-calendar-today" />
          <v-list-item title="Tournées" :to="{ name: 'tournees' }" prepend-icon="mdi-routes" />
          <v-list-item title="Véhicules" :to="{ name: 'vehicules' }" prepend-icon="mdi-truck-outline" />
          <v-list-item title="Bornes (CAV)" :to="{ name: 'cav' }" prepend-icon="mdi-archive" />
          <v-list-item title="Carte" :to="{ name: 'carte' }" prepend-icon="mdi-map" />
          <v-list-item title="Incidents" :to="{ name: 'incidents' }" prepend-icon="mdi-alert" />
        </v-list-group>
      </v-list>
    </v-navigation-drawer>

    <!-- Barre d'en-tête -->
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" class="d-lg-none" />
      <v-app-bar-title>{{ $route.meta.title || 'Solidarité Textile' }}</v-app-bar-title>

      <v-spacer />

      <!-- Accès mobile collecte -->
      <v-btn icon="mdi-cellphone" :to="{ name: 'mobile-scan' }" title="Mode collecte mobile" />
      <v-btn icon="mdi-bell" />
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn icon="mdi-account-circle" v-bind="props" />
        </template>
        <v-list>
          <v-list-item prepend-icon="mdi-account" title="Mon profil" />
          <v-list-item prepend-icon="mdi-cog" title="Paramètres" />
          <v-divider />
          <v-list-item prepend-icon="mdi-logout" title="Déconnexion" href="/api/auth/logout/" />
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Contenu principal -->
    <v-main>
      <v-container fluid>
        <router-view />
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup>
import { ref } from 'vue'

const drawer = ref(true)
const rail = ref(false)
</script>
