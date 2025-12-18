<template>
  <div class="d-flex flex-column" style="gap: 1.5rem">
    <!-- Cards de Métricas -->
    <v-row dense>
      <v-col cols="12" md="3">
        <v-card variant="outlined" class="text-center pa-4">
          <v-icon size="50" color="primary">mdi-check-all</v-icon>
          <p class="text-h4 font-weight-bold mt-3 mb-1">{{ stats.totalProcessed || 0 }}</p>
          <p class="text-caption text-grey">Total Processado</p>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card variant="outlined" class="text-center pa-4">
          <v-icon size="50" color="success">mdi-check-circle</v-icon>
          <p class="text-h4 font-weight-bold mt-3 mb-1">{{ stats.totalSuccess || 0 }}</p>
          <p class="text-caption text-grey">Sucesso</p>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card variant="outlined" class="text-center pa-4">
          <v-icon size="50" color="error">mdi-close-circle</v-icon>
          <p class="text-h4 font-weight-bold mt-3 mb-1">{{ stats.totalFailed || 0 }}</p>
          <p class="text-caption text-grey">Falhas</p>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card variant="outlined" class="text-center pa-4">
          <v-icon size="50" color="info">mdi-percent</v-icon>
          <p class="text-h4 font-weight-bold mt-3 mb-1">{{ successRate }}%</p>
          <p class="text-caption text-grey">Taxa de Sucesso</p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Gráfico de Histórico -->
    <v-card variant="outlined">
      <v-card-text>
        <div class="d-flex justify-space-between align-center mb-4">
          <h3 class="text-h6">Histórico de Tasks (Últimas 24h)</h3>
          <v-btn-toggle v-model="chartPeriod" mandatory density="compact" variant="outlined">
            <v-btn value="24h" size="small">24h</v-btn>
            <v-btn value="7d" size="small">7d</v-btn>
          </v-btn-toggle>
        </div>
        <div style="height: 250px; position: relative;">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </v-card-text>
    </v-card>

    <!-- Status do Worker -->
    <v-card variant="outlined">
      <v-card-text>
        <h3 class="text-h6 mb-4">Status do Worker</h3>
        <div class="d-flex align-center">
          <v-avatar :color="workerStatus.color" size="40" class="mr-4">
            <v-icon>{{ workerStatus.icon }}</v-icon>
          </v-avatar>
          <div>
            <p class="text-h6 mb-0">{{ workerStatus.text }}</p>
            <p class="text-caption text-grey">{{ workerStatus.description }}</p>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Informações Adicionais -->
    <v-card variant="outlined">
      <v-card-text>
        <h3 class="text-h6 mb-4">Informações do Dispositivo</h3>
        <v-list lines="two">
          <v-list-item>
            <template v-slot:prepend>
              <v-icon>mdi-identifier</v-icon>
            </template>
            <v-list-item-title>ID do Dispositivo</v-list-item-title>
            <v-list-item-subtitle>{{ device.id }}</v-list-item-subtitle>
          </v-list-item>

          <v-list-item>
            <template v-slot:prepend>
              <v-icon>mdi-cellphone</v-icon>
            </template>
            <v-list-item-title>Modelo</v-list-item-title>
            <v-list-item-subtitle>{{ device.model || 'Desconhecido' }}</v-list-item-subtitle>
          </v-list-item>

          <v-list-item>
            <template v-slot:prepend>
              <v-icon>mdi-monitor-screenshot</v-icon>
            </template>
            <v-list-item-title>Resolução</v-list-item-title>
            <v-list-item-subtitle>{{ device.width }}x{{ device.height }}</v-list-item-subtitle>
          </v-list-item>

          <v-list-item>
            <template v-slot:prepend>
              <v-icon>mdi-calendar-clock</v-icon>
            </template>
            <v-list-item-title>Conectado em</v-list-item-title>
            <v-list-item-subtitle>{{ formatDate(device.created_at) }}</v-list-item-subtitle>
          </v-list-item>

          <v-list-item>
            <template v-slot:prepend>
              <v-icon>mdi-clock-outline</v-icon>
            </template>
            <v-list-item-title>Última Atividade</v-list-item-title>
            <v-list-item-subtitle>{{ formatDate(device.last_seen) }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default {
  name: 'TabStats',
  components: {
    Line
  },
  props: {
    device: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      chartPeriod: '24h'
    }
  },
  computed: {
    stats() {
      return this.device.stats || {}
    },
    successRate() {
      const total = this.stats.totalProcessed || 0
      const success = this.stats.totalSuccess || 0
      if (total === 0) return 0
      return Math.round((success / total) * 100)
    },
    workerStatus() {
      if (this.device.workerEnabled === false) {
        return {
          color: 'warning',
          icon: 'mdi-pause-circle',
          text: 'Pausado',
          description: 'Worker está pausado e não processa tasks'
        }
      }
      if (this.device.status === 'ONLINE') {
        return {
          color: 'success',
          icon: 'mdi-play-circle',
          text: 'Ativo',
          description: 'Worker está processando tasks normalmente'
        }
      }
      return {
        color: 'error',
        icon: 'mdi-stop-circle',
        text: 'Inativo',
        description: 'Dispositivo offline - worker parado'
      }
    },
    chartData() {
      const labels = this.chartPeriod === '24h' 
        ? this.getLast24HoursLabels() 
        : this.getLast7DaysLabels()
      
      // Gera dados simulados (você pode substituir por dados reais da API)
      const dataPoints = labels.map(() => Math.floor(Math.random() * 20))
      
      return {
        labels,
        datasets: [
          {
            label: 'Tasks Processadas',
            data: dataPoints,
            borderColor: 'rgb(33, 150, 243)',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5
          }
        ]
      }
    },
    chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    }
  },
  methods: {
    formatDate(date) {
      if (!date) return 'Nunca'
      try {
        return new Date(date).toLocaleString('pt-BR')
      } catch {
        return 'Inválido'
      }
    },
    getLast24HoursLabels() {
      const labels = []
      const now = new Date()
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
        labels.push(hour.getHours() + ':00')
      }
      return labels
    },
    getLast7DaysLabels() {
      const labels = []
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        labels.push(day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }))
      }
      return labels
    }
  }
}
</script>
