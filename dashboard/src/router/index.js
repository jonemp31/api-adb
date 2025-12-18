import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Device from '@/views/Device.vue'
import Login from '@/views/Login.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: { title: 'Login', requiresAuth: false }
  },
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: { title: 'Dispositivos', requiresAuth: true }
  },
  {
    path: '/device/:alias',
    name: 'device',
    component: Device,
    meta: { title: 'Detalhes do Dispositivo', requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title} - ADB Manager` || 'ADB Manager'
  
  // Verifica autenticação
  const authToken = localStorage.getItem('authToken')
  const requiresAuth = to.meta.requiresAuth !== false
  
  if (requiresAuth && !authToken) {
    // Redireciona para login se não autenticado
    next('/login')
  } else if (to.path === '/login' && authToken) {
    // Redireciona para home se já autenticado
    next('/')
  } else {
    next()
  }
})

export default router
