# 🚀 Deploy no Portainer - API ADB WhatsApp v3.0

## 📦 Imagem Docker Hub
✅ **Imagem publicada:** `jondevsouza31/api-adb:v3.0.0`  
🔗 **Docker Hub:** https://hub.docker.com/r/jondevsouza31/api-adb

---

## 🎯 Passo a Passo no Portainer

### **1. Acesse o Portainer**
```
http://SEU_IP:9000
```

### **2. Vá em Stacks > Add Stack**
- **Nome da Stack:** `whatsapp-api-v3`
- **Build method:** Web editor

### **3. Cole o Docker Compose**
Cole o conteúdo do arquivo `PORTAINER-STACK.yml` ou use este template:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: whatsapp-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: >
      redis-server 
      --appendonly yes 
      --maxmemory 1gb 
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000
    restart: unless-stopped
    networks:
      - whatsapp-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: whatsapp-redis-commander
    environment:
      - REDIS_HOSTS=local:redis:6379
    ports:
      - "8081:8081"
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - whatsapp-network

  dispatcher:
    image: jondevsouza31/api-adb:v3.0.0
    container_name: whatsapp-dispatcher
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - N8N_WEBHOOK_URL=${N8N_WEBHOOK_URL}
      - BASE_WIDTH=720
      - BASE_HEIGHT=1600
      - POLLING_INTERVAL=1500
      - HEALTH_CHECK_INTERVAL=30000
      - NOTIFICATION_INTERVAL=3000
    depends_on:
      - redis
    restart: unless-stopped
    privileged: true
    network_mode: host

networks:
  whatsapp-network:
    driver: bridge

volumes:
  redis_data:
    driver: local
```

### **4. Defina as Variáveis de Ambiente**
Clique em **"Add an environment variable"** e adicione:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `SUPABASE_URL` | `https://seu-projeto.supabase.co` | URL do seu projeto Supabase |
| `SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | Service Role Key do Supabase |
| `N8N_WEBHOOK_URL` | `https://seu-n8n.com/webhook/notificacoes` | URL do webhook N8N para notificações |

**Como obter as credenciais:**
- **Supabase:** Settings > API > Project URL e Service Role Key
- **N8N:** Criar webhook trigger e copiar URL

### **5. Deploy da Stack**
1. Clique em **"Deploy the stack"**
2. Aguarde 30-60 segundos
3. Containers devem ficar **verdes** (running)

---

## ✅ Verificação Pós-Deploy

### **1. Verifique os Containers**
```bash
docker ps
```
Deve mostrar 3 containers rodando:
- `whatsapp-redis`
- `whatsapp-redis-commander`
- `whatsapp-dispatcher`

### **2. Teste a API**
```bash
# Healthcheck
curl http://SEU_IP:8080/health

# Resposta esperada:
# {"status":"ok","uptime":123,"timestamp":"2025-12-18T10:00:00.000Z"}
```

### **3. Verifique os Devices**
```bash
curl http://SEU_IP:8080/devices
```

### **4. Acesse o Redis Commander (opcional)**
```
http://SEU_IP:8081
```

---

## 🔄 Atualizações de Versão

### **Atualizar para v3.0.1, v3.0.2, etc:**

1. No Portainer, vá em **Stacks > whatsapp-api-v3**
2. Clique em **Editor**
3. Altere a linha:
   ```yaml
   image: jondevsouza31/api-adb:v3.0.0
   ```
   Para:
   ```yaml
   image: jondevsouza31/api-adb:v3.0.1
   ```
4. Clique em **"Update the stack"**
5. Aguarde 10-20 segundos
6. ✅ Atualização concluída!

### **Rollback (voltar versão anterior):**
Mesmo processo acima, mas voltando para versão anterior:
```yaml
image: jondevsouza31/api-adb:v3.0.0
```

---

## 🔧 Troubleshooting

### **Container dispatcher não inicia:**
```bash
# Ver logs
docker logs whatsapp-dispatcher

# Possíveis causas:
# - Variáveis de ambiente faltando (SUPABASE_URL, SUPABASE_KEY)
# - Redis não conectou (verificar rede)
# - Porta 8080 já em uso
```

### **ADB não encontra devices:**
```bash
# Entrar no container
docker exec -it whatsapp-dispatcher sh

# Listar devices
adb devices

# Se não aparecer nada:
# - Verificar se network_mode: host está ativo
# - Devices devem estar na mesma rede local
# - Testar adb connect IP_DEVICE:5555
```

### **Redis sem persistência:**
```bash
# Verificar volume
docker volume inspect whatsapp-api-v3_redis_data

# Se perdeu dados, é porque volume foi deletado
# Recriar stack mantém o volume
```

---

## 🎛️ Configurações Avançadas

### **Ajustar intervalo de polling:**
```yaml
environment:
  - POLLING_INTERVAL=1000  # 1 segundo (mais rápido)
  - HEALTH_CHECK_INTERVAL=60000  # 1 minuto
```

### **Aumentar memória do Redis:**
```yaml
command: >
  redis-server 
  --maxmemory 2gb  # De 1gb para 2gb
```

### **Desabilitar network_mode: host (se der problema):**
```yaml
dispatcher:
  # network_mode: host  # Comentar esta linha
  networks:
    - whatsapp-network  # Descomentar esta seção
  ports:
    - "8080:8080"  # Porta já está exposta
```

---

## 📊 Monitoramento

### **Ver logs em tempo real:**
```bash
# Todos os containers
docker-compose -f /path/to/stack logs -f

# Apenas dispatcher
docker logs -f whatsapp-dispatcher

# Apenas Redis
docker logs -f whatsapp-redis
```

### **Estatísticas de recursos:**
```bash
docker stats whatsapp-dispatcher whatsapp-redis
```

---

## 🔐 Segurança

### **Recomendações:**
1. ✅ Usar **Reverse Proxy** (Nginx/Traefik) com HTTPS
2. ✅ Fechar porta **6379** (Redis) para acesso externo
3. ✅ Fechar porta **8081** (Redis Commander) após configuração
4. ✅ Rotacionar `SUPABASE_KEY` a cada 6 meses
5. ✅ Usar rede privada Docker em produção

### **Firewall (UFW):**
```bash
# Abrir apenas porta 8080 (API)
ufw allow 8080/tcp

# Fechar Redis
ufw deny 6379/tcp

# Fechar Redis Commander
ufw deny 8081/tcp
```

---

## 📈 Escalabilidade

### **Múltiplos servidores:**
Cada VPS roda a mesma stack:
- VPS 1 (192.168.10.61): 20 devices
- VPS 2 (192.168.10.78): 30 devices
- VPS 3 (192.168.10.90): 50 devices

Todos usam o **mesmo Supabase** (banco centralizado).

### **Load Balancer:**
Se precisar de alta disponibilidade, use Nginx/HAProxy na frente:
```nginx
upstream api_backend {
    server 192.168.10.61:8080;
    server 192.168.10.78:8080;
    server 192.168.10.90:8080;
}
```

---

## 📞 Suporte

- **GitHub:** https://github.com/jonemp31/api-adb
- **Docker Hub:** https://hub.docker.com/r/jondevsouza31/api-adb
- **Issues:** Abrir issue no GitHub

---

## 📝 Changelog

### v3.0.0 (2025-12-18)
- ✅ Dockerfile multi-stage otimizado
- ✅ Imagem publicada no Docker Hub
- ✅ Stack pronta para Portainer
- ✅ Sistema híbrido Redis + Supabase + Workers
- ✅ 5 novas rotas de mensagem (sendText, sendMedia, sendCall, sendPix, saveContact)
- ✅ Performance 50-100x melhor (hybrid typeHumanAdvanced)
- ✅ Healthcheck integrado
- ✅ Suporte a variáveis de ambiente
