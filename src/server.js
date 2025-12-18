// =======================================================
// SERVER.JS - PROJETO V3.0
// Híbrido: Supabase + Redis + Workers Assíncronos
// =======================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Services
const queueService = require('./services/queue.service');
const supabaseService = require('./services/supabase.service');
const adbService = require('./services/adb.service');
const notificationService = require('./services/notification.service');
const workerPoolService = require('./services/worker-pool.service');
const healthCheckService = require('./services/health-check.service');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

// =======================================================
// CACHES (SEU CÓDIGO)
// =======================================================
let aliasCache = {};        // { 'cel01': '192.168.1.10:5555' }
let resolutionCache = {};   // { '192.168.1.10:5555': {w:720, h:1600} }

// =======================================================
// SYNC DE DEVICES (SEU CÓDIGO + SUPABASE)
// =======================================================
async function syncDevicesMetadata() {
  try {
    const connected = await adbService.listDevices();
    
    if (connected.length === 0) {
      console.log('⚠️ Nenhum device ADB conectado');
      return;
    }
    
    const dbDevices = await supabaseService.getAllDevices();
    
    // Auto-naming (SEU CÓDIGO)
    let maxNumber = 0;
    dbDevices.forEach(d => {
      if (d.alias?.startsWith('cel')) {
        const num = parseInt(d.alias.replace('cel', ''));
        if (num > maxNumber) maxNumber = num;
      }
    });
    
    const updates = [];
    const tempAliasCache = {};
    const tempResCache = {};
    
    for (const device of connected) {
      const id = device.id;
      const existing = dbDevices.find(d => d.id === id);
      
      // Auto-naming
      let myAlias = existing ? existing.alias : null;
      if (!myAlias) {
        maxNumber++;
        myAlias = `cel${String(maxNumber).padStart(2, '0')}`;
        console.log(`🆕 Novo device: ${myAlias} (${id})`);
      }
      
      // Busca resolução
      let w = existing ? existing.width : 0;
      let h = existing ? existing.height : 0;
      
      if (!w || !h) {
        const res = await adbService.getResolution(id);
        w = res.w;
        h = res.h;
      }
      
      tempAliasCache[myAlias] = id;
      tempResCache[id] = { w, h };
      
      updates.push({
        id: id,
        alias: myAlias,
        width: w,
        height: h,
        status: 'ONLINE',
        last_seen: new Date().toISOString(),
        model: device.type || 'Unknown'
      });
    }
    
    if (updates.length > 0) {
      await supabaseService.upsertDevices(updates);
      console.log(`✅ ${updates.length} devices sincronizados`);
    }
    
    aliasCache = tempAliasCache;
    resolutionCache = tempResCache;
    adbService.resolutionCache = tempResCache;
    
  } catch (e) {
    console.error("❌ Erro no sync:", e.message);
  }
}

// =======================================================
// ROTAS DA API
// =======================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    timestamp: new Date().toISOString()
  });
});

// Status geral
app.get('/status', async (req, res) => {
  try {
    const devices = await supabaseService.getOnlineDevices();
    const queues = {};
    const workers = workerPoolService.getWorkerStatus();
    
    for (const device of devices) {
      queues[device.alias] = {
        pending: await queueService.getQueueLength(device.alias),
        worker: workers[device.alias] || 'stopped',
        device: {
          id: device.id,
          model: device.model,
          resolution: `${device.width}x${device.height}`
        }
      };
    }
    
    res.json({
      status: 'ok',
      stats: workerPoolService.getStats(),
      devices: queues,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lista devices
app.get('/devices', async (req, res) => {
  try {
    const devices = await supabaseService.getAllDevices();
    res.json({ devices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Status do Health Check
app.get('/health-check', async (req, res) => {
  try {
    const devices = await supabaseService.getOnlineDevices();
    const checks = await Promise.all(
      devices.map(device => healthCheckService.checkDeviceHealth(device.id))
    );
    
    const healthy = checks.filter(c => c.healthy).length;
    
    res.json({
      running: healthCheckService.isHealthCheckRunning(),
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      devices: {
        total: devices.length,
        healthy: healthy,
        unhealthy: devices.length - healthy
      },
      checks: checks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adiciona task na fila
app.post('/task', async (req, res) => {
  try {
    const { deviceId, action, payload } = req.body;
    
    if (!deviceId || !action || !payload) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: deviceId, action, payload' 
      });
    }
    
    // Adiciona na fila Redis
    const task = await queueService.addTask(deviceId, { action, payload });
    
    console.log(`📥 Task ${task.id.substr(0, 8)}... adicionada para ${deviceId}`);
    
    res.status(201).json({
      success: true,
      task: {
        id: task.id,
        deviceId: task.deviceId,
        action: task.action,
        status: task.status,
        createdAt: task.createdAt
      },
      queuePosition: await queueService.getQueueLength(deviceId)
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Busca task por ID
app.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await queueService.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task não encontrada' });
    }
    
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lista tasks pendentes de um device
app.get('/device/:deviceId/pending', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const tasks = await queueService.getPendingTasks(deviceId);
    
    res.json({
      success: true,
      deviceId,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota legado (compatibilidade com seu código antigo)
app.post('/device/:target/send-flow', async (req, res) => {
  try {
    const { target } = req.params;
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ error: 'phone e message obrigatórios' });
    }
    
    // Adiciona na fila
    const task = await queueService.addTask(target, {
      action: 'send_message',
      payload: { phone, message }
    });
    
    res.json({
      success: true,
      task: { id: task.id, status: task.status }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================================================
// NOVAS ROTAS DE MENSAGEM (PADRÃO V3.0)
// =======================================================

// 1. Enviar Texto
app.post('/message/sendText/:device', async (req, res) => {
  try {
    const { device } = req.params;
    const { number, text } = req.body;
    
    if (!number || !text) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: number, text' 
      });
    }
    
    // Adiciona na fila
    const task = await queueService.addTask(device, {
      action: 'send_text',
      payload: { number, text }
    });
    
    res.status(201).json({
      success: true,
      message: 'Texto adicionado na fila',
      task: {
        id: task.id,
        device,
        status: task.status,
        queuePosition: await queueService.getQueueLength(device)
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Enviar Mídia
app.post('/message/sendMedia/:device', async (req, res) => {
  try {
    const { device } = req.params;
    const { number, caption, media, viewonce } = req.body;
    
    if (!number || !media) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: number, media' 
      });
    }
    
    // Adiciona na fila
    const task = await queueService.addTask(device, {
      action: 'send_media',
      payload: { 
        number, 
        caption: caption || '', 
        media,
        viewonce: viewonce === 'true' || viewonce === true
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Mídia adicionada na fila',
      task: {
        id: task.id,
        device,
        status: task.status,
        queuePosition: await queueService.getQueueLength(device)
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Enviar Ligação
app.post('/message/sendCall/:device', async (req, res) => {
  try {
    const { device } = req.params;
    const { number, chamada, callDuration } = req.body;
    
    if (!number || !chamada) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: number, chamada (video/voz)' 
      });
    }
    
    if (!['video', 'voz'].includes(chamada)) {
      return res.status(400).json({ 
        error: 'chamada deve ser "video" ou "voz"' 
      });
    }
    
    // Adiciona na fila
    const task = await queueService.addTask(device, {
      action: 'send_call',
      payload: { 
        number, 
        chamada,
        callDuration: parseInt(callDuration) || 5
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Ligação adicionada na fila',
      task: {
        id: task.id,
        device,
        status: task.status,
        queuePosition: await queueService.getQueueLength(device)
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Enviar PIX
app.post('/message/sendPix/:device', async (req, res) => {
  try {
    const { device } = req.params;
    const { number } = req.body;
    
    if (!number) {
      return res.status(400).json({ 
        error: 'Campo obrigatório: number' 
      });
    }
    
    // Adiciona na fila
    const task = await queueService.addTask(device, {
      action: 'send_pix',
      payload: { number }
    });
    
    res.status(201).json({
      success: true,
      message: 'PIX adicionado na fila',
      task: {
        id: task.id,
        device,
        status: task.status,
        queuePosition: await queueService.getQueueLength(device)
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Salvar Contato
app.post('/message/saveContact/:device', async (req, res) => {
  try {
    const { device } = req.params;
    const { namelead, tag, numberlead } = req.body;
    
    if (!namelead || !numberlead) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: namelead, numberlead' 
      });
    }
    
    // Adiciona na fila
    const task = await queueService.addTask(device, {
      action: 'save_contact',
      payload: { 
        namelead, 
        tag: tag || '',
        numberlead 
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Salvamento de contato adicionado na fila',
      task: {
        id: task.id,
        device,
        status: task.status,
        queuePosition: await queueService.getQueueLength(device)
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================================================
// NOVOS ENDPOINTS PARA DASHBOARD
// =======================================================

// Estatísticas de um device específico
app.get('/device/:alias/stats', async (req, res) => {
  try {
    const { alias } = req.params;
    const deviceId = aliasCache[alias];
    
    if (!deviceId) {
      return res.status(404).json({ error: 'Device não encontrado' });
    }
    
    const stats = workerPoolService.getStats();
    const queueLength = await queueService.getQueueLength(deviceId);
    
    res.json({
      success: true,
      stats: {
        ...stats,
        queueLength
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reconectar device via ADB
app.post('/device/:deviceId/reconnect', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const [ip, port] = deviceId.split(':');
    
    // Tenta conectar via adb
    await adbService.connect(ip, port || '5555');
    
    // Aguarda 2s e sincroniza
    await new Promise(resolve => setTimeout(resolve, 2000));
    await syncDevicesMetadata();
    
    res.json({ success: true, message: 'Reconnect iniciado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Desconectar device
app.post('/device/:deviceId/disconnect', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // Marca como OFFLINE no Supabase
    await supabaseService.updateDeviceStatus(deviceId, 'OFFLINE');
    
    res.json({ success: true, message: 'Device marcado como OFFLINE' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pausar/Retomar worker
app.post('/device/:deviceId/worker', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { enabled } = req.body;
    
    // Atualiza no Supabase (cria campo worker_enabled)
    await supabaseService.updateDeviceField(deviceId, 'worker_enabled', enabled);
    
    res.json({ success: true, workerEnabled: enabled });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Testar comando ADB
app.post('/device/:deviceId/test', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'command obrigatório' });
    }
    
    const output = await adbService.execShell(deviceId, command);
    
    res.json({
      success: true,
      output: output.toString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      output: error.message
    });
  }
});

// Atualizar coordenadas
app.put('/device/:deviceId/coordinates', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { focus_x, focus_y } = req.body;
    
    await supabaseService.updateDeviceCoordinates(deviceId, focus_x, focus_y);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tamanho da fila (já existe mas vou melhorar)
app.get('/queue/:deviceAlias', async (req, res) => {
  try {
    const { deviceAlias } = req.params;
    const deviceId = aliasCache[deviceAlias];
    
    if (!deviceId) {
      return res.status(404).json({ error: 'Device não encontrado' });
    }
    
    const pending = await queueService.getQueueLength(deviceAlias);
    const processingKey = await queueService.getTask(deviceAlias);
    const counters = await queueService.getCounters(deviceAlias);
    
    res.json({
      success: true,
      pending,
      processing: processingKey ? true : false,
      today: counters.today,
      total: counters.total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lista tasks pendentes
app.get('/queue/:deviceAlias/tasks', async (req, res) => {
  try {
    const { deviceAlias } = req.params;
    const deviceId = aliasCache[deviceAlias];
    
    if (!deviceId) {
      return res.status(404).json({ error: 'Device não encontrado' });
    }
    
    const tasks = await queueService.getPendingTasks(deviceId);
    
    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Histórico de tasks
app.get('/queue/:deviceAlias/history', async (req, res) => {
  try {
    const { deviceAlias } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    // TODO: Implementar histórico no Redis ou Supabase
    
    res.json({
      success: true,
      tasks: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Limpar fila
app.delete('/queue/:deviceAlias', async (req, res) => {
  try {
    const { deviceAlias } = req.params;
    const deviceId = aliasCache[deviceAlias];
    
    if (!deviceId) {
      return res.status(404).json({ error: 'Device não encontrado' });
    }
    
    const result = await queueService.clearQueue(deviceAlias);
    
    res.json({
      success: true,
      message: `${result.cleared} tasks removidas da fila`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================================================
// INICIALIZAÇÃO
// =======================================================
async function start() {
  try {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║     WHATSAPP ADB V3.0 - HÍBRIDO        ║');
    console.log('╠════════════════════════════════════════╣');
    console.log('║  Redis + Supabase + Async Workers      ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    
    // 1. Conecta Redis
    console.log('📦 Conectando Redis...');
    await queueService.connect();
    
    // 2. Sync devices
    console.log('📱 Sincronizando devices...');
    await syncDevicesMetadata();
    
    // 3. Inicia workers assíncronos (100 simultâneos!)
    const onlineDevices = await supabaseService.getOnlineDevices();
    if (onlineDevices.length > 0) {
      await workerPoolService.startWorkerPool(onlineDevices);
    } else {
      console.log('⚠️ Nenhum device online, workers não iniciados');
    }
    
    // 4. Inicia notification engine (SEU CÓDIGO V7.0)
    if (process.env.N8N_WEBHOOK_URL) {
      notificationService.startNotificationEngine(aliasCache);
    }
    
    // 5. Inicia Health Check (monitora conectividade ADB)
    healthCheckService.startHealthCheck().catch(err => {
      console.error('❌ Health Check falhou:', err.message);
    });
    
    // 6. Sync periódico
    setInterval(async () => {
      await syncDevicesMetadata();
    }, 60000);
    
    // 7. Inicia API
    app.listen(PORT, () => {
      console.log('');
      console.log(`🚀 API rodando na porta ${PORT}`);
      console.log(`📋 Endpoints:`);
      console.log(`   GET  /health`);
      console.log(`   GET  /status`);
      console.log(`   GET  /devices`);
      console.log(`   GET  /health-check`);
      console.log(`   POST /task`);
      console.log(`   POST /device/:target/send-flow`);
      console.log('');
      console.log(`✅ Sistema iniciado com sucesso!`);
      console.log(`🏥 Health Check: Ativo (${process.env.HEALTH_CHECK_INTERVAL || 30000}ms)`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar:', error);
    process.exit(1);
  }
}

start();
