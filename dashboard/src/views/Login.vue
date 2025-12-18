<template>
  <v-container fluid class="fill-height pa-0">
    <v-row no-gutters class="fill-height">
      <!-- Painel Esquerdo - Imagem/Brand -->
      <v-col cols="12" md="6" class="d-none d-md-flex bg-primary align-center justify-center">
        <div class="text-center">
          <v-icon size="120" color="white" class="mb-6">mdi-cellphone-link</v-icon>
          <h1 class="text-h3 font-weight-bold text-white mb-4">ADB Manager</h1>
          <p class="text-h6 text-white">Gerencie 100+ dispositivos Android com automação inteligente</p>
        </div>
      </v-col>

      <!-- Painel Direito - Formulário de Login -->
      <v-col cols="12" md="6" class="d-flex align-center justify-center">
        <v-card flat max-width="450" width="100%" class="pa-8">
          <div class="text-center mb-8">
            <v-icon size="80" color="primary" class="mb-4 d-md-none">mdi-cellphone-link</v-icon>
            <h2 class="text-h4 font-weight-bold mb-2">Bem-vindo</h2>
            <p class="text-body-1 text-grey">Faça login para continuar</p>
          </div>

          <v-form @submit.prevent="handleLogin" ref="form">
            <v-text-field
              v-model="username"
              label="Usuário"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              :disabled="loading"
              class="mb-4"
              autofocus
            />

            <v-text-field
              v-model="password"
              label="Senha"
              prepend-inner-icon="mdi-lock"
              :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
              :type="showPassword ? 'text' : 'password'"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              :disabled="loading"
              @click:append-inner="showPassword = !showPassword"
              class="mb-2"
            />

            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              density="compact"
              closable
              class="mb-4"
              @click:close="error = ''"
            >
              {{ error }}
            </v-alert>

            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              :loading="loading"
              class="mb-4"
            >
              <v-icon start>mdi-login</v-icon>
              Entrar
            </v-btn>

            <v-divider class="my-6" />

            <div class="text-center">
              <p class="text-caption text-grey">
                <v-icon size="small" class="mr-1">mdi-information</v-icon>
                Versão 3.0.0 - Dashboard ADB Manager
              </p>
            </div>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: 'Login',
  data: () => ({
    username: '',
    password: '',
    showPassword: false,
    loading: false,
    error: '',
    rules: {
      required: value => !!value || 'Campo obrigatório'
    }
  }),
  methods: {
    async handleLogin() {
      // Valida form
      const { valid } = await this.$refs.form.validate()
      if (!valid) return

      this.loading = true
      this.error = ''

      // Simula delay de autenticação
      await new Promise(resolve => setTimeout(resolve, 800))

      // Validação simples (admin/admin)
      if (this.username === 'admin' && this.password === 'admin') {
        // Salva token no localStorage
        const token = btoa(`${this.username}:${Date.now()}`)
        localStorage.setItem('authToken', token)
        localStorage.setItem('authUser', this.username)
        
        // Redireciona para dashboard
        this.$router.push('/')
      } else {
        this.error = 'Usuário ou senha inválidos'
        this.loading = false
      }
    }
  },
  mounted() {
    // Se já está logado, redireciona
    const token = localStorage.getItem('authToken')
    if (token) {
      this.$router.push('/')
    }
  }
}
</script>

<style scoped>
.fill-height {
  height: 100vh;
}
</style>
