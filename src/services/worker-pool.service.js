// =======================================================
// WORKER POOL - 100 Async Workers (1 por device)
// =======================================================

const queueService = require('./queue.service');
const adbService = require('./adb.service');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Status de cada worker
const workerStatus = new Map();

// Contador de tasks processadas
const stats = {
  totalProcessed: 0,
  totalSuccess: 0,
  totalFailed: 0
};

/**
 * Worker assíncrono dedicado a 1 device
 */
async function deviceWorker(alias, deviceId, coords = {}) {
  console.log(`🟢 Worker ${alias} iniciado`);
  workerStatus.set(alias, 'idle');
  
  const RETRY_MAX = 3;
  const POLL_INTERVAL = parseInt(process.env.POLLING_INTERVAL) || 1500;
  
  while (true) {
    try {
      // 1. Marca como idle
      workerStatus.set(alias, 'idle');
      
      // 2. Puxa próxima task (Redis FIFO)
      const result = await queueService.getNextTask(alias);
      
      if (!result.task) {
        await sleep(POLL_INTERVAL);
        continue;
      }
      
      const task = result.task;
      
      // 3. Marca como busy
      workerStatus.set(alias, 'busy');
      console.log(`📥 [${alias}] Task ${task.id.substr(0, 8)}... - ${task.action}`);
      
      // 4. Executa com retry
      let success = false;
      let taskResult = null;
      let lastError = null;
      
      for (let attempt = 1; attempt <= RETRY_MAX; attempt++) {
        try {
          console.log(`🔄 [${alias}] Tentativa ${attempt}/${RETRY_MAX}`);
          
          taskResult = await executeTask(deviceId, task, coords);
          success = true;
          break;
          
        } catch (err) {
          lastError = err;
          console.error(`⚠️ [${alias}] Erro: ${err.message}`);
          
          if (attempt < RETRY_MAX) {
            await sleep(2000);
          }
        }
      }
      
      // 5. Reporta resultado
      if (success) {
        await queueService.completeTask(task.id, taskResult);
        await queueService.incrementCounters(alias); // Incrementa contadores
        console.log(`✅ [${alias}] Task completa`);
        stats.totalSuccess++;
      } else {
        await queueService.failTask(task.id, { 
          message: lastError?.message || 'Erro desconhecido',
          attempts: RETRY_MAX
        }, false);
        console.log(`❌ [${alias}] Task falhou`);
        stats.totalFailed++;
      }
      
      stats.totalProcessed++;
      
    } catch (error) {
      console.error(`❌ [${alias}] Erro crítico: ${error.message}`);
      await sleep(5000);
    }
  }
}

/**
 * Executa task com base na action
 */
async function executeTask(deviceId, task, coords) {
  const { action, payload } = task;
  
  switch (action) {
    // Enviar texto (legado + novo)
    case 'send_message':
    case 'send_text':
      return await adbService.sendMessage(
        deviceId,
        payload.phone || payload.number,
        payload.message || payload.text,
        coords
      );
    
    // Enviar mídia (imagem/video/audio/documento)
    case 'send_media':
      return await adbService.sendMedia(
        deviceId,
        payload.number,
        payload.media,
        payload.caption,
        payload.viewonce,
        coords
      );
    
    // Enviar ligação (voz ou vídeo)
    case 'send_call':
      return await adbService.sendCall(
        deviceId,
        payload.number,
        payload.chamada,
        payload.callDuration,
        coords
      );
    
    // Enviar PIX
    case 'send_pix':
      return await adbService.sendPix(
        deviceId,
        payload.number,
        coords
      );
    
    // Salvar contato
    case 'save_contact':
      return await adbService.saveContact(
        deviceId,
        payload.namelead,
        payload.numberlead,
        payload.tag,
        coords
      );
    
    // Actions antigas (manter compatibilidade)
    case 'send_image':
      throw new Error('send_image descontinuado - use send_media');
    
    case 'check_online':
      throw new Error('check_online ainda não implementado');
    
    default:
      throw new Error(`Action desconhecida: ${action}`);
  }
}

/**
 * Inicia pool de workers (1 por device)
 */
async function startWorkerPool(devices) {
  console.log(`🚀 Iniciando ${devices.length} async workers...`);
  
  // Inicia 1 worker por device (NÃO usa await!)
  devices.forEach(device => {
    const coords = {
      x: device.focus_x || 1345,
      y: device.focus_y || 1006
    };
    
    // Roda em paralelo!
    deviceWorker(device.alias, device.id, coords);
  });
  
  console.log(`✅ ${devices.length} workers rodando em paralelo!`);
}

/**
 * Retorna status de todos workers
 */
function getWorkerStatus() {
  const status = {};
  workerStatus.forEach((state, alias) => {
    status[alias] = state;
  });
  return status;
}

/**
 * Retorna estatísticas
 */
function getStats() {
  return { ...stats };
}

module.exports = {
  startWorkerPool,
  getWorkerStatus,
  getStats
};
