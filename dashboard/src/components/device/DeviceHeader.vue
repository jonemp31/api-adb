<template>
  <v-card variant="outlined" class="mb-6" rounded="xl">
    <v-card-text class="pa-4">
      <div class="d-flex align-center flex-wrap ga-4">
        <!-- Avatar -->
        <v-avatar size="100" :color="device.status === 'ONLINE' ? 'success' : 'error'" rounded="xl">
          <v-icon size="60" color="white">mdi-android</v-icon>
        </v-avatar>

        <!-- Info -->
        <div class="flex-grow-1">
          <div class="d-flex align-center mb-2">
            <h2 class="text-h4 font-weight-bold mr-3">{{ device.alias }}</h2>
            <v-chip
              :color="device.status === 'ONLINE' ? 'success' : 'error'"
              variant="flat"
              size="large"
            >
              <v-icon start>{{ device.status === 'ONLINE' ? 'mdi-check-circle' : 'mdi-close-circle' }}</v-icon>
              {{ device.status }}
            </v-chip>
            <v-chip
              v-if="device.workerEnabled === false"
              color="warning"
              variant="flat"
              size="large"
              class="ml-2"
            >
              <v-icon start>mdi-pause-circle</v-icon>
              PAUSADO
            </v-chip>
          </div>
          
          <p class="text-body-2 text-grey mb-1">{{ device.id }}</p>
          <p class="text-body-2 text-grey">{{ device.model || 'Modelo desconhecido' }} • {{ device.width }}x{{ device.height }}</p>
        </div>

        <!-- Botões -->
        <div class="d-flex flex-column ga-2">
          <v-btn
            @click="$emit('refresh')"
            :disabled="refreshing"
            :loading="refreshing"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-refresh"
          >
            Atualizar
          </v-btn>
          
          <v-btn
            @click="handleToggleWorker"
            :disabled="device.status !== 'ONLINE' || togglingWorker"
            :loading="togglingWorker"
            variant="tonal"
            :color="device.workerEnabled !== false ? 'warning' : 'success'"
            :prepend-icon="device.workerEnabled !== false ? 'mdi-pause' : 'mdi-play'"
          >
            {{ device.workerEnabled !== false ? 'Pausar Worker' : 'Retomar Worker' }}
          </v-btn>
          
          <v-btn
            @click="handleReconnect"
            :disabled="reconnecting"
            :loading="reconnecting"
            variant="tonal"
            color="info"
            prepend-icon="mdi-restart"
          >
            Reconectar
          </v-btn>
          
          <v-btn
            @click="confirmDisconnect"
            :disabled="device.status !== 'ONLINE' || disconnecting"
            :loading="disconnecting"
            variant="tonal"
            color="error"
            prepend-icon="mdi-close"
          >
            Desconectar
          </v-btn>
        </div>
      </div>
    </v-card-text>
  </v-card>

  <!-- Dialog de Confirmação -->
  <v-dialog v-model="disconnectDialog" max-width="400">
    <v-card>
      <v-card-title>Confirmar Desconexão</v-card-title>
      <v-card-text>
        Tem certeza que deseja desconectar o dispositivo <strong>{{ device.alias }}</strong>?
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="disconnectDialog = false">Cancelar</v-btn>
        <v-btn color="error" variant="elevated" @click="handleDisconnect">Desconectar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { useAppStore } from '@/store'

export default {
  name: 'DeviceHeader',
  props: {
    device: {
      type: Object,
      required: true
    }
  },
  emits: ['refresh'],
  data: () => ({
    appStore: useAppStore(),
    refreshing: false,
    togglingWorker: false,
    reconnecting: false,
    disconnecting: false,
    disconnectDialog: false
  }),
  methods: {
    async handleToggleWorker() {
      try {
        this.togglingWorker = true
        const newState = !(this.device.workerEnabled !== false)
        await this.appStore.toggleWorker(this.device.id, newState)
        this.$emit('refresh')
      } catch (error) {
        alert('Erro ao alterar worker: ' + error.message)
      } finally {
        this.togglingWorker = false
      }
    },
    async handleReconnect() {
      try {
        this.reconnecting = true
        await this.appStore.reconnectDevice(this.device.id)
        this.$emit('refresh')
      } catch (error) {
        alert('Erro ao reconectar: ' + error.message)
      } finally {
        this.reconnecting = false
      }
    },
    confirmDisconnect() {
      this.disconnectDialog = true
    },
    async handleDisconnect() {
      try {
        this.disconnecting = true
        await this.appStore.disconnectDevice(this.device.id)
        this.disconnectDialog = false
        this.$emit('refresh')
      } catch (error) {
        alert('Erro ao desconectar: ' + error.message)
      } finally {
        this.disconnecting = false
      }
    }
  }
}
</script>
