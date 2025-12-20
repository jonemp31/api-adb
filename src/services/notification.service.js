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
 * Parse direto e eficiente (Versão Corrigida para NotificationRecord com parênteses)
 */
async function parseNotifications(alias, realId, output) {
  // Verificação básica se tem whatsapp no texto
  if (!output.toLowerCase().includes('whatsapp')) return;
  
  const notifs = [];
  
  // CORREÇÃO 1: Split flexível (aceita '(' ou '{' logo após NotificationRecord)
  // Alguns Androids usam "NotificationRecord{" e outros "NotificationRecord("
  const blocks = output.split(/NotificationRecord[\(\{]/);
  
  console.log(`🔎 [${alias}] Blocos encontrados: ${blocks.length - 1}`);

  for (const block of blocks) {
    if (!block.includes('whatsapp')) continue;
    
    // Extrai pacote
    const pkgMatch = block.match(/pkg=([^\s]+)/);
    const pkg = pkgMatch ? pkgMatch[1] : "";
    
    // Garante que é do WhatsApp (Business ou Normal)
    if (!pkg.includes('whatsapp')) continue;
    
    // CORREÇÃO 2: Regex Universal para Title e Text
    // Captura: android.title=String (Valor)  OU  android.title=Valor
    const extractValue = (str, field) => {
      const regexComplex = new RegExp(`${field}=String \\(([^)]+)\\)`);
      const regexSimple = new RegExp(`${field}=([^,\\n]+)`);
      
      let match = str.match(regexComplex);
      if (match) return match[1].replace(/"/g, ''); // Remove aspas extras se tiver
      
      match = str.match(regexSimple);
      return match ? match[1].trim().replace(/"/g, '') : "";
    };

    const title = extractValue(block, 'android.title');
    const text = extractValue(block, 'android.text');
    const bigText = extractValue(block, 'android.bigText');
    const message = bigText || text;
    
    // Debug para ver o que ele está lendo (Pode remover depois)
    // console.log(`   📝 Lendo: ${title} -> ${message.substring(0, 20)}...`);

    // Ignora notificações de sistema/indesejadas
    if (!message || 
        message.includes('mensagens de') || 
        message.includes('WhatsApp Web') ||
        message.includes('A procurar novas mensagens') ||
        message.includes('Verificar downloads') ||
        title === 'WhatsApp' || 
        title === 'WhatsApp Business' ||
        title === 'WA Business') continue;
    
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
  
  // Filtra duplicatas (Cache)
  const fresh = notifs.filter(n => {
    // Cria uma assinatura única da mensagem
    const key = `${alias}-${n.title}-${n.message}-${n.timestampRaw}`;
    
    // Limpeza automática do cache (se ficar muito grande)
    if (seen.size > 1000) {
      const keysToDelete = [];
      const now = Date.now();
      for (const [k, ts] of seen.entries()) {
        if (now - ts > 3600000) keysToDelete.push(k); // Remove mais velhas que 1h
      }
      keysToDelete.forEach(k => seen.delete(k));
    }
    
    if (seen.has(key)) return false;
    
    seen.set(key, Date.now());
    return true;
  });
  
  if (fresh.length > 0) {
    console.log(`🔔 [${alias}] ${fresh.length} nova(s) mensagem(ns) real(is)!`);
    
    fresh.forEach(n => {
      // Extrai telefone do título ou do texto
      let phone = extractPhoneNumber(n.title);
      if (!phone) phone = extractPhoneNumber(n.message);
      
      const horario = moment(n.timestampRaw).format('DD/MM/YYYY HH:mm');
      const timestamp = new Date(n.timestampRaw).toISOString();
      
      const payload = {
        timestamp: timestamp,
        horario: horario,
        dispositivo: alias,
        app: n.app,
        title: n.title,
        text: n.message,
        phone: phone
      };
      
      axios.post(N8N_WEBHOOK_URL, payload)
        .then(() => console.log(`   ✅ [${alias}] Enviado para N8N: ${n.title}`))
        .catch(e => console.error(`   ⚠️ [${alias}] Falha N8N: ${e.message}`));
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
