// =======================================================
// NOTIFICATION SERVICE - Versão Híbrida
// Método do arquivo 2 + Payload rico (sua versão)
// =======================================================

const axios = require('axios');
const moment = require('moment');
const { execShell } = require('./adb.service');

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const POLLING_INTERVAL = parseInt(process.env.NOTIFICATION_INTERVAL) || 3000; // 3s (mais rápido)

// Cache de notificações processadas (última hora apenas)
const seen = new Map(); // { hash: timestamp }

/**
 * Extrai telefone (Regex brasileira)
 */
function extractPhoneNumber(str) {
  if (!str) return null;
  const regex = /(?:\+?55)?\s?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/g;
  const match = str.match(regex);
  if (match) {
    return match[0].replace(/\D/g, '');
  }
  return null;
}

/**
 * Parse direto e eficiente (método arquivo 2)
 */
async function parseNotifications(alias, realId, output) {
  if (!output.toLowerCase().includes('whatsapp')) return;
  
  const notifs = [];
  const blocks = output.split(/NotificationRecord\{/);
  
  for (const block of blocks) {
    if (!block.includes('whatsapp')) continue;
    
    // Extrai pacote
    const pkg = block.match(/pkg=([^\s]+)/)?.[1] || "";
    if (!pkg.includes('whatsapp')) continue;
    
    // Extrai título (quem enviou)
    const title = block.match(/android\.title=String \(([^)]+)\)/)?.[1]?.replace(/"/g, '') || "";
    
    // Extrai texto (mensagem)
    const text = block.match(/android\.text=String \(([^)]+)\)/)?.[1]?.replace(/"/g, '') || "";
    const bigText = block.match(/android\.bigText=String \(([^)]+)\)/)?.[1]?.replace(/"/g, '') || "";
    
    const message = bigText || text;
    
    // Ignora sistema e grupos
    if (!message || 
        message.includes('mensagens de') || 
        message.includes('WhatsApp Web') ||
        title === 'WhatsApp') continue;
    
    // Timestamp
    const timeMatch = block.match(/when=([0-9]+)/);
    const timestampRaw = timeMatch ? parseInt(timeMatch[1]) : Date.now();
    
    notifs.push({ 
      app: pkg, 
      title, 
      message,
      timestampRaw
    });
  }
  
  // Filtra duplicatas (última 50 chars como hash)
  const fresh = notifs.filter(n => {
    const key = `${alias}-${n.title}-${n.message}`.substring(0, 50);
    const now = Date.now();
    
    // Remove entradas antigas (>1 hora)
    if (seen.size > 500) {
      for (const [k, ts] of seen.entries()) {
        if (now - ts > 3600000) seen.delete(k);
      }
    }
    
    if (seen.has(key)) return false;
    
    seen.set(key, now);
    return true;
  });
  
  if (fresh.length > 0) {
    console.log(`🔔 [${alias}] ${fresh.length} nova(s) notificação(ões)`);
    
    // Para cada notificação, envia com seu payload rico
    fresh.forEach(n => {
      // Extrai telefone
      let phone = extractPhoneNumber(n.title);
      if (!phone) phone = extractPhoneNumber(n.message);
      
      // Formata data (seu formato)
      const horario = moment(n.timestampRaw).format('DD/MM/YYYY HH:mm');
      const timestamp = new Date(n.timestampRaw).toISOString();
      
      // Payload híbrido (método arquivo 2 + seus dados)
      const payload = {
        timestamp: timestamp,
        horario: horario,
        dispositivo: alias,
        app: n.app,
        title: n.title,
        text: n.message,
        phone: phone
      };
      
      // Envia (não bloqueia)
      axios.post(N8N_WEBHOOK_URL, payload)
        .then(() => console.log(`   ✅ [${alias}] Webhook enviado: ${n.title}`))
        .catch(e => console.error(`   ⚠️ [${alias}] Erro webhook: ${e.message}`));
    });
  }
}

/**
 * Loop de polling por device (método arquivo 2)
 */
async function pollDevice(alias, realId) {
  try {
    const output = await execShell(realId, 'dumpsys notification --noredact', 15000);
    await parseNotifications(alias, realId, output);
  } catch (e) {
    // Ignora erros temporários (device offline, timeout, etc)
  }
}

/**
 * Inicia engine (polling paralelo)
 */
function startNotificationEngine(aliasCache) {
  console.log('🔔 Notification Engine iniciado (polling 3s)');
  console.log(`📡 Webhook: ${N8N_WEBHOOK_URL}`);
  
  // Polling paralelo para todos devices
  setInterval(() => {
    Object.keys(aliasCache).forEach(alias => {
      const realId = aliasCache[alias];
      if (realId) {
        pollDevice(alias, realId); // Async, não bloqueia
      }
    });
  }, POLLING_INTERVAL);
}

module.exports = {
  startNotificationEngine,
  extractPhoneNumber
};
