<template>
  <div class="d-flex flex-column" style="gap: 1.5rem">
    <!-- Resumo da Fila -->
    <v-card variant="outlined">
      <v-card-text>
        <div class="d-flex justify-space-between align-center mb-4">
          <h3 class="text-h6">Resumo da Fila</h3>
          <v-btn
            variant="tonal"
            color="primary"
            size="small"
            prepend-icon="mdi-refresh"
            @click="loadQueue"
            :loading="loading"
          >
            Atualizar
          </v-btn>
        </div>

        <v-row dense>
          <v-col cols="6" md="3">
            <div class="text-center pa-3">
              <v-icon size="40" color="warning">mdi-clock-outline</v-icon>
              <p class="text-h4 font-weight-bold mt-2 mb-0">{{ queueData.pending || 0 }}</p>
              <p class="text-caption text-grey">Aguardando</p>
            </div>
          </v-col>
          <v-col cols="6" md="3">
            <div class="text-center pa-3">
              <v-icon size="40" color="info">mdi-calendar-today</v-icon>
              <p class="text-h4 font-weight-bold mt-2 mb-0">{{ queueData.today || 0 }}</p>
              <p class="text-caption text-grey">Processados Hoje</p>
            </div>
          </v-col>
          <v-col cols="6" md="3">
            <div class="text-center pa-3">
              <v-icon size="40" color="success">mdi-check-all</v-icon>
              <p class="text-h4 font-weight-bold mt-2 mb-0">{{ queueData.total || 0 }}</p>
              <p class="text-caption text-grey">Total Processado</p>
            </div>
          </v-col>
          <v-col cols="6" md="3">
            <div class="text-center pa-3">
              <v-icon size="40" color="primary">mdi-play-circle</v-icon>
              <p class="text-h4 font-weight-bold mt-2 mb-0">{{ queueData.processing ? '1' : '0' }}</p>
              <p class="text-caption text-grey">Em Processamento</p>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Adicionar Task -->
    <v-card variant="outlined">
      <v-card-text>
        <h3 class="text-h6 mb-4">Adicionar Tarefa</h3>
        <v-form @submit.prevent="addTask">
          <v-row dense>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="newTask.phone"
                label="Telefone"
                placeholder="5511999887766"
                prepend-inner-icon="mdi-phone"
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newTask.message"
                label="Mensagem"
                placeholder="Olá, esta é uma mensagem automática"
                prepend-inner-icon="mdi-message-text"
                variant="outlined"
                density="comfortable"
                required
              />
            </v-col>
            <v-col cols="12" md="2">
              <v-btn
                type="submit"
                color="primary"
                variant="elevated"
                block
                :loading="addingTask"
                height="40"
              >
                <v-icon start>mdi-plus</v-icon>
                Adicionar
              </v-btn>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
    </v-card>

    <!-- Tasks Pendentes -->
    <v-card variant="outlined">
      <v-card-text>
        <div class="d-flex justify-space-between align-center mb-4">
          <h3 class="text-h6">Tasks Pendentes ({{ pendingTasks.length }})</h3>
          <v-btn
            variant="tonal"
            color="error"
            size="small"
            prepend-icon="mdi-delete"
            @click="clearQueue"
            :disabled="pendingTasks.length === 0 || clearing"
            :loading="clearing"
          >
            Limpar Fila
          </v-btn>
        </div>

        <v-list v-if="pendingTasks.length > 0" lines="two">
          <v-list-item
            v-for="(task, index) in pendingTasks"
            :key="task.id"
            class="mb-2"
            rounded="lg"
            :class="{ 'bg-blue-lighten-5': task.status === 'processing' }"
          >
            <template v-slot:prepend>
              <v-avatar :color="task.status === 'processing' ? 'primary' : 'grey'">
                <v-icon>{{ task.status === 'processing' ? 'mdi-cog-refresh' : 'mdi-clock-outline' }}</v-icon>
              </v-avatar>
            </template>

            <v-list-item-title>
              <strong>{{ task.payload?.phone || task.phone }}</strong>
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ task.payload?.message || task.message }}
            </v-list-item-subtitle>

            <template v-slot:append>
              <v-chip
                :color="task.status === 'processing' ? 'primary' : 'warning'"
                size="small"
                variant="flat"
              >
                {{ task.status === 'processing' ? 'Processando' : 'Aguardando' }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>

        <v-alert v-else type="info" variant="tonal">
          Nenhuma task pendente na fila
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Histórico -->
    <v-card variant="outlined">
      <v-card-text>
        <h3 class="text-h6 mb-4">Histórico Recente (últimas 20)</h3>
        
        <v-list v-if="history.length > 0" lines="two">
          <v-list-item
            v-for="task in history"
            :key="task.id"
            class="mb-2"
            rounded="lg"
          >
            <template v-slot:prepend>
              <v-avatar :color="task.status === 'completed' ? 'success' : 'error'">
                <v-icon>{{ task.status === 'completed' ? 'mdi-check' : 'mdi-close' }}</v-icon>
              </v-avatar>
            </template>

            <v-list-item-title>
              <strong>{{ task.payload?.phone || task.phone }}</strong>
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ task.payload?.message || task.message }}
            </v-list-item-subtitle>

            <template v-slot:append>
              <v-chip
                :color="task.status === 'completed' ? 'success' : 'error'"
                size="small"
                variant="flat"
              >
                {{ task.status === 'completed' ? 'Sucesso' : 'Falhou' }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>

        <v-alert v-else type="info" variant="tonal">
          Nenhum histórico disponível
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Dialog de Confirmação -->
    <v-dialog v-model="confirmDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6 bg-error text-white">
          <v-icon start>mdi-alert</v-icon>
          Confirmar Ação
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="text-body-1 mb-2">
            Tem certeza que deseja <strong>limpar toda a fila</strong>?
          </p>
          <p class="text-body-2 text-grey">
            Esta ação irá remover <strong>{{ pendingTasks.length }} task(s) pendente(s)</strong> e não pode ser desfeita.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="confirmDialog = false"
            :disabled="clearing"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            @click="confirmClearQueue"
            :loading="clearing"
          >
            Limpar Fila
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import queueController from '@/services/queueController'

export default {
  name: 'TabQueue',
  props: {
    device: {
      type: Object,
      required: true
    }
  },
  emits: ['refresh'],
  data: () => ({
    loading: false,
    addingTask: false,
    clearing: false,
    confirmDialog: false,
    queueData: {},
    pendingTasks: [],
    history: [],
    newTask: {
      phone: '',
      message: ''
    }
  }),
  methods: {
    async loadQueue() {
      try {
        this.loading = true
        
        // Carrega info da fila
        const queueInfo = await queueController.getQueueLength(this.device.alias)
        this.queueData = queueInfo
        
        // Carrega tasks pendentes
        const tasks = await queueController.getPendingTasks(this.device.alias)
        this.pendingTasks = tasks.tasks || []
        
        // Carrega histórico
        const historyData = await queueController.getTaskHistory(this.device.alias, 20)
        this.history = historyData.tasks || []
        
      } catch (error) {
        console.error('Erro ao carregar fila:', error)
      } finally {
        this.loading = false
      }
    },
    async addTask() {
      if (!this.newTask.phone || !this.newTask.message) {
        alert('Preencha todos os campos')
        return
      }
      
      try {
        this.addingTask = true
        await queueController.addTask(this.device.alias, {
          action: 'sendMessage',
          payload: this.newTask
        })
        
        this.newTask = { phone: '', message: '' }
        await this.loadQueue()
        this.$emit('refresh')
      } catch (error) {
        alert('Erro ao adicionar task: ' + error.message)
      } finally {
        this.addingTask = false
      }
    },
    clearQueue() {
      this.confirmDialog = true
    },
    async confirmClearQueue() {
      try {
        this.clearing = true
        await queueController.clearQueue(this.device.alias)
        this.confirmDialog = false
        await this.loadQueue()
        this.$emit('refresh')
      } catch (error) {
        alert('Erro ao limpar fila: ' + error.message)
      } finally {
        this.clearing = false
      }
    }
  },
  mounted() {
    this.loadQueue()
    
    // Auto-refresh a cada 5s
    this.interval = setInterval(() => {
      this.loadQueue()
    }, 5000)
  },
  beforeUnmount() {
    if (this.interval) {
      clearInterval(this.interval)
    }
  }
}
</script>
