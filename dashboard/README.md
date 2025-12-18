# ADB Manager Dashboard

Dashboard web para gerenciamento de dispositivos Android via ADB - Projeto V3.0

## 🚀 Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📦 Tecnologias

- Vue.js 3
- Vuetify 3
- Pinia (State Management)
- Vue Router
- Axios
- Chart.js

## 🐳 Docker

```bash
# Build
docker build -t adb-manager-dashboard .

# Run
docker run -p 3000:80 adb-manager-dashboard
```

## 📝 Funcionalidades

- Lista de dispositivos com filtros e busca
- Detalhes do dispositivo (Fila, Estatísticas, Configurações)
- Gerenciamento de fila de tasks
- Estatísticas em tempo real
- Controle de workers (pausar/retomar)
- Reconexão ADB automática
- Interface responsiva e moderna
