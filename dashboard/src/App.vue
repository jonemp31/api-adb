<template>
  <v-app>
    <v-app-bar color="primary" elevation="2" density="comfortable">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title class="font-weight-bold">
        <v-icon class="mr-2">mdi-cellphone-link</v-icon>
        ADB Manager V3.0
      </v-toolbar-title>
      <v-spacer />
      <v-btn 
        icon 
        @click="toggleTheme" 
        class="mr-2"
        :title="theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'"
      >
        <v-icon>{{ theme === 'dark' ? 'mdi-white-balance-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>
      <v-chip color="white" variant="outlined" class="mr-2" v-if="authUser">
        <v-icon start>mdi-account</v-icon>
        {{ authUser }}
      </v-chip>
      <v-btn 
        icon 
        @click="logout" 
        class="mr-2"
        title="Sair"
        v-if="authUser"
      >
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-view-dashboard" title="Dashboard" to="/" />
        <v-list-item prepend-icon="mdi-cellphone-multiple" title="Dispositivos" to="/" />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container fluid class="pa-6">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { useAppStore } from '@/store'
import { useTheme } from 'vuetify'

export default {
  name: 'App',
  setup() {
    const vueTheme = useTheme()
    return { vueTheme }
  },
  data: () => ({
    drawer: false,
    appStore: useAppStore(),
    theme: 'light',
    authUser: null
  }),
  methods: {
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      this.vueTheme.global.name.value = this.theme
      localStorage.setItem('theme', this.theme)
    },
    logout() {
      if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('authUser')
        this.$router.push('/login')
      }
    }
  },
  mounted() {
    // Detecta API URL automaticamente
    const apiUrl = window.location.origin
    this.appStore.setApiUrl(apiUrl)
    
    // Carrega usuário autenticado
    this.authUser = localStorage.getItem('authUser')
    
    // Carrega tema salvo
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      this.theme = savedTheme
      this.vueTheme.global.name.value = savedTheme
    }
    
    // Carrega devices inicial
    this.appStore.loadDevices()
    
    // Auto-refresh a cada 10s
    setInterval(() => {
      this.appStore.loadDevices()
    }, 10000)
  }
}
</script>
