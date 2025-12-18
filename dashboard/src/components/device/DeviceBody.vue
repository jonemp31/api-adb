<template>
  <div>
    <!-- Tabs -->
    <v-tabs v-model="tab" bg-color="transparent" color="primary" grow>
      <v-tab value="queue">
        <v-icon start>mdi-format-list-bulleted</v-icon>
        Fila
      </v-tab>
      <v-tab value="stats">
        <v-icon start>mdi-chart-line</v-icon>
        Estatísticas
      </v-tab>
      <v-tab value="settings">
        <v-icon start>mdi-cog</v-icon>
        Configurações
      </v-tab>
    </v-tabs>

    <!-- Tab Content -->
    <v-window v-model="tab" class="mt-6">
      <v-window-item value="queue">
        <TabQueue :device="device" @refresh="$emit('refresh')" />
      </v-window-item>

      <v-window-item value="stats">
        <TabStats :device="device" />
      </v-window-item>

      <v-window-item value="settings">
        <TabSettings :device="device" @refresh="$emit('refresh')" />
      </v-window-item>
    </v-window>
  </div>
</template>

<script>
import TabQueue from './tabs/TabQueue.vue'
import TabStats from './tabs/TabStats.vue'
import TabSettings from './tabs/TabSettings.vue'

export default {
  name: 'DeviceBody',
  components: {
    TabQueue,
    TabStats,
    TabSettings
  },
  props: {
    device: {
      type: Object,
      required: true
    }
  },
  emits: ['refresh'],
  data: () => ({
    tab: 'queue'
  })
}
</script>
