// =======================================================
// HEALTH CHECK SERVICE - Monitora conectividade ADB
// =======================================================

const adb = require('adbkit');
const supabaseService = require('./supabase.service');

const client = adb.createClient();
const HEALTH_CHECK_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'); // 30s
const RECONNECT_MAX_ATTEMPTS = 3;
const RECONNECT_BACKOFF_MS = 2000; // 2s base para backoff

let isRunning = false;

/**
 * Verifica se device está respondendo
 */
async function checkDeviceHealth(deviceId) {
  try {
    const device = client.getDevice(deviceId);
    
    // Comando simples para verificar conectividade
    await Promise.race([
      device.shell('echo "ping"').then(adb.util.readAll),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);
    
    return { healthy: true, deviceId };
  } catch (error) {
    return { 
      healthy: false, 
      deviceId, 
      error: error.message 
    };
  }
}

/**
 * Tenta reconectar device
 */
async function reconnectDevice(deviceId) {
  const [ip, port] = deviceId.split(':');
  
  for (let attempt = 1; attempt <= RECONNECT_MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`🔄 [Health Check] Reconectando ${deviceId} (tentativa ${attempt}/${RECONNECT_MAX_ATTEMPTS})`);
      
      // Tenta conectar
      await client.connect(ip, port || 5555);
      
      // Aguarda 1s para estabilizar
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verifica se funcionou
      const health = await checkDeviceHealth(deviceId);
      if (health.healthy) {
        console.log(`✅ [Health Check] ${deviceId} reconectado com sucesso!`);
        
        // Atualiza status no Supabase
        await supabaseService.updateDeviceStatus(deviceId, 'ONLINE');
        
        return { success: true, attempts: attempt };
      }
    } catch (error) {
      console.log(`❌ [Health Check] Tentativa ${attempt} falhou: ${error.message}`);
      
      if (attempt < RECONNECT_MAX_ATTEMPTS) {
        // Backoff exponencial: 2s, 4s, 6s
        const waitTime = RECONNECT_BACKOFF_MS * attempt;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // Todas as tentativas falharam
  console.error(`💀 [Health Check] ${deviceId} não pôde ser reconectado após ${RECONNECT_MAX_ATTEMPTS} tentativas`);
  
  // Marca como OFFLINE no Supabase
  await supabaseService.updateDeviceStatus(deviceId, 'OFFLINE');
  
  return { success: false, attempts: RECONNECT_MAX_ATTEMPTS };
}

/**
 * Loop principal do Health Check
 */
async function startHealthCheck() {
  if (isRunning) {
    console.log('⚠️ [Health Check] Já está rodando');
    return;
  }
  
  isRunning = true;
  console.log(`🏥 [Health Check] Iniciado (intervalo: ${HEALTH_CHECK_INTERVAL/1000}s)`);
  
  while (isRunning) {
    try {
      // Pega devices que deveriam estar online
      const devices = await supabaseService.getOnlineDevices();
      
      if (devices.length === 0) {
        // Aguarda intervalo antes de verificar novamente
        await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
        continue;
      }
      
      console.log(`🔍 [Health Check] Verificando saúde de ${devices.length} device(s)...`);
      
      // Verifica todos em paralelo
      const healthChecks = await Promise.all(
        devices.map(device => checkDeviceHealth(device.id))
      );
      
      // Processa resultados
      const unhealthyDevices = healthChecks.filter(check => !check.healthy);
      
      if (unhealthyDevices.length > 0) {
        console.warn(`⚠️ [Health Check] ${unhealthyDevices.length} device(s) não respondendo`);
        
        // Tenta reconectar cada um sequencialmente (para não sobrecarregar)
        for (const check of unhealthyDevices) {
          console.warn(`⚠️ [Health Check] Device ${check.deviceId} não está respondendo`);
          
          const reconnectResult = await reconnectDevice(check.deviceId);
          
          if (!reconnectResult.success) {
            console.error(`🚨 [Health Check] ALERTA: ${check.deviceId} está OFFLINE e não pôde ser reconectado!`);
          }
        }
      }
      
      const healthyCount = healthChecks.filter(c => c.healthy).length;
      console.log(`✅ [Health Check] Completo: ${healthyCount}/${devices.length} device(s) saudável(is)`);
      
    } catch (error) {
      console.error('❌ [Health Check] Erro no loop:', error.message);
    }
    
    // Aguarda intervalo antes da próxima verificação
    await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
  }
  
  console.log('🛑 [Health Check] Parado');
}

/**
 * Para o Health Check
 */
function stopHealthCheck() {
  isRunning = false;
}

/**
 * Verifica se está rodando
 */
function isHealthCheckRunning() {
  return isRunning;
}

module.exports = {
  startHealthCheck,
  stopHealthCheck,
  checkDeviceHealth,
  reconnectDevice,
  isHealthCheckRunning
};
