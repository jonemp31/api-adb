<template>
  <div class="d-flex flex-column" style="gap: 1.5rem">
    <!-- Coordenadas -->
    <v-card variant="outlined">
      <v-card-text>
        <h3 class="text-h6 mb-4">Coordenadas WhatsApp</h3>
        <p class="text-caption text-grey mb-4">
          Coordenadas do campo de mensagem do WhatsApp (adaptativo baseado em 720x1600)
        </p>

        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.number="coordinates.focus_x"
              label="Focus X"
              type="number"
              prepend-inner-icon="mdi-axis-x-arrow"
              variant="outlined"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.number="coordinates.focus_y"
              label="Focus Y"
              type="number"
              prepend-inner-icon="mdi-axis-y-arrow"
              variant="outlined"
              density="comfortable"
            />
          </v-col>
        </v-row>

        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-content-save"
          @click="saveCoordinates"
          :loading="savingCoords"
        >
          Salvar Coordenadas
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Testar Comando ADB -->
    <v-card variant="outlined">
      <v-card-text>
        <h3 class="text-h6 mb-4">Testar Comando ADB</h3>
        <p class="text-caption text-grey mb-4">
          Execute um comando shell no dispositivo para testar conectividade
        </p>

        <v-text-field
          v-model="testCommand"
          label="Comando Shell"
          placeholder="echo 'Hello World'"
          prepend-inner-icon="mdi-console"
          variant="outlined"
          density="comfortable"
        />

        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-play"
          @click="runTest"
          :loading="testing"
          :disabled="!testCommand"
        >
          Executar Teste
        </v-btn>

        <v-alert
          v-if="testResult"
          :type="testResult.success ? 'success' : 'error'"
          variant="tonal"
          class="mt-4"
        >
          <strong>Resultado:</strong>
          <pre class="mt-2" style="white-space: pre-wrap">{{ testResult.output }}</pre>
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Notificações -->
    <v-card variant="outlined">
      <v-card-text>
        <div class="d-flex justify-space-between align-center mb-4">
          <div>
            <h3 class="text-h6">Captura de Notificações</h3>
            <p class="text-caption text-grey">
              Polling de notificações WhatsApp a cada 3 segundos
            </p>
          </div>
          <v-switch
            v-model="notificationEnabled"
            color="primary"
            :loading="togglingNotif"
            @change="toggleNotifications"
            hide-details
          />
        </div>

        <v-alert type="info" variant="tonal">
          Status: {{ notificationEnabled ? 'Ativo' : 'Inativo' }}
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Resolução Base -->
    <v-card variant="outlined">
      <v-card-text>
        <h3 class="text-h6 mb-4">Informações de Resolução</h3>
        <v-list lines="two">
          <v-list-item>
            <template v-slot:prepend>
              <v-icon>mdi-monitor</v-icon>
            </template>
            <v-list-item-title>Resolução Atual</v-list-item-title>
            <v-list-item-subtitle>{{ device.width }}x{{ device.height }}</v-list-item-subtitle>
          </v-list-item>

          <v-list-item>
            <template v-slot:prepend>
              <v-icon>mdi-aspect-ratio</v-icon>
            </template>
            <v-list-item-title>Resolução Base</v-list-item-title>
            <v-list-item-subtitle>720x1600 (referência)</v-list-item-subtitle>
          </v-list-item>

          <v-list-item>
            <template v-slot:prepend>
              <v-icon>mdi-scale</v-icon>
            </template>
            <v-list-item-title>Fator de Escala</v-list-item-title>
            <v-list-item-subtitle>
              X: {{ (device.width / 720).toFixed(2) }} • Y: {{ (device.height / 1600).toFixed(2) }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import deviceController from '@/services/deviceController'

export default {
  name: 'TabSettings',
  props: {
    device: {
      type: Object,
      required: true
    }
  },
  emits: ['refresh'],
  data: () => ({
    coordinates: {
      focus_x: 1345,
      focus_y: 1006
    },
    testCommand: 'echo "Test"',
    testResult: null,
    notificationEnabled: true,
    savingCoords: false,
    testing: false,
    togglingNotif: false
  }),
  methods: {
    async saveCoordinates() {
      try {
        this.savingCoords = true
        await deviceController.updateCoordinates(this.device.id, this.coordinates)
        alert('Coordenadas salvas com sucesso!')
        this.$emit('refresh')
      } catch (error) {
        alert('Erro ao salvar coordenadas: ' + error.message)
      } finally {
        this.savingCoords = false
      }
    },
    async runTest() {
      try {
        this.testing = true
        this.testResult = null
        const result = await deviceController.testCommand(this.device.id, this.testCommand)
        this.testResult = result
      } catch (error) {
        this.testResult = {
          success: false,
          output: error.message
        }
      } finally {
        this.testing = false
      }
    },
    async toggleNotifications() {
      try {
        this.togglingNotif = true
        // TODO: Implementar endpoint de toggle
        console.log('Toggle notifications:', this.notificationEnabled)
      } catch (error) {
        alert('Erro ao alterar notificações: ' + error.message)
        this.notificationEnabled = !this.notificationEnabled
      } finally {
        this.togglingNotif = false
      }
    }
  },
  mounted() {
    this.coordinates = {
      focus_x: this.device.focus_x || 1345,
      focus_y: this.device.focus_y || 1006
    }
  }
}
</script>
