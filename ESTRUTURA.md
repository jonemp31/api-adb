# 📐 ESTRUTURA DO PROJETO V3.0

## 🎯 Visão Geral do Sistema

Este projeto é uma **API de automação ADB** que controla **100+ dispositivos Android simultaneamente** usando:
- **Redis** como fila FIFO para organizar tarefas
- **Supabase** (PostgreSQL) para persistir metadados dos devices
- **Docker** para isolar serviços e facilitar deploy
- **Node.js** com 100 workers assíncronos (1 por device)

---

## 📁 Estrutura de Arquivos Implementada

```
v3.0/
├── docker-compose.yml          # Orquestração dos containers
├── Dockerfile                  # Imagem Node.js + ADB tools
├── package.json                # Dependências do projeto
├── .env.example                # Template de configuração
├── .gitignore                  # Arquivos ignorados pelo Git
├── .dockerignore               # Arquivos ignorados pelo Docker
├── README.md                   # Documentação técnica
├── GUIA-JUNIOR.md              # Guia passo a passo para deploy
├── NOTIFICACOES.md             # Documentação do sistema de notificações
├── ESTRUTURA.md                # Este arquivo (análise completa)
│
└── src/
    ├── server.js               # ⭐ Arquivo principal (entry point)
    │
    └── services/
        ├── queue.service.js        # Redis: gerenciamento de filas FIFO
        ├── supabase.service.js     # Supabase: CRUD de devices
        ├── adb.service.js          # ADB: execução de comandos
        ├── notification.service.js # Captura de notificações WhatsApp
        ├── worker-pool.service.js  # Pool de 100 workers assíncronos
        └── health-check.service.js # Monitora conectividade ADB e auto-reconnect
```

---

## 🏗️ Arquitetura do Sistema

### **Fluxo Completo de Uma Tarefa**

```
1. API recebe requisição
   ↓
2. Dispatcher adiciona task na fila Redis (queue:device_001)
   ↓
3. Worker dedicado do device_001 está em loop infinito perguntando:
   "Tem tarefa pra mim?"
   ↓
4. Worker pega task da fila (LPOP) e marca como "processing:device_001" 
   com TTL de 5 minutos (proteção contra crash)
   ↓
5. Worker executa comando ADB no device
   ↓
6. Worker chama /complete ou /fail
   ↓
7. Redis remove "processing:device_001" e libera o worker
   ↓
8. Worker volta ao loop (pergunta de novo se tem tarefa)
```

### **Componentes e Responsabilidades**

#### **1. Docker Compose** (`docker-compose.yml`)
- **O que faz**: Sobe 3 containers isolados
- **Containers**:
  - `redis`: Banco de dados em memória (fila de tarefas)
  - `redis-commander`: Interface web para visualizar Redis
  - `dispatcher`: Nossa aplicação Node.js
- **Por que `network_mode: host`**: Permite o Dispatcher descobrir devices Android conectados via ADB WiFi

#### **2. Dockerfile**
- **Base**: Node.js 18 Alpine (leve)
- **Extras instalados**: `android-tools` (adb, fastboot)
- **Por que Alpine**: Imagem de 40MB vs 900MB (Ubuntu)

#### **3. Server.js** (Cérebro do Sistema)
- **Função**: Inicializa tudo na ordem correta
- **Sequência de Inicialização**:
  1. Conecta Redis
  2. Conecta Supabase
  3. Sincroniza devices conectados via ADB → Supabase
  4. Inicia 100 workers (1 por device)
  5. Inicia polling de notificações (se webhook configurada)
  6. Sobe API REST (Express.js)

#### **4. Queue Service** (`queue.service.js`)
- **Responsabilidade**: Gerenciar filas no Redis
- **Padrão**: FIFO (First In, First Out) - primeiro que entra é o primeiro a sair
- **Chaves Redis**:
  - `queue:{deviceId}`: Lista de task IDs pendentes
  - `task:{taskId}`: Dados completos da task (JSON)
  - `processing:{deviceId}`: Task que está sendo executada agora (TTL 5 min)
- **Funções Principais**:
  - `addTask()`: Adiciona no fim da fila (RPUSH)
  - `getNextTask()`: Pega do início da fila (LPOP)
  - `completeTask()`: Remove lock e marca como sucesso
  - `failTask()`: Remove lock, marca falha, re-enfilera (3 tentativas)

**🔒 Proteção Contra Deadlock** (Implementado após sua observação):
```javascript
// Se worker morrer, chave expira em 5 minutos automaticamente
await redis.set(KEYS.PROCESSING(deviceId), taskId, 'EX', 300);
```

#### **5. Supabase Service** (`supabase.service.js`)
- **Responsabilidade**: Persistir metadados dos devices
- **Tabela**: `devices`
- **Campos**:
  - `id`: ID do device via ADB (ex: `192.168.1.100:5555`)
  - `alias`: Nome amigável (ex: `cel01`, `cel02`)
  - `width`, `height`: Resolução da tela
  - `status`: ONLINE/OFFLINE
  - `model`: Modelo do celular (ex: `SM-G973F`)
  - `focus_x`, `focus_y`: Coordenadas do campo de mensagem WhatsApp
  - `last_seen`: Última vez que device respondeu

**Auto-Naming**: Sistema gera automaticamente `cel01`, `cel02`, `cel03`...

#### **6. ADB Service** (`adb.service.js`)
- **Responsabilidade**: Executar comandos ADB nos devices
- **Biblioteca**: `adbkit` (Node.js)
- **Funções Principais**:
  - `execShell()`: Executa comando shell com timeout de 30s
  - `calcCoords()`: Calcula coordenadas adaptativas (proporção 720x1600)
  - `sendMessage()`: **Fluxo completo** de envio WhatsApp:
    1. Abre WhatsApp (`am start`)
    2. Clica no campo de busca (tap)
    3. Digita número do contato (humanizado)
    4. Aguarda contato aparecer (3s)
    5. Clica no contato
    6. Aguarda chat abrir (2s)
    7. Clica no campo de mensagem
    8. Digita mensagem (humanizado com variação de velocidade)
    9. Envia (tap no botão enviar)
  - `typeHumanAdvanced()`: Simula digitação humana:
    - Velocidade varia por hora (manhã rápido, noite devagar)
    - 6% de taxa de erro (digita errado + apaga + corrige)

**Coordenadas Adaptativas**:
```javascript
// Base: 720x1600 (seu device de referência)
// Se device real for 1080x2400:
// x = (1345 * 1080) / 720 = 2017.5
// y = (1006 * 2400) / 1600 = 1509
```

#### **7. Notification Service** (`notification.service.js`)
- **Responsabilidade**: Capturar notificações do WhatsApp e enviar para webhook
- **Método**: Polling direto via `dumpsys notification --noredact` (File 2)
- **Intervalo**: 3 segundos
- **Funcionamento**:
  1. A cada 3s, executa `dumpsys notification` em cada device ONLINE
  2. Filtra apenas notificações do WhatsApp (`com.whatsapp`)
  3. Extrai: título (nome contato), texto (mensagem), telefone (regex brasileiro)
  4. Deduplicação: últimas 100 notificações (50 primeiros caracteres)
  5. Envia para webhook com payload:
     ```json
     {
       "timestamp": 1734556800000,
       "horario": "18/12/2025 14:30:00",
       "dispositivo": "cel01",
       "app": "WhatsApp",
       "title": "João Silva",
       "text": "Oi, tudo bem?",
       "phone": "5511999887766"
     }
     ```

**Por que não limpa notificações**: Para não interferir com o usuário real do device.

#### **8. Worker Pool Service** (`worker-pool.service.js`)
- **Responsabilidade**: Gerenciar 100 workers simultâneos
- **Padrão**: 1 worker dedicado por device (loop infinito)
- **Como funciona**:
  ```javascript
  async function deviceWorker(deviceId) {
    while (true) { // Loop infinito
      const { task } = await queueService.getNextTask(deviceId);
      
      if (!task) {
        await sleep(1500); // Aguarda 1.5s e pergunta de novo
        continue;
      }
      
      // Executa task
      const result = await executeTask(task);
      
      // Marca como completa/falha
      if (result.success) {
        await queueService.completeTask(task.id, result);
      } else {
        await queueService.failTask(task.id, result.error, true);
      }
    }
  }
  ```

**Por que 100 workers não trava**:
- Node.js usa **event loop** (não threads)
- Operações ADB são **I/O bound** (espera resposta do device)
- Enquanto espera, event loop processa outros workers
- 6 cores processam 100+ operações I/O simultâneas sem problemas

**Estatísticas rastreadas**:
- `totalProcessed`: Total de tasks executadas
- `totalSuccess`: Tasks bem-sucedidas
- `totalFailed`: Tasks que falharam

#### **9. Health Check Service** (`health-check.service.js`)
- **Responsabilidade**: Monitorar conectividade ADB e reconectar devices automaticamente
- **Intervalo**: 30 segundos (configurável via `HEALTH_CHECK_INTERVAL`)
- **Funcionamento**:
  1. A cada 30s, verifica todos os devices ONLINE no Supabase
  2. Tenta executar comando simples (`echo "ping"`) em cada device
  3. Se device não responde: inicia processo de reconexão
  4. Tenta reconectar até 3 vezes com backoff exponencial (2s, 4s, 6s)
  5. Se reconectar: atualiza status para ONLINE no Supabase
  6. Se falhar: marca como OFFLINE no Supabase e gera alerta
- **Funções Principais**:
  - `checkDeviceHealth()`: Verifica se device responde (timeout 5s)
  - `reconnectDevice()`: Tenta reconectar via `adb connect` (3 tentativas)
  - `startHealthCheck()`: Loop infinito em background
- **Backoff Exponencial**: Aguarda 2s → 4s → 6s entre tentativas (não sobrecarrega rede)

**Por que é importante**:
- WiFi instável pode derrubar conexões ADB
- Devices podem reiniciar ou perder conexão
- Reconexão automática evita intervenção manual
- Mantém Supabase sincronizado com estado real

---

## 🔗 Comunicação Entre Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE (Postman/cURL)                │
└──────────────────────┬──────────────────────────────────────┘
                       │ POST /send
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    SERVER.JS (Express API)                   │
│  Endpoints:                                                  │
│  • POST /send → Adiciona task na fila                       │
│  • GET /health → Status do sistema                          │
│  • GET /devices → Lista devices Supabase                    │
│  • GET /queue/:deviceId → Tamanho da fila                   │
└──────────────┬────────────────────┬─────────────────────────┘
               │                    │
               ↓                    ↓
┌──────────────────────┐  ┌───────────────────────────┐
│   QUEUE SERVICE      │  │   SUPABASE SERVICE        │
│   (Redis)            │  │   (PostgreSQL Cloud)      │
│                      │  │                           │
│ • addTask()          │  │ • getOnlineDevices()      │
│ • getNextTask()      │  │ • updateDeviceStatus()    │
│ • completeTask()     │  │ • getDeviceByAlias()      │
└──────────┬───────────┘  └───────────────────────────┘
           │
           │ Worker puxa tasks da fila
           ↓
┌─────────────────────────────────────────────────────────────┐
│              WORKER POOL SERVICE (100 workers)               │
│  • deviceWorker(device_001) → Loop infinito                  │
│  • deviceWorker(device_002) → Loop infinito                  │
│  • ... (98 workers)                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ Executa comando
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                      ADB SERVICE                             │
│  • execShell() → Executa comando no device Android          │
│  • sendMessage() → Automação WhatsApp completa              │
└─────────────────────────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                DEVICES ANDROID (via ADB WiFi)                │
│  • 192.168.1.100:5555 (cel01)                               │
│  • 192.168.1.101:5555 (cel02)                               │
│  • ... (100 devices)                                         │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│           NOTIFICATION SERVICE (Processo Paralelo)           │
│  Polling a cada 3s:                                          │
│  1. dumpsys notification --noredact                          │
│  2. Filtra WhatsApp                                          │
│  3. Extrai título, texto, telefone                           │
│  4. POST → Webhook N8N                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│            WEBHOOK N8N (Externo)                             │
│  https://webhook-dev.zapsafe.work/webhook/webhookglobalcels │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ O Que Está IMPLEMENTADO (100% Pronto)

### **1. Infraestrutura**
- ✅ Docker Compose com 3 serviços (redis, redis-commander, dispatcher)
- ✅ Dockerfile otimizado (Node 18 + ADB tools)
- ✅ Variáveis de ambiente configuradas (.env.example)
- ✅ Redis com persistência AOF (sobrevive a reinicializações)

### **2. API REST**
- ✅ `POST /send` - Envia mensagem WhatsApp
- ✅ `GET /health` - Status do sistema + estatísticas
- ✅ `GET /devices` - Lista devices do Supabase
- ✅ `GET /queue/:deviceId` - Tamanho da fila
- ✅ `GET /health-check` - Status do monitoramento ADB + conectividade

### **3. Gerenciamento de Filas**
- ✅ FIFO por device (queue:deviceId)
- ✅ Sistema de retry (3 tentativas)
- ✅ Lock com TTL de 5 minutos (proteção contra deadlock)
- ✅ Persistência de tasks no Redis

### **4. Banco de Dados**
- ✅ Integração com Supabase
- ✅ Schema da tabela `devices` definido
- ✅ Auto-naming de devices (cel01, cel02, cel03...)
- ✅ Sincronização ADB ↔ Supabase

### **5. Automação ADB**
- ✅ Execução de comandos com timeout
- ✅ Coordenadas adaptativas (base 720x1600)
- ✅ Fluxo completo de envio WhatsApp (9 passos)
- ✅ Digitação humanizada (velocidade variável + 6% erro)

### **6. Sistema de Workers**
- ✅ Pool de 100 workers assíncronos
- ✅ 1 worker dedicado por device (loop infinito)
- ✅ Estatísticas de processamento
- ✅ Event loop paralelo (I/O bound)

### **7. Captura de Notificações**
- ✅ Polling de notificações WhatsApp (3s)
- ✅ Extração de título, texto, telefone
- ✅ Deduplicação (últimas 100)
- ✅ Envio automático para webhook N8N
- ✅ Payload rico (timestamp, horario, dispositivo, app, phone)

### **8. Health Check Avançado**
- ✅ Monitoramento de conectividade ADB (30s)
- ✅ Auto-reconnect com 3 tentativas
- ✅ Backoff exponencial (2s, 4s, 6s)
- ✅ Atualização automática de status no Supabase
- ✅ Endpoint `/health-check` para consultar status

### **9. Documentação**
- ✅ README.md (documentação técnica)
- ✅ GUIA-JUNIOR.md (passo a passo deployment)
- ✅ NOTIFICACOES.md (sistema de notificações)
- ✅ ESTRUTURA.md (este arquivo - análise completa)

---

## ⏳ O Que Ainda PRECISA SER FEITO (Deploy)

### **1. Configuração Supabase**
- ❌ Criar conta Supabase (grátis)
- ❌ Criar tabela `devices` (SQL fornecido no GUIA-JUNIOR.md)
- ❌ Copiar SUPABASE_URL e SUPABASE_KEY para .env

### **2. Preparação do VPS**
- ❌ Acessar VPS 192.168.10.61 via SSH
- ❌ Enviar pasta `v3.0/` para VPS (SCP ou Portainer)
- ❌ Copiar `.env.example` para `.env`
- ❌ Preencher credenciais Supabase no `.env`

### **3. Deploy Docker**
- ❌ Rodar `docker-compose up -d --build`
- ❌ Verificar logs: `docker logs dispatcher`
- ❌ Acessar Redis Commander: http://192.168.10.61:8081

### **4. Conexão dos Devices**
- ❌ Habilitar "Depuração USB" nos 100 celulares
- ❌ Habilitar "Depuração sem fio" (Settings → Developer Options)
- ❌ Conectar via `adb connect IP:5555` para cada device
- ❌ Verificar: `adb devices` deve listar todos

### **5. Testes**
- ❌ Testar envio: 
  ```bash
  curl -X POST http://192.168.10.61:8080/send \
    -H "Content-Type: application/json" \
    -d '{"deviceAlias":"cel01","phone":"5511999887766","message":"Teste"}'
  ```
- ❌ Verificar notificações chegando na webhook N8N
- ❌ Monitorar Redis Commander para ver fila funcionando

---

## 🎓 Decisões Técnicas Importantes

### **1. Por que Redis em vez de Memória?**
- ✅ Persistência: Se Dispatcher crashar, filas não são perdidas
- ✅ Escalabilidade: Pode ter múltiplos Dispatchers no futuro
- ✅ Visibilidade: Redis Commander permite debugar filas visualmente

### **2. Por que 100 Workers Assíncronos?**
- ✅ Node.js event loop processa I/O paralelo eficientemente
- ✅ ADB é I/O bound (espera resposta do device)
- ✅ Sem overhead de threads (6 cores suficientes)

### **3. Por que TTL de 5 Minutos no Lock?**
- ✅ Protege contra deadlock se worker morrer
- ✅ 5 min é tempo suficiente para qualquer task ADB
- ✅ Se task demorar mais, pode implementar heartbeat (futuro)

### **4. Por que Polling de 3s nas Notificações?**
- ✅ Balanço entre tempo real e carga no device
- ✅ Mais rápido que 5s da sua versão V7.0
- ✅ dumpsys é leve (não trava device)

### **5. Por que Não Limpar Notificações?**
- ✅ Não interfere com usuário real do device
- ✅ Deduplicação resolve notificações repetidas
- ✅ Se limpar, usuário perde notificações importantes

### **6. Por que Supabase em vez de PostgreSQL Local?**
- ✅ Grátis (até 500MB)
- ✅ Gerenciado (backup automático)
- ✅ API REST pronta (Row Level Security)
- ✅ Não consome recursos do VPS

---

## 📊 Capacidade do Sistema

### **Hardware VPS**
- **Cores**: 6 (suficiente para 100 workers assíncronos)
- **RAM**: 8GB
  - Redis: ~1GB
  - Dispatcher: ~500MB
  - Sobra: 6.5GB (margem de 70%)

### **Estimativas de Carga**
- **1 mensagem por device/minuto**:
  - 100 devices × 60 msg/h = 6.000 mensagens/hora
  - Tempo médio de envio: 10-15s
  - Fila média: 2-3 tasks por device

- **10 mensagens por device/minuto** (carga alta):
  - 100 devices × 600 msg/h = 60.000 mensagens/hora
  - Fila média: 20-30 tasks por device
  - Redis: ~100MB de memória

### **Limitações**
- **ADB WiFi**: Latência de 50-200ms (depende da rede)
- **WhatsApp**: Rate limit de ~40 msg/min por device (não confirmado oficialmente)
- **Redis**: Memória limitada a 1GB (configurável)

---

## 🐛 Problemas Já Resolvidos

### **1. Deadlock no Redis** (Identificado por você! 🎯)
- **Problema**: `processing:deviceId` ficava travado se worker morresse
- **Solução**: TTL de 5 minutos (`'EX', 300`)

### **2. Thread Limitation**
- **Problema**: 6 threads = apenas 6 devices simultâneos?
- **Solução**: 100 workers assíncronos (event loop I/O paralelo)

### **3. Coordenadas Fixas**
- **Problema**: Diferentes resoluções de tela
- **Solução**: Cálculo proporcional baseado em 720x1600

### **4. Digitação Robótica**
- **Problema**: WhatsApp detectaria bot
- **Solução**: Velocidade variável por hora + 6% taxa de erro

### **5. Notificações Duplicadas**
- **Problema**: Mesmo polling pode retornar mesma notificação
- **Solução**: Set de deduplicação (últimas 100, 50 chars)

---

## 🚀 Melhorias Futuras (Não Urgente)

### **1. Dashboard Web**
- Interface para visualizar:
  - Status de cada device (ONLINE/OFFLINE)
  - Tamanho das filas em tempo real
  - Estatísticas de envio (sucesso/falha)
  - Logs de erros

### **2. Autenticação API**
- Implementar JWT ou API Key
- Proteger endpoints sensíveis

### **3. Webhooks de Callback**
- Notificar cliente quando mensagem for enviada
- Exemplo: `POST https://cliente.com/callback?status=success&taskId=xxx`

### **4. Suporte a Múltiplos Apps**
- Telegram, Messenger, SMS
- Estrutura já preparada (apenas adicionar comandos ADB)

### **5. Rate Limiting Inteligente**
- Detectar rate limit do WhatsApp
- Pausar envios automaticamente por 15 min

### **6. Listener Nativo de Notificações**
- Criar app Android que usa `NotificationListenerService`
- Enviar notificações via WebSocket (tempo real, sem polling)

---

## 📞 Como Usar o Sistema (Resumo)

### **1. Enviar Mensagem**
```bash
curl -X POST http://192.168.10.61:8080/send \
  -H "Content-Type: application/json" \
  -d '{
    "deviceAlias": "cel01",
    "phone": "5511999887766",
    "message": "Olá! Esta é uma mensagem automatizada."
  }'
```

**Resposta:**
```json
{
  "success": true,
  "task": {
    "id": "a1b2c3d4-...",
    "deviceId": "192.168.1.100:5555",
    "type": "sendMessage",
    "status": "pending",
    "queuePosition": 3
  }
}
```

### **2. Verificar Status**
```bash
curl http://192.168.10.61:8080/health
```

**Resposta:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-18T14:30:00Z",
  "services": {
    "redis": "connected",
    "supabase": "connected",
    "workers": "100 active"
  },
  "stats": {
    "totalProcessed": 15420,
    "totalSuccess": 15200,
    "totalFailed": 220,
    "successRate": "98.6%"
  }
}
```

### **3. Listar Devices**
```bash
curl http://192.168.10.61:8080/devices
```

**Resposta:**
```json
{
  "success": true,
  "devices": [
    {
      "id": "192.168.1.100:5555",
      "alias": "cel01",
      "status": "ONLINE",
      "model": "SM-G973F",
      "resolution": "1080x2400",
      "last_seen": "2025-12-18T14:29:55Z"
    }
  ]
}
```

### **4. Ver Fila de um Device**
```bash
curl http://192.168.10.61:8080/queue/cel01
```

**Resposta:**
```json
{
  "success": true,
  "deviceAlias": "cel01",
  "queueLength": 5,
  "processing": {
    "id": "task_xyz",
    "type": "sendMessage",
    "startedAt": "2025-12-18T14:30:10Z"
  }
}
```

### **5. Verificar Health Check**
```bash
curl http://192.168.10.61:8080/health-check
```

**Resposta:**
```json
{
  "running": true,
  "interval": 30000,
  "devices": {
    "total": 100,
    "healthy": 98,
    "unhealthy": 2
  },
  "checks": [
    {
      "healthy": true,
      "deviceId": "192.168.1.100:5555"
    },
    {
      "healthy": false,
      "deviceId": "192.168.1.105:5555",
      "error": "Connection refused"
    }
  ]
}
```

---

## 🎉 Conclusão

**Você tem um sistema COMPLETO e ROBUSTO para controlar 100+ devices Android via ADB!**

### **Status Atual: ✅ 100% Implementado**
- Código: ✅
- Documentação: ✅
- Docker: ✅
- Proteções (deadlock, retry, timeout): ✅

### **Próximo Passo: 🚀 Deploy no VPS**
Siga o **GUIA-JUNIOR.md** passo a passo. Você consegue!

---

**Feito com ❤️ por um dev júnior com pensamento sênior** 🎯
