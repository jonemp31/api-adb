# 🎨 DASHBOARD WEB - GUIA COMPLETO

## 🚀 O Que Foi Criado

Um **dashboard web completo** estilo Evolution Manager para gerenciar seus 100+ dispositivos Android via ADB!

---

## 📁 Estrutura do Projeto

```
v3.0/
├── dashboard/                          # Frontend (Vue.js 3)
│   ├── src/
│   │   ├── views/
│   │   │   ├── Home.vue               # Lista de devices
│   │   │   └── Device.vue             # Detalhes do device
│   │   ├── components/
│   │   │   └── device/
│   │   │       ├── DeviceHeader.vue   # Header com botões
│   │   │       ├── DeviceBody.vue     # Container das tabs
│   │   │       └── tabs/
│   │   │           ├── TabQueue.vue   # Fila de tasks
│   │   │           ├── TabStats.vue   # Estatísticas
│   │   │           └── TabSettings.vue # Configurações
│   │   ├── services/
│   │   │   ├── deviceController.js    # API calls devices
│   │   │   └── queueController.js     # API calls queue
│   │   ├── store/
│   │   │   └── index.js               # Pinia store (estado global)
│   │   ├── router/
│   │   │   └── index.js               # Vue Router
│   │   ├── plugins/
│   │   │   └── vuetify.js             # Vuetify config
│   │   ├── App.vue                    # Componente raiz
│   │   ├── main.js                    # Entry point
│   │   └── http-common.js             # Axios configurado
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── index.html
│
├── src/server.js                       # ✅ ATUALIZADO com novos endpoints
├── src/services/
│   ├── adb.service.js                 # ✅ ATUALIZADO (método connect)
│   └── supabase.service.js            # ✅ ATUALIZADO (updateField, updateCoordinates)
│
└── docker-compose.yml                  # ✅ ATUALIZADO (service dashboard)
```

---

## 🎯 Funcionalidades Implementadas

### **🔐 Sistema de Autenticação** 🆕
✅ Tela de login com design moderno  
✅ Validação com **usuário: admin** e **senha: admin**  
✅ Token JWT armazenado no localStorage  
✅ Middleware de proteção de rotas  
✅ Botão de logout com confirmação  
✅ Exibição de usuário logado na navbar  
✅ Redirecionamento automático se não autenticado

### **🌓 Dark Mode** 🆕
✅ Toggle entre tema claro e escuro  
✅ Botão com ícone sol/lua na navbar  
✅ Persistência da preferência no localStorage  
✅ Aplicação instantânea em todos os componentes Vuetify

### **📊 Contadores de Tasks** 🆕
✅ Contador "Hoje" com reset automático à meia-noite  
✅ Contador "Total" acumulado por device  
✅ Armazenamento em Redis com TTL inteligente  
✅ Incremento automático ao completar tasks  
✅ Exibição em tempo real no dashboard

### **📈 Gráfico Chart.js** 🆕
✅ Gráfico de linha no Tab Stats  
✅ Visualização de últimas 24 horas (por hora)  
✅ Visualização de últimos 7 dias (por dia)  
✅ Toggle entre períodos (24h/7d)  
✅ Design responsivo e animado  
✅ Cores consistentes com tema do dashboard

### **⚠️ Confirmação de Ações** 🆕
✅ Dialog de confirmação antes de limpar fila  
✅ Exibe quantidade de tasks que serão removidas  
✅ Botões com cores semânticas (erro para ações destrutivas)  
✅ Prevenção de cliques acidentais

### **Página Home (Lista de Devices)**
✅ Cards com alias (cel01, cel02, cel03...)  
✅ Avatar Android com status visual (verde/vermelho)  
✅ Informações: Modelo, Resolução, Data conexão  
✅ Estatísticas da fila (Aguardando, **Hoje** 🆕, **Total** 🆕)  
✅ Filtros: Todos, ONLINE, OFFLINE  
✅ Busca por alias, ID ou modelo  
✅ Botão Refresh (auto-refresh a cada 10s)  
✅ Dialog para conectar novo device  

### **Página Device (Detalhes)**

#### **Tab 1: Queue (Fila)** ✅
- Resumo visual (4 cards): Aguardando, Hoje, Total, Em Processamento
- Formulário para adicionar task (telefone + mensagem)
- Lista de tasks pendentes (com highlight da que está processando)
- Histórico de tasks (últimas 20)
- Botão "Limpar Fila"

#### **Tab 2: Stats (Estatísticas)** ✅
- 4 métricas principais: Total Processado, Sucesso, Falhas, Taxa de Sucesso
- **Gráfico de linha interativo (Chart.js)** 🆕
  - Histórico de tasks processadas
  - Toggle entre 24h e 7 dias
  - Animações suaves e responsivo
- Status do worker (Ativo/Pausado/Inativo) com cores
- Informações do dispositivo (ID, Modelo, Resolução, Datas)

#### **Tab 3: Settings (Configurações)** ✅
- Ajustar coordenadas WhatsApp (focus_x, focus_y)
- Testar comando ADB manual
- Toggle de notificações (ON/OFF)
- Informações de resolução e fator de escala

#### **Header do Device** ✅
- Avatar Android com status
- Alias + Device ID + Status Chip
- Chip "PAUSADO" se worker desligado
- Botões:
  - Atualizar (refresh manual)
  - Pausar/Retomar Worker
  - Reconectar (adb connect)
  - Desconectar (marca OFFLINE)

---

## 🔌 Novos Endpoints do Backend

Todos foram adicionados em `server.js`:

```javascript
// Estatísticas de device específico
GET /device/:alias/stats

// Reconectar via ADB
POST /device/:deviceId/reconnect

// Desconectar (marca OFFLINE)
POST /device/:deviceId/disconnect

// Pausar/Retomar worker
POST /device/:deviceId/worker
Body: { "enabled": true/false }

// Testar comando ADB
POST /device/:deviceId/test
Body: { "command": "echo test" }

// Atualizar coordenadas
PUT /device/:deviceId/coordinates
Body: { "focus_x": 1345, "focus_y": 1006 }

// Info da fila (melhorado)
GET /queue/:deviceAlias

// Tasks pendentes
GET /queue/:deviceAlias/tasks

// Histórico
GET /queue/:deviceAlias/history?limit=50

// Limpar fila
DELETE /queue/:deviceAlias
```

---

## 🚀 Como Rodar

### **Opção 1: Desenvolvimento (Local)**

```bash
# 1. Entre na pasta do dashboard
cd v3.0/dashboard

# 2. Instale as dependências
npm install

# 3. Certifique-se que o backend está rodando (porta 8080)
cd ..
docker-compose up -d dispatcher redis

# 4. Rode o dashboard em modo dev
cd dashboard
npm run dev

# 5. Acesse http://localhost:5173
# 6. 🔐 Faça login com:
#    Usuário: admin
#    Senha: admin
```

### **Opção 2: Produção (Docker)**

```bash
# 1. Entre na pasta v3.0
cd v3.0

# 2. Suba tudo com Docker Compose
docker-compose up -d --build

# 3. Acesse:
# - Backend: http://localhost:8080
# - Dashboard: http://localhost:3000
# - Redis Commander: http://localhost:8081
```

---

## 📊 Tecnologias Usadas

### **Frontend**
- **Vue.js 3** - Framework progressivo
- **Vuetify 3** - Material Design components
- **Pinia** - State management (substituiu Vuex)
- **Vue Router** - SPA navigation
- **Axios** - HTTP client
- **Chart.js** - Gráficos (preparado para usar)
- **Vite** - Build tool super rápido

### **Backend (Já Existente)**
- Node.js 18
- Express.js
- Redis (filas)
- Supabase (PostgreSQL)
- ADB (adbkit)

---

## 🎨 Design Highlights

### **Cores do Status**
- 🟢 **Verde (success)**: Device ONLINE, tasks completadas
- 🔴 **Vermelho (error)**: Device OFFLINE, tasks falhadas
- 🟠 **Laranja (warning)**: Worker pausado, tasks aguardando
- 🔵 **Azul (info/primary)**: Tasks em processamento

### **Ícones Material Design**
- `mdi-android` - Dispositivo Android
- `mdi-check-circle` - ONLINE
- `mdi-close-circle` - OFFLINE
- `mdi-pause-circle` - Worker pausado
- `mdi-play-circle` - Worker ativo
- `mdi-refresh` - Atualizar
- `mdi-cog` - Configurações
- `mdi-chart-line` - Estatísticas

---

## 🔄 Fluxo de Dados

```
[Dashboard Vue] 
    ↓ HTTP Request
[Nginx] → Proxy /api/* 
    ↓
[Backend Express:8080]
    ↓
[Redis] (filas) + [Supabase] (metadados)
    ↓
[Workers Assíncronos]
    ↓
[Devices Android via ADB]
```

---

## ⚙️ Configurações Importantes

### **vite.config.js**
```javascript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',  // Backend
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

### **nginx.conf** (Produção)
```nginx
location /api/ {
    proxy_pass http://dispatcher:8080/;
}
```

### **docker-compose.yml**
```yaml
dashboard:
  build: ./dashboard
  ports:
    - "3000:80"
  depends_on:
    - dispatcher
```

---

## 📝 To-Do (Melhorias Futuras)

- [x] **Contador de tasks "Hoje" e "Total" por device** ✅
- [x] **Gráfico de linha (Chart.js) no Tab Stats** ✅
- [x] **Confirmação antes de limpar fila** ✅
- [x] **Dark Mode** ✅
- [x] **Autenticação/Login (admin/admin)** ✅
- [ ] Implementar histórico de tasks no Redis (armazenamento persistente)
- [ ] Notificações toast para ações (sucesso/erro)
- [ ] Filtro de datas no histórico
- [ ] Exportar relatório CSV
- [ ] WebSocket para updates em tempo real

---

## 🐛 Troubleshooting

### **Dashboard não carrega devices**
- Verifique se o backend está rodando (porta 8080)
- Verifique se há devices no Supabase
- Olhe o console do navegador (F12)

### **Erro de CORS**
- Certifique-se que o proxy está configurado no vite.config.js
- Em produção, o Nginx resolve isso

### **Botões não funcionam**
- Alguns endpoints podem retornar erro se o método não existir
- Verifique logs do backend: `docker logs dispatcher`

### **Build falha**
- Rode `npm install` novamente
- Limpe cache: `rm -rf node_modules package-lock.json && npm install`

---

## 🎉 Resultado Final

Você agora tem um **dashboard profissional** para gerenciar 100+ dispositivos Android via ADB com:

✅ Interface moderna e responsiva  
✅ **Sistema de autenticação (Login/Logout)** 🆕  
✅ **Dark Mode com persistência** 🆕  
✅ Gerenciamento de filas em tempo real  
✅ **Contadores "Hoje" e "Total" por device** 🆕  
✅ **Gráfico Chart.js interativo (24h/7d)** 🆕  
✅ **Confirmação antes de ações destrutivas** 🆕  
✅ Controle granular de workers  
✅ Estatísticas visuais detalhadas  
✅ Configurações por device  
✅ Auto-refresh e reconexão automática  
✅ Docker-ready para produção  

---

## 🔐 Credenciais de Acesso

**Usuário:** `admin`  
**Senha:** `admin`

> ⚠️ **Importante:** Em produção, altere as credenciais no código [Login.vue](dashboard/src/views/Login.vue) linha 99

---

**Feito com ❤️ baseado no Evolution Manager e adaptado para ADB V3.0** 🚀
