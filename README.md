# 🚀 WhatsApp ADB V3.0 - Sistema Híbrido

Sistema completo para automação de WhatsApp via ADB com arquitetura híbrida:
- ✅ Redis (fila FIFO confiável)
- ✅ Supabase (histórico + metadados)
- ✅ 100 Workers assíncronos (1 por device)
- ✅ Coordenadas adaptativas
- ✅ Auto-naming
- ✅ Notification Engine V7.0
- ✅ Digitação humanizada avançada

---

## 📋 PRÉ-REQUISITOS

- Docker + Docker Compose
- Conta Supabase (gratuita)
- Devices Android com ADB WiFi ativado

---

## 🚀 INSTALAÇÃO RÁPIDA

### 1️⃣ Clone/Envie para VPS

```bash
# No seu PC, zipou a pasta v3.0:
# Envie para VPS via SCP ou Portainer

# Na VPS:
cd /opt
mkdir whatsapp-adb-v3
cd whatsapp-adb-v3
# Cole os arquivos aqui
```

### 2️⃣ Configure Supabase

1. Acesse https://supabase.com
2. Crie um projeto (ou use existente)
3. Vá em **SQL Editor** e execute:

```sql
-- Cria tabela devices (se não existir)
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  alias TEXT UNIQUE,
  width INTEGER DEFAULT 720,
  height INTEGER DEFAULT 1600,
  status TEXT DEFAULT 'OFFLINE',
  last_seen TIMESTAMPTZ,
  model TEXT,
  focus_x INTEGER DEFAULT 1345,
  focus_y INTEGER DEFAULT 1006,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_devices_alias ON devices(alias);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
```

4. Copie suas credenciais:
   - **Project Settings** → **API**
   - `SUPABASE_URL` e `SUPABASE_KEY` (anon public)

### 3️⃣ Configure .env

```bash
# Copia exemplo
cp .env.example .env

# Edita com suas credenciais
nano .env
```

Cole suas credenciais do Supabase:
```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4️⃣ Suba o Docker

```bash
docker-compose up -d --build
```

### 5️⃣ Conecte Devices ADB

```bash
# No device Android:
# Configurações → Sobre → Toque 7x em "Número da versão"
# Configurações → Opções do desenvolvedor → Depuração USB WiFi → Ativa

# Na VPS:
docker exec -it whatsapp-dispatcher adb connect 192.168.X.X:5555
docker exec -it whatsapp-dispatcher adb devices
```

### 6️⃣ Teste

```bash
curl http://localhost:8080/health
curl http://localhost:8080/status
```

---

## 📡 USO DA API

### Enviar Mensagem

```bash
curl -X POST http://localhost:8080/task \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "cel01",
    "action": "send_message",
    "payload": {
      "phone": "5516999999999",
      "message": "Olá! Teste automático"
    }
  }'
```

### Ver Status

```bash
curl http://localhost:8080/status
```

### Listar Devices

```bash
curl http://localhost:8080/devices
```

### Ver Tasks Pendentes

```bash
curl http://localhost:8080/device/cel01/pending
```

---

## 🔍 MONITORAMENTO

### Redis Commander

Interface visual do Redis:
```
http://SEU-IP:8081
```

### Logs

```bash
# Logs em tempo real
docker-compose logs -f dispatcher

# Últimas 100 linhas
docker-compose logs --tail=100 dispatcher
```

### Portainer

Se tem Portainer instalado:
```
http://SEU-IP:9000
```

---

## 🛠️ MANUTENÇÃO

### Reiniciar Sistema

```bash
docker-compose restart
```

### Parar Sistema

```bash
docker-compose down
```

### Atualizar Código

```bash
# Edita arquivos em src/
nano src/server.js

# Reinicia
docker-compose restart dispatcher
```

### Ver Devices ADB

```bash
docker exec -it whatsapp-dispatcher adb devices
```

### Conectar Novo Device

```bash
docker exec -it whatsapp-dispatcher adb connect 192.168.X.X:5555
```

---

## 📊 COORDENADAS PERSONALIZADAS

Por padrão usa `1345, 1006`. Para ajustar por device:

```sql
-- No Supabase SQL Editor
UPDATE devices 
SET focus_x = 1200, focus_y = 1800 
WHERE alias = 'cel01';
```

Ou via API (implementar endpoint de update).

---

## 🐛 TROUBLESHOOTING

### Device não aparece

```bash
# Verifica ADB
docker exec -it whatsapp-dispatcher adb devices

# Reconecta
docker exec -it whatsapp-dispatcher adb connect IP:5555
```

### Task travada

```bash
# Via Redis Commander (8081), deleta key:
# processing:cel01
```

### Worker não processa

```bash
# Verifica logs
docker-compose logs -f dispatcher

# Reinicia
docker-compose restart dispatcher
```

### Erro de coordenadas

1. No Android, ative **Opções do Desenvolvedor**
2. Ative **Localização do Ponteiro**
3. Toque no campo de mensagem do WhatsApp
4. Veja coordenadas X,Y no topo da tela
5. Atualize no Supabase

---

## 📈 PERFORMANCE

### Para 100 celulares:

- **CPU**: 50-70% (6 cores)
- **RAM**: 3-4GB (de 8GB total)
- **Redis**: ~500MB
- **Throughput**: ~12 msgs/segundo (burst)

### Otimizações:

```bash
# .env
POLLING_INTERVAL=1000        # Mais rápido (1s)
NOTIFICATION_INTERVAL=3000   # Notificações (3s)
```

---

## 🔐 SEGURANÇA

1. **Não exponha porta 6379** (Redis) publicamente
2. **Use .env para secrets** (nunca commita)
3. **Firewall**: Libere apenas porta 8080
4. **Supabase RLS**: Ative Row Level Security

---

## 🆘 SUPORTE

Problemas comuns resolvidos no [Troubleshooting](#-troubleshooting).

---

**Versão**: 3.0.0  
**Data**: Dezembro 2024
