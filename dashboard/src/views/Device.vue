<template>
  <div>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/')" class="mb-4">
      Voltar para dispositivos
    </v-btn>

    <div v-if="loading" class="text-center pa-12">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="mt-4 text-grey">Carregando dispositivo...</p>
    </div>

    <v-alert v-else-if="error" type="error" variant="outlined">
      {{ error }}
    </v-alert>

    <div v-else-if="device">
      <DeviceHeader :device="device" @refresh="loadDevice" />
      <DeviceBody :device="device" @refresh="loadDevice" />
    </div>
  </div>
</template>

<script>
import { useAppStore } from '@/store'
import deviceController from '@/services/deviceController'
import DeviceHeader from '@/components/device/DeviceHeader.vue'
import DeviceBody from '@/components/device/DeviceBody.vue'

export default {
  name: 'Device',
  components: { DeviceHeader, DeviceBody },
  data: () => ({
    appStore: useAppStore(),
    loading: false,
    error: null,
    device: null
  }),
  methods: {
    async loadDevice() {
      try {
        this.loading = true
        this.error = null
        
        const alias = this.$route.params.alias
        
        // Carrega device do store
        await this.appStore.loadDevices()
        this.device = this.appStore.getDeviceByAlias(alias)
        
        if (!this.device) {
          this.error = `Dispositivo "${alias}" não encontrado`
          return
        }

        // Carrega estatísticas detalhadas
        try {
          const stats = await deviceController.getDeviceStats(alias)
          this.device.stats = stats
        } catch (e) {
          console.warn('Erro ao carregar stats:', e)
        }
        
      } catch (e) {
        this.error = e.message || 'Erro ao carregar dispositivo'
      } finally {
        this.loading = false
      }
    }
  },
  mounted() {
    this.loadDevice()
    
    // Auto-refresh a cada 5s
    this.refreshInterval = setInterval(() => {
      if (!this.loading) {
        this.loadDevice()
      }
    }, 5000)
  },
  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
  }
}
</script>
