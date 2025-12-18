<template>
  <div>
    <!-- Header -->
    <div class="d-flex mb-6 align-center">
      <div>
        <h2 class="text-h4 font-weight-bold">Dispositivos</h2>
        <p class="text-subtitle-1 text-grey">Gerenciamento de celulares conectados via ADB</p>
      </div>
      <v-spacer />
      <v-btn
        :disabled="loading"
        @click="loadDevices"
        icon="mdi-refresh"
        variant="text"
        size="large"
        class="mr-2"
      />
      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-plus"
        @click="connectDeviceDialog = true"
        :disabled="loading"
      >
        Conectar Device
      </v-btn>
    </div>

    <!-- Filtros e Busca -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              label="Buscar por nome ou ID"
              prepend-inner-icon="mdi-magnify"
              density="comfortable"
              variant="outlined"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-btn-toggle
              v-model="statusFilter"
              variant="outlined"
              divided
              mandatory
              density="comfortable"
            >
              <v-btn value="all" :disabled="loading">
                <v-icon start>mdi-view-grid</v-icon>
                Todos ({{ devices.length }})
              </v-btn>
              <v-btn value="ONLINE" color="success" :disabled="loading">
                <v-icon start>mdi-check-circle</v-icon>
                Online ({{ onlineCount }})
              </v-btn>
              <v-btn value="OFFLINE" color="error" :disabled="loading">
                <v-icon start>mdi-close-circle</v-icon>
                Offline ({{ offlineCount }})
              </v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading -->
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <!-- Grid de Cards -->
    <v-row dense v-if="filteredDevices.length > 0">
      <v-col
        cols="12"
        sm="6"
        lg="4"
        v-for="device in filteredDevices"
        :key="device.id"
      >
        <v-card
          @click="goToDevice(device.alias)"
          class="device-card"
          variant="outlined"
          hover
          :disabled="loading"
        >
          <v-card-text>
            <!-- Header do Card -->
            <div class="d-flex align-center mb-3">
              <v-avatar size="60" :color="device.status === 'ONLINE' ? 'success' : 'error'">
                <v-icon size="40" color="white">mdi-android</v-icon>
              </v-avatar>
              <div class="ml-3 flex-grow-1">
                <h3 class="text-h6 font-weight-bold">{{ device.alias }}</h3>
                <p class="text-caption text-grey mb-0">{{ device.id }}</p>
              </div>
              <v-chip
                :color="device.status === 'ONLINE' ? 'success' : 'error'"
                size="small"
                variant="flat"
              >
                {{ device.status }}
              </v-chip>
            </div>

            <!-- Informações -->
            <v-divider class="mb-3" />
            
            <div class="info-grid">
              <div class="info-item">
                <v-icon size="small" class="mr-1">mdi-cellphone</v-icon>
                <span class="text-caption">{{ device.model || 'Desconhecido' }}</span>
              </div>
              
              <div class="info-item">
                <v-icon size="small" class="mr-1">mdi-monitor-screenshot</v-icon>
                <span class="text-caption">{{ device.width }}x{{ device.height }}</span>
              </div>
              
              <div class="info-item">
                <v-icon size="small" class="mr-1">mdi-calendar</v-icon>
                <span class="text-caption">{{ formatDate(device.created_at) }}</span>
              </div>
              
              <div class="info-item">
                <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                <span class="text-caption">{{ formatDate(device.last_seen) }}</span>
              </div>
            </div>

            <!-- Estatísticas de Fila -->
            <v-divider class="my-3" />
            
            <div class="d-flex justify-space-between">
              <div class="text-center flex-grow-1">
                <p class="text-h6 font-weight-bold mb-0">{{ device.queueStats?.pending || 0 }}</p>
                <p class="text-caption text-grey">Aguardando</p>
              </div>
              <v-divider vertical />
              <div class="text-center flex-grow-1">
                <p class="text-h6 font-weight-bold mb-0">{{ device.queueStats?.today || 0 }}</p>
                <p class="text-caption text-grey">Hoje</p>
              </div>
              <v-divider vertical />
              <div class="text-center flex-grow-1">
                <p class="text-h6 font-weight-bold mb-0">{{ device.queueStats?.total || 0 }}</p>
                <p class="text-caption text-grey">Total</p>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-card v-else variant="outlined" class="text-center pa-12">
      <v-icon size="80" color="grey">mdi-cellphone-off</v-icon>
      <h3 class="text-h5 mt-4 mb-2">Nenhum dispositivo encontrado</h3>
      <p class="text-grey">
        {{ search ? 'Tente ajustar os filtros de busca' : 'Conecte um dispositivo via ADB para começar' }}
      </p>
      <v-btn color="primary" variant="elevated" class="mt-4" @click="connectDeviceDialog = true">
        <v-icon start>mdi-plus</v-icon>
        Conectar Dispositivo
      </v-btn>
    </v-card>

    <!-- Dialog Conectar Device -->
    <v-dialog v-model="connectDeviceDialog" max-width="500">
      <v-card>
        <v-card-title>
          <span class="text-h5">Conectar Dispositivo</span>
        </v-card-title>
        <v-card-text>
          <p class="text-grey mb-4">
            Use o comando ADB para conectar um dispositivo via WiFi:
          </p>
          <v-text-field
            v-model="deviceIp"
            label="IP do Dispositivo"
            placeholder="192.168.1.100"
            prepend-inner-icon="mdi-ip"
            variant="outlined"
            hint="Certifique-se que a depuração WiFi está ativa"
            persistent-hint
          />
          <v-alert type="info" variant="tonal" class="mt-4">
            <div class="text-subtitle-2 mb-2">Comando ADB:</div>
            <code>adb connect {{ deviceIp || '192.168.1.100' }}:5555</code>
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="connectDeviceDialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="elevated" @click="connectDevice">Conectar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { useAppStore } from '@/store'
import { format } from 'date-fns'

export default {
  name: 'Home',
  data: () => ({
    appStore: useAppStore(),
    search: '',
    statusFilter: 'all',
    connectDeviceDialog: false,
    deviceIp: ''
  }),
  computed: {
    loading() {
      return this.appStore.loading
    },
    devices() {
      return this.appStore.devices
    },
    onlineCount() {
      return this.devices.filter(d => d.status === 'ONLINE').length
    },
    offlineCount() {
      return this.devices.filter(d => d.status === 'OFFLINE').length
    },
    filteredDevices() {
      let filtered = this.devices

      // Filtro por status
      if (this.statusFilter !== 'all') {
        filtered = filtered.filter(d => d.status === this.statusFilter)
      }

      // Filtro por busca
      if (this.search) {
        const searchLower = this.search.toLowerCase()
        filtered = filtered.filter(d => 
          d.alias.toLowerCase().includes(searchLower) ||
          d.id.toLowerCase().includes(searchLower) ||
          d.model?.toLowerCase().includes(searchLower)
        )
      }

      return filtered
    }
  },
  methods: {
    async loadDevices() {
      await this.appStore.loadDevices()
    },
    goToDevice(alias) {
      this.$router.push(`/device/${alias}`)
    },
    async connectDevice() {
      // TODO: Implementar conexão via API
      console.log('Conectando device:', this.deviceIp)
      this.connectDeviceDialog = false
      this.deviceIp = ''
    },
    formatDate(date) {
      if (!date) return '-'
      try {
        return format(new Date(date), 'dd/MM/yyyy HH:mm')
      } catch {
        return '-'
      }
    }
  },
  mounted() {
    this.loadDevices()
  }
}
</script>

<style scoped>
.device-card {
  transition: all 0.3s ease;
  cursor: pointer;
}

.device-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: rgba(0,0,0,0.6);
}
</style>
