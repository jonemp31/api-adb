// =======================================================
// ADB SERVICE - Execução de comandos ADB
// =======================================================

const adb = require('adbkit');
const client = adb.createClient();

// Cache de resoluções
const resolutionCache = {};

// Referência base
const BASE_REF_W = parseInt(process.env.BASE_WIDTH) || 720;
const BASE_REF_H = parseInt(process.env.BASE_HEIGHT) || 1600;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Executa comando shell com timeout
 */
async function execShell(deviceId, cmd, timeout = 60000) {
  return new Promise(async (resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        reject(new Error('Timeout'));
      }
    }, timeout);

    try {
      const stream = await client.shell(deviceId, cmd);
      const output = await adb.util.readAll(stream);
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(output.toString().trim());
      }
    } catch (e) {
      if (!done) {
        done = true;
        clearTimeout(timer);
        reject(e);
      }
    }
  });
}

/**
 * Lista devices conectados
 */
async function listDevices() {
  return await client.listDevices();
}

/**
 * Calcula coordenadas adaptativas (SEU CÓDIGO)
 */
function calcCoords(deviceId, inputX, inputY) {
  const res = resolutionCache[deviceId];
  if (!res || !res.w) {
    return { x: inputX, y: inputY };
  }
  
  return {
    x: Math.round(inputX * (res.w / BASE_REF_W)),
    y: Math.round(inputY * (res.h / BASE_REF_H))
  };
}

/**
 * Busca resolução do device
 */
async function getResolution(deviceId) {
  if (resolutionCache[deviceId]) {
    return resolutionCache[deviceId];
  }

  try {
    const output = await execShell(deviceId, 'wm size');
    if (output.includes(':')) {
      const parts = output.split(': ')[1].split('x');
      const w = parseInt(parts[0]);
      const h = parseInt(parts[1]);
      resolutionCache[deviceId] = { w, h };
      return { w, h };
    }
  } catch (e) {
    console.error(`Erro ao buscar resolução de ${deviceId}:`, e.message);
  }

  return { w: BASE_REF_W, h: BASE_REF_H };
}

/**
 * Gera comando humanizado (SEU CÓDIGO)
 */
function gerarComandoHumanizado(texto) {
  const limpo = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "");
  
  let cmds = [];
  for (let char of limpo) {
    if (char === ' ') {
      cmds.push('input keyevent 62');
    } else if (['&', '<', '>', '|', ';', '(', ')', '$', '`', '\\', '"', "'"].includes(char)) {
      cmds.push(`input text "\\${char}"`);
    } else {
      cmds.push(`input text "${char}"`);
    }
    // Delay humanizado
    const delay = Math.random() * 0.17 + 0.08; // 80-250ms
    cmds.push(`sleep ${delay.toFixed(2)}`);
  }
  return cmds.join(' && ');
}

/**
 * Digitação humanizada avançada HÍBRIDA (Performance + Humanização)
 * Gera TODOS os comandos de uma vez e envia via pipe (método do script bash)
 * Mantém humanização: velocidade por horário, erros propositais, pausas maiores
 */
async function typeHumanAdvanced(deviceId, text) {
  const clean = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Perfil de velocidade por horário (em SEGUNDOS para o sleep do Android)
  const hora = new Date().getHours();
  let delayMin, delayMax;
  
  if (hora >= 6 && hora <= 9) {
    // Manhã: médio
    delayMin = 0.08; delayMax = 0.25;
  } else if (hora >= 10 && hora <= 14) {
    // Almoço: rápido
    delayMin = 0.06; delayMax = 0.18;
  } else if (hora >= 15 && hora <= 17) {
    // Tarde: lento
    delayMin = 0.12; delayMax = 0.35;
  } else if (hora >= 18 && hora <= 22) {
    // Jantar: rápido
    delayMin = 0.06; delayMax = 0.18;
  } else {
    // Madrugada: muito lento
    delayMin = 0.18; delayMax = 0.45;
  }
  
  // Array de comandos concatenados
  const comandos = [];
  
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    
    // Espaço - usa keyevent 62 (mais confiável que text)
    if (c === ' ') {
      comandos.push('input keyevent 62');
      // Pausa maior entre palavras (250-600ms)
      const pausaPalavra = (Math.random() * 0.35 + 0.25).toFixed(3);
      comandos.push(`sleep ${pausaPalavra}`);
      continue;
    }
    
    // Erro humano (6% chance)
    if (Math.random() * 100 < 6) {
      comandos.push('input text x');
      comandos.push('sleep 0.1');
      comandos.push('input keyevent 67'); // backspace
      comandos.push('sleep 0.15');
    }
    
    // Caracteres especiais que precisam escape
    if (['(', ')', '<', '>', '|', ';', '&', '*', "'", '"', '?'].includes(c)) {
      comandos.push(`input text \\${c}`);
    } else {
      // Escape para shell (apenas os críticos)
      const escaped = c.replace(/([\\$`])/g, "\\$1");
      comandos.push(`input text ${escaped}`);
    }
    
    // Delay humanizado aleatório
    const delay = (Math.random() * (delayMax - delayMin) + delayMin).toFixed(3);
    comandos.push(`sleep ${delay}`);
  }
  
  // Concatena TODOS os comandos com ";" e envia DE UMA VEZ
  const comandoGigante = comandos.join(';');
  await execShell(deviceId, comandoGigante);
}

/**
 * Envia mensagem (FLUXO COMPLETO)
 */
async function sendMessage(deviceId, phone, message, coords = {}) {
  // Busca resolução se não tem
  if (!resolutionCache[deviceId]) {
    await getResolution(deviceId);
  }
  
  // Coordenadas adaptativas
  const tapCoords = calcCoords(deviceId, coords.x || 1345, coords.y || 1006);
  
  // 1. Abre WhatsApp
  await execShell(
    deviceId,
    `am start -a android.intent.action.VIEW -d "https://api.whatsapp.com/send?phone=${phone}" com.whatsapp.w4b`
  );
  await sleep(3000);
  
  // 2. Tap duplo no campo
  await execShell(deviceId, `input tap ${tapCoords.x} ${tapCoords.y}`);
  await sleep(300);
  await execShell(deviceId, `input tap ${tapCoords.x} ${tapCoords.y}`);
  await sleep(1000);
  
  // 3. Digita humanizado
  await typeHumanAdvanced(deviceId, message);
  await sleep(600);
  
  // 4. Envia
  await execShell(deviceId, 'input keyevent 66');
  await sleep(1000);
  
  // 5. Volta e reset completo (4 comandos como no script bash)
  await execShell(deviceId, 'input keyevent 4');
  await sleep(500);
  await execShell(deviceId, 'input keyevent 4');
  await sleep(1000);
  
  // Taps de reset (garantem volta total ao estado inicial)
  const coordReset1 = calcCoords(deviceId, 655, 1299);
  const coordReset2 = calcCoords(deviceId, 332, 730);
  await execShell(deviceId, `input tap ${coordReset1.x} ${coordReset1.y}`);
  await sleep(1000);
  await execShell(deviceId, `input tap ${coordReset2.x} ${coordReset2.y}`);
  
  return {
    sent: true,
    phone,
    timestamp: new Date().toISOString()
  };
}

/**
 * Conecta device via ADB WiFi
 */
async function connect(ip, port = '5555') {
  try {
    await client.connect(ip, port);
    return { success: true };
  } catch (error) {
    throw new Error(`Erro ao conectar ${ip}:${port} - ${error.message}`);
  }
}

/**
 * Envia mídia (imagem/vídeo/áudio/documento) via WhatsApp
 * @param {string} deviceId - ID do device
 * @param {string} number - Número do destinatário
 * @param {string} media - Coordenadas x,y ou caminho/arquivo
 * @param {string} caption - Legenda da mídia
 * @param {boolean} viewonce - Visualização única
 * @param {object} coords - Coordenadas customizadas
 */
async function sendMedia(deviceId, number, media, caption = '', viewonce = false, coords = {}) {
  console.log(`📷 [${deviceId}] Enviando mídia para ${number} (viewonce: ${viewonce})`);
  
  // Busca resolução se não tem
  if (!resolutionCache[deviceId]) {
    await getResolution(deviceId);
  }
  
  // Coordenadas base (referência 720x1600)
  const coordClipe = calcCoords(deviceId, coords.clipe_x || 492, coords.clipe_y || 1461);
  const coordGaleria = calcCoords(deviceId, coords.galeria_x || 434, coords.galeria_y || 957);
  const coordAbaPastas = calcCoords(deviceId, coords.aba_pastas_x || 441, coords.aba_pastas_y || 796);
  const coordPasta = calcCoords(deviceId, coords.pasta_x || 335, coords.pasta_y || 1209);
  const coordBtnOnce = calcCoords(deviceId, coords.btn_once_x || 563, coords.btn_once_y || 1463);
  const coordEnviar = calcCoords(deviceId, coords.enviar_x || 670, coords.enviar_y || 1459);
  
  // 1. Abre WhatsApp na conversa
  console.log(`📱 [${deviceId}] Abrindo conversa...`);
  await execShell(
    deviceId,
    `am start -a android.intent.action.VIEW -d "https://api.whatsapp.com/send?phone=${number}" com.whatsapp.w4b`
  );
  await sleep(5000); // Delay maior para carregar conversa + histórico
  
  // 2. Clicar no Clipe (Anexo)
  console.log(`📎 [${deviceId}] Abrindo menu de anexos...`);
  await execShell(deviceId, `input tap ${coordClipe.x} ${coordClipe.y}`);
  await sleep(2500);
  
  // 3. Clicar na Galeria
  console.log(`🖼️ [${deviceId}] Abrindo Galeria...`);
  await execShell(deviceId, `input tap ${coordGaleria.x} ${coordGaleria.y}`);
  await sleep(3000);
  
  // 4. Navegar até a pasta (2 cliques)
  console.log(`📂 [${deviceId}] Selecionando aba de pastas...`);
  await execShell(deviceId, `input tap ${coordAbaPastas.x} ${coordAbaPastas.y}`);
  await sleep(2200);
  
  console.log(`📂 [${deviceId}] Entrando na pasta Downloads...`);
  await execShell(deviceId, `input tap ${coordPasta.x} ${coordPasta.y}`);
  await sleep(2500);
  
  // 5. Selecionar a Mídia
  // Se media for coordenadas (formato: "112,963")
  let coordMidia;
  if (media.includes(',')) {
    const [x, y] = media.split(',').map(n => parseInt(n.trim()));
    coordMidia = calcCoords(deviceId, x, y);
    console.log(`📸 [${deviceId}] Selecionando mídia nas coordenadas ${x},${y}...`);
  } else {
    // Se for caminho de arquivo, usar coordenadas padrão (primeira mídia)
    coordMidia = calcCoords(deviceId, 112, 963);
    console.log(`📸 [${deviceId}] Selecionando primeira mídia (padrão)...`);
    // TODO: Implementar push de arquivo se necessário
    // await execShell(deviceId, `push ${media} /sdcard/Download/`);
  }
  
  await execShell(deviceId, `input tap ${coordMidia.x} ${coordMidia.y}`);
  await sleep(2500);
  
  // 6. Adicionar Caption se houver
  if (caption && caption.trim() !== '') {
    console.log(`📝 [${deviceId}] Adicionando caption...`);
    const coordCaptionField = calcCoords(deviceId, coords.caption_x || 360, coords.caption_y || 1380);
    
    // Clicar no campo de caption
    await execShell(deviceId, `input tap ${coordCaptionField.x} ${coordCaptionField.y}`);
    await sleep(800);
    
    // Digitar caption humanizado
    await typeHumanAdvanced(deviceId, caption);
    await sleep(600);
  }
  
  // 7. Ativar Visualização Única (View Once)
  if (viewonce) {
    console.log(`👁️ [${deviceId}] Ativando Visualização Única...`);
    await execShell(deviceId, `input tap ${coordBtnOnce.x} ${coordBtnOnce.y}`);
    await sleep(2000);
  }
  
  // 8. Enviar
  console.log(`📤 [${deviceId}] Enviando mídia...`);
  await execShell(deviceId, `input tap ${coordEnviar.x} ${coordEnviar.y}`);
  await sleep(3000);
  
  // 9. Voltar para tela inicial (4 backs como no script)
  console.log(`🔙 [${deviceId}] Voltando para tela inicial...`);
  await execShell(deviceId, 'input keyevent 4');
  await sleep(500);
  await execShell(deviceId, 'input keyevent 4');
  await sleep(1000);
  
  // Taps adicionais de reset (do script original)
  const coordReset1 = calcCoords(deviceId, 655, 1299);
  const coordReset2 = calcCoords(deviceId, 332, 730);
  await execShell(deviceId, `input tap ${coordReset1.x} ${coordReset1.y}`);
  await sleep(1000);
  await execShell(deviceId, `input tap ${coordReset2.x} ${coordReset2.y}`);
  
  return {
    sent: true,
    number,
    media,
    caption,
    viewonce,
    timestamp: new Date().toISOString()
  };
}

/**
 * Realiza ligação (voz ou vídeo) via WhatsApp
 * @param {string} deviceId - ID do device
 * @param {string} number - Número do destinatário
 * @param {string} chamada - Tipo: "video" ou "voz"
 * @param {number} callDuration - Duração em segundos
 * @param {object} coords - Coordenadas customizadas
 */
async function sendCall(deviceId, number, chamada, callDuration = 5, coords = {}) {
  console.log(`📞 [${deviceId}] Iniciando ligação ${chamada} para ${number} (${callDuration}s)`);
  
  // Busca resolução se não tem
  if (!resolutionCache[deviceId]) {
    await getResolution(deviceId);
  }
  
  // Coordenadas base (referência 720x1600)
  const coordBtnAudio = calcCoords(deviceId, coords.btn_audio_x || 601, coords.btn_audio_y || 126);
  const coordBtnVideo = calcCoords(deviceId, coords.btn_video_x || 517, coords.btn_video_y || 123);
  const coordBtnDesligar = calcCoords(deviceId, coords.btn_desligar_x || 586, coords.btn_desligar_y || 1416);
  const coordResetMenu = calcCoords(deviceId, coords.reset_menu_x || 655, coords.reset_menu_y || 1299);
  const coordResetX = calcCoords(deviceId, coords.reset_x_x || 332, coords.reset_x_y || 730);
  
  // 1. Abre WhatsApp na conversa
  console.log(`📱 [${deviceId}] Abrindo conversa...`);
  await execShell(
    deviceId,
    `am start -a android.intent.action.VIEW -d "https://api.whatsapp.com/send?phone=${number}" com.whatsapp.w4b`
  );
  await sleep(4000); // Delay seguro para carregar
  
  // 2. Realiza a chamada (decisão áudio vs vídeo)
  if (chamada === 'video') {
    console.log(`🎥 [${deviceId}] Iniciando chamada de VÍDEO...`);
    await execShell(deviceId, `input tap ${coordBtnVideo.x} ${coordBtnVideo.y}`);
  } else {
    console.log(`📞 [${deviceId}] Iniciando chamada de ÁUDIO (voz)...`);
    await execShell(deviceId, `input tap ${coordBtnAudio.x} ${coordBtnAudio.y}`);
  }
  
  // 3. Aguarda o tempo da ligação (simulação de conversa)
  console.log(`⏳ [${deviceId}] Falando por ${callDuration} segundos...`);
  await sleep(callDuration * 1000);
  
  // 4. Desligar
  console.log(`🔴 [${deviceId}] Desligando...`);
  await execShell(deviceId, `input tap ${coordBtnDesligar.x} ${coordBtnDesligar.y}`);
  await sleep(2000);
  
  // 5. Voltar e fechar (reset para o próximo lead)
  console.log(`🔙 [${deviceId}] Voltando para tela inicial...`);
  // 2 backs (às vezes fica na tela de fim de chamada)
  await execShell(deviceId, 'input keyevent 4');
  await sleep(1000);
  await execShell(deviceId, 'input keyevent 4');
  await sleep(1000);
  
  // Taps de reset
  await execShell(deviceId, `input tap ${coordResetMenu.x} ${coordResetMenu.y}`);
  await sleep(1000);
  await execShell(deviceId, `input tap ${coordResetX.x} ${coordResetX.y}`);
  
  return {
    sent: true,
    number,
    callType: chamada,
    duration: callDuration,
    timestamp: new Date().toISOString()
  };
}

/**
 * Envia PIX via WhatsApp
 * @param {string} deviceId - ID do device
 * @param {string} number - Número do destinatário
 * @param {object} coords - Coordenadas customizadas
 */
async function sendPix(deviceId, number, coords = {}) {
  console.log(`💰 [${deviceId}] Enviando PIX para ${number}`);
  
  // Busca resolução se não tem
  if (!resolutionCache[deviceId]) {
    await getResolution(deviceId);
  }
  
  // Coordenadas base (referência 720x1600)
  const coordClipe = calcCoords(deviceId, coords.clipe_x || 492, coords.clipe_y || 1461);
  const coordIconPix = calcCoords(deviceId, coords.icon_pix_x || 282, coords.icon_pix_y || 1115);
  const coordBtnEnviar = calcCoords(deviceId, coords.btn_enviar_x || 364, coords.btn_enviar_y || 1452);
  const coordResetMenu = calcCoords(deviceId, coords.reset_menu_x || 655, coords.reset_menu_y || 1299);
  const coordResetX = calcCoords(deviceId, coords.reset_x_x || 332, coords.reset_x_y || 730);
  
  // 1. Abre WhatsApp na conversa
  console.log(`📱 [${deviceId}] Abrindo conversa...`);
  await execShell(
    deviceId,
    `am start -a android.intent.action.VIEW -d "https://api.whatsapp.com/send?phone=${number}" com.whatsapp.w4b`
  );
  await sleep(4000); // Delay seguro para carregar
  
  // 2. Clicar no Clipe (Anexo)
  console.log(`📎 [${deviceId}] Abrindo menu de anexos...`);
  await execShell(deviceId, `input tap ${coordClipe.x} ${coordClipe.y}`);
  await sleep(1500);
  
  // 3. Clicar no Ícone do PIX
  console.log(`💲 [${deviceId}] Selecionando opção Pix...`);
  await execShell(deviceId, `input tap ${coordIconPix.x} ${coordIconPix.y}`);
  await sleep(2000);
  
  // 4. Confirmar Envio
  console.log(`📤 [${deviceId}] Enviando solicitação...`);
  await execShell(deviceId, `input tap ${coordBtnEnviar.x} ${coordBtnEnviar.y}`);
  await sleep(2000);
  
  // 5. Voltar e fechar (reset para o próximo lead)
  console.log(`🔙 [${deviceId}] Voltando para tela inicial...`);
  await execShell(deviceId, 'input keyevent 4');
  await sleep(500);
  await execShell(deviceId, 'input keyevent 4');
  await sleep(1000);
  
  // Taps de reset
  await execShell(deviceId, `input tap ${coordResetMenu.x} ${coordResetMenu.y}`);
  await sleep(1000);
  await execShell(deviceId, `input tap ${coordResetX.x} ${coordResetX.y}`);
  
  return {
    sent: true,
    number,
    pixSent: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Salva contato na agenda do device
 * @param {string} deviceId - ID do device
 * @param {string} namelead - Nome do contato
 * @param {string} numberlead - Número do contato
 * @param {string} tag - Tag/categoria do contato
 * @param {object} coords - Coordenadas customizadas
 */
async function saveContact(deviceId, namelead, numberlead, tag = '', coords = {}) {
  console.log(`📇 [${deviceId}] Salvando contato: ${namelead} (${numberlead}) - Tag: ${tag}`);
  
  // Busca resolução se não tem
  if (!resolutionCache[deviceId]) {
    await getResolution(deviceId);
  }
  
  // Coordenadas base (referência 720x1600) - 11 passos
  const coordPasso1 = calcCoords(deviceId, coords.passo1_x || 644, coords.passo1_y || 1325);
  const coordPasso2 = calcCoords(deviceId, coords.passo2_x || 346, coords.passo2_y || 360);
  const coordPasso3 = calcCoords(deviceId, coords.passo3_x || 218, coords.passo3_y || 257);
  const coordPasso5 = calcCoords(deviceId, coords.passo5_x || 205, coords.passo5_y || 389);
  const coordPasso7 = calcCoords(deviceId, coords.passo7_x || 368, coords.passo7_y || 526);
  const coordPasso9 = calcCoords(deviceId, coords.passo9_x || 340, coords.passo9_y || 954);
  
  // Garante que está na home do WhatsApp antes de começar
  console.log(`🏠 [${deviceId}] Garantindo que está na Home...`);
  await execShell(deviceId, 'am start -n com.whatsapp.w4b/com.whatsapp.HomeActivity');
  await sleep(2000);
  
  // 1. Clique Inicial
  console.log(`👆 [${deviceId}] 1. Clicando em ${coordPasso1.x},${coordPasso1.y}...`);
  await execShell(deviceId, `input tap ${coordPasso1.x} ${coordPasso1.y}`);
  await sleep(1500);
  
  // 2. Clique
  console.log(`👆 [${deviceId}] 2. Clicando em ${coordPasso2.x},${coordPasso2.y}...`);
  await execShell(deviceId, `input tap ${coordPasso2.x} ${coordPasso2.y}`);
  await sleep(1000);
  
  // 3. Clique (Campo Nome)
  console.log(`👆 [${deviceId}] 3. Clicando em campo Nome...`);
  await execShell(deviceId, `input tap ${coordPasso3.x} ${coordPasso3.y}`);
  await sleep(500);
  
  // 4. Digite o Nome (usa digitação humanizada)
  console.log(`⌨️ [${deviceId}] 4. Digitando nome: ${namelead}...`);
  await typeHumanAdvanced(deviceId, namelead);
  await sleep(1000);
  
  // 5. Clique (Campo Tag)
  console.log(`👆 [${deviceId}] 5. Clicando em campo Tag...`);
  await execShell(deviceId, `input tap ${coordPasso5.x} ${coordPasso5.y}`);
  await sleep(500);
  
  // 6. Digite a Tag
  if (tag && tag.trim() !== '') {
    console.log(`⌨️ [${deviceId}] 6. Digitando tag: ${tag}...`);
    await execShell(deviceId, `input text "${tag}"`);
  } else {
    console.log(`⌨️ [${deviceId}] 6. Sem tag para adicionar`);
  }
  await sleep(1000);
  
  // 7. Clique (Campo Número)
  console.log(`👆 [${deviceId}] 7. Clicando em campo Número...`);
  await execShell(deviceId, `input tap ${coordPasso7.x} ${coordPasso7.y}`);
  await sleep(500);
  
  // 8. Digite o Número (Remove os 2 primeiros dígitos - 55)
  const numeroFormatado = numberlead.startsWith('55') ? numberlead.substring(2) : numberlead;
  console.log(`⌨️ [${deviceId}] 8. Digitando número: ${numeroFormatado}...`);
  await execShell(deviceId, `input text "${numeroFormatado}"`);
  await sleep(1000);
  
  // 9. Clique Salvar
  console.log(`💾 [${deviceId}] 9. Salvando contato...`);
  await execShell(deviceId, `input tap ${coordPasso9.x} ${coordPasso9.y}`);
  await sleep(3000);
  
  // 10. Voltar
  console.log(`🔙 [${deviceId}] 10. Voltando...`);
  await execShell(deviceId, 'input keyevent 4');
  await sleep(1000);
  
  // 11. Voltar para Tela Inicial (Home)
  console.log(`🏠 [${deviceId}] 11. Resetando para Home...`);
  await execShell(deviceId, 'input keyevent 4');
  await sleep(500);
  await execShell(deviceId, 'am start -n com.whatsapp.w4b/com.whatsapp.HomeActivity');
  
  return {
    saved: true,
    name: namelead,
    number: numberlead,
    numberFormatted: numeroFormatado,
    tag: tag || 'sem tag',
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  client,
  execShell,
  listDevices,
  getResolution,
  calcCoords,
  gerarComandoHumanizado,
  typeHumanAdvanced,
  sendMessage,
  connect,
  sendMedia,
  sendCall,
  sendPix,
  saveContact,
  resolutionCache
};
