import { defineStore } from 'pinia'
import deviceController from '@/services/deviceController'
import queueController from '@/services/queueController'

export const useAppStore = defineStore('app', {
  state: () => ({
    apiUrl: '',
    devices: [],
    loading: false,
    stats: null
  }),
  
  getters: {
    onlineDevices: (state) => state.devices.filter(d => d.status === 'ONLINE'),
    offlineDevices: (state) => state.devices.filter(d => d.status === 'OFFLINE'),
    getDeviceByAlias: (state) => (alias) => state.devices.find(d => d.alias === alias)
  },
  
  actions: {
    setApiUrl(url) {
      this.apiUrl = url
    },
    
    async loadDevices() {
      try {
        this.loading = true
        const response = await deviceController.fetchAll()
        this.devices = response.devices || []
      } catch (error) {
        console.error('Erro ao carregar devices:', error)
      } finally {
        this.loading = false
      }
    },
    
    async loadStats() {
      try {
        const response = await deviceController.getStats()
        this.stats = response
      } catch (error) {
        console.error('Erro ao carregar stats:', error)
      }
    },
    
    async reconnectDevice(deviceId) {
      try {
        await deviceController.reconnect(deviceId)
        await this.loadDevices()
      } catch (error) {
        throw error
      }
    },
    
    async disconnectDevice(deviceId) {
      try {
        await deviceController.disconnect(deviceId)
        await this.loadDevices()
      } catch (error) {
        throw error
      }
    },
    
    async toggleWorker(deviceId, enabled) {
      try {
        await deviceController.toggleWorker(deviceId, enabled)
        await this.loadDevices()
      } catch (error) {
        throw error
      }
    }
  }
})
