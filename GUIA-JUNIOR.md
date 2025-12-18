# 📘 GUIA PASSO A PASSO - DEV JUNIOR

Siga exatamente nesta ordem! ✅

---

## 🎯 PASSO 1: PREPARAR SUPABASE (5 minutos)

### 1.1 - Acesse Supabase
```
1. Abra: https://supabase.com
2. Faça login (ou crie conta gratuita)
3. Clique em "New Project"
4. Preencha:
   - Name: whatsapp-adb
   - Database Password: (anote essa senha!)
   - Region: São Paulo (ou mais próximo)
5. Clique "Create Project" (demora ~2min)
```

### 1.2 - Crie a Tabela
```
1. No menu lateral → SQL Editor
2. Clique "+ New Query"
3. Cole este código:
```

```sql
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

CREATE INDEX IF NOT EXISTS idx_devices_alias ON devices(alias);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
```

```
4. Clique "Run" (botão verde)
5. Deve aparecer "Success. No rows returned"
```

### 1.3 - Copie as Credenciais
```
1. No menu lateral → Project Settings (ícone engrenagem)
2. Clique em "API"
3. Copie e cole num bloco de notas:
   
   URL: https://xxxxxxx.supabase.co
   ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
   
   (A chave anon é LONGA, ~200 caracteres)
```

✅ **Supabase pronto!**

---

## 🎯 PASSO 2: PREPARAR ARQUIVOS NO PC (2 minutos)

### 2.1 - Crie o .env
```
1. Abra a pasta: C:\Users\jonat\OneDrive\Área de Trabalho\api-adb\v3.0
2. Copie o arquivo ".env.example"
3. Renomeie a cópia para ".env" (sem o .example)
4. Abra o .env com Notepad
5. Cole suas credenciais do Supabase:
```

```env
SUPABASE_URL=https://xxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

```
6. Salve (Ctrl+S)
```

### 2.2 - Zipa a Pasta
```
1. Clique direito na pasta "v3.0"
2. "Enviar para" → "Pasta compactada"
3. Cria "v3.0.zip"
```

✅ **Arquivos prontos!**

---

## 🎯 PASSO 3: ENVIAR PARA VPS (5 minutos)

### OPÇÃO A - Via Portainer (MAIS FÁCIL)

```
1. Acesse seu Portainer: http://192.168.10.61:9000
2. Login
3. Clique no seu ambiente (local)
4. Menu lateral → "Stacks"
5. Clique "+ Add Stack"
6. Name: whatsapp-adb-v3
7. Escolha "Upload" (aba)
8. Arraste o v3.0.zip OU clique "Select file"
9. Clique "Deploy the stack"
```

**OU**

### OPÇÃO B - Via SSH + SCP (TRADICIONAL)

```powershell
# No PowerShell do Windows:
scp -r C:\Users\jonat\OneDrive\Área` de` Trabalho\api-adb\v3.0 root@192.168.10.61:/opt/whatsapp-adb-v3
```

✅ **Arquivos na VPS!**

---

## 🎯 PASSO 4: SUBIR DOCKER NA VPS (3 minutos)

### 4.1 - Acesse via SSH
```powershell
ssh root@192.168.10.61
```

### 4.2 - Entre na pasta
```bash
cd /opt/whatsapp-adb-v3
ls
# Deve ver: docker-compose.yml, Dockerfile, src/, etc
```

### 4.3 - Suba o Docker
```bash
docker-compose up -d --build
```

Vai aparecer:
```
Creating network "whatsapp-adb-v3_whatsapp-network" ... done
Creating whatsapp-redis ... done
Creating whatsapp-redis-commander ... done
Creating whatsapp-dispatcher ... done
```

### 4.4 - Aguarde 30 segundos
```bash
sleep 30
```

### 4.5 - Veja os logs
```bash
docker-compose logs dispatcher
```

Deve ver:
```
✅ Redis conectado
📱 Sincronizando devices...
🚀 API rodando na porta 8080
```

✅ **Sistema rodando!**

---

## 🎯 PASSO 5: CONECTAR CELULARES (10 minutos)

### 5.1 - No Celular Android

```
1. Configurações
2. Sobre o telefone
3. Toque 7 vezes em "Número da versão"
   (Aparece: "Você agora é desenvolvedor!")
4. Voltar
5. Sistema → Opções do desenvolvedor
6. Ative "Depuração USB via WiFi"
7. Anote o IP que aparece (ex: 192.168.10.221:5555)
```

### 5.2 - Na VPS, Conecte
```bash
# Substitua pelo IP do seu celular:
docker exec -it whatsapp-dispatcher adb connect 192.168.10.221:5555

# Deve retornar:
# connected to 192.168.10.221:5555
```

### 5.3 - No Celular
```
Aparece popup: "Permitir depuração USB?"
→ Clique "Permitir"
```

### 5.4 - Verifica
```bash
docker exec -it whatsapp-dispatcher adb devices

# Deve mostrar:
# 192.168.10.221:5555    device
```

### 5.5 - Aguarde 60s
```bash
sleep 60
# Sistema vai descobrir automaticamente e nomear como cel01!
```

✅ **Celular conectado!**

---

## 🎯 PASSO 6: TESTAR (2 minutos)

### 6.1 - Health Check
```bash
curl http://localhost:8080/health
```

Retorna:
```json
{"status":"ok","version":"3.0.0","timestamp":"..."}
```

### 6.2 - Ver Status
```bash
curl http://localhost:8080/status
```

Retorna:
```json
{
  "status": "ok",
  "stats": {
    "totalProcessed": 0,
    "totalSuccess": 0,
    "totalFailed": 0
  },
  "devices": {
    "cel01": {
      "pending": 0,
      "worker": "idle",
      "device": {
        "id": "192.168.10.221:5555",
        "model": "Unknown",
        "resolution": "720x1600"
      }
    }
  }
}
```

### 6.3 - Enviar Mensagem de Teste
```bash
curl -X POST http://localhost:8080/task \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "cel01",
    "action": "send_message",
    "payload": {
      "phone": "5516974069851",
      "message": "Teste automatico! Funcionou!"
    }
  }'
```

**OLHE O CELULAR:** WhatsApp deve abrir e digitar! 🎉

✅ **SISTEMA FUNCIONANDO!**

---

## 🎯 INTERFACES VISUAIS

### Redis Commander (Ver Filas)
```
http://192.168.10.61:8081
```

### Portainer (Gerenciar Docker)
```
http://192.168.10.61:9000
```

### Supabase (Ver Devices)
```
https://supabase.com → Seu projeto → Table Editor → devices
```

---

## 🎯 CONECTAR MAIS CELULARES

Para cada celular novo:

```bash
# 1. Ativa depuração WiFi no celular
# 2. Conecta:
docker exec -it whatsapp-dispatcher adb connect 192.168.X.X:5555

# 3. Verifica:
docker exec -it whatsapp-dispatcher adb devices

# 4. Aguarda 60s (auto-naming automático!)
```

Vai aparecer como `cel02`, `cel03`, etc automaticamente! ✨

---

## 🆘 SE DER ERRO

### Erro: "Cannot connect to Redis"
```bash
docker-compose restart redis
docker-compose restart dispatcher
```

### Erro: "Device not found"
```bash
docker exec -it whatsapp-dispatcher adb devices
# Se não aparece, reconecta:
docker exec -it whatsapp-dispatcher adb connect IP:5555
```

### Erro: "Supabase error"
```bash
# Verifica .env:
cat .env
# Confere se SUPABASE_URL e SUPABASE_KEY estão corretos
```

### Worker não processa
```bash
# Vê logs:
docker-compose logs -f dispatcher

# Reinicia:
docker-compose restart dispatcher
```

---

## ✅ CHECKLIST FINAL

- [ ] Supabase criado e tabela devices OK
- [ ] .env configurado com credenciais
- [ ] Docker rodando (docker ps mostra 3 containers)
- [ ] Celular conectado (adb devices mostra device)
- [ ] curl /health retorna ok
- [ ] curl /status mostra cel01
- [ ] Teste de mensagem funcionou

**TUDO OK?** 🎉 Você tem um sistema de automação WhatsApp profissional rodando!

---

## 📚 PRÓXIMOS PASSOS

1. **Conectar 100 celulares** (repete Passo 6)
2. **Integrar com n8n** (webhook já configurado)
3. **Monitorar Redis Commander** (ver filas em tempo real)
4. **Ajustar coordenadas** (se necessário por device)

---

**Dúvidas?** Releia o passo com problema. 99% dos erros são:
- Credenciais erradas no .env
- Celular não permitiu depuração
- IP errado do celular

**BOA SORTE! 🚀**
