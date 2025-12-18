// =======================================================
// REDIS SERVICE - Fila FIFO por Device
// =======================================================

const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

let redis = null;

// Prefixos das chaves Redis
const KEYS = {
  QUEUE: (deviceId) => `queue:${deviceId}`,           // Lista FIFO
  TASK: (taskId) => `task:${taskId}`,                 // Dados da task
  PROCESSING: (deviceId) => `processing:${deviceId}`, // Task atual
  COUNTER_TODAY: (deviceId) => `counter:today:${deviceId}`,     // Contador diário
  COUNTER_TOTAL: (deviceId) => `counter:total:${deviceId}`,     // Contador total
};

/**
 * Conecta ao Redis
 */
async function connect() {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3
  });

  return new Promise((resolve, reject) => {
    redis.on('connect', () => {
      console.log('✅ Redis conectado');
      resolve();
    });
    redis.on('error', (err) => {
      console.error('❌ Redis erro:', err.message);
      reject(err);
    });
  });
}

/**
 * Adiciona task na fila do device (FIFO)
 */
async function addTask(deviceId, taskData) {
  const taskId = uuidv4();
  const task = {
    id: taskId,
    deviceId,
    ...taskData,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Salva task
  await redis.set(KEYS.TASK(taskId), JSON.stringify(task));
  
  // Adiciona na fila (fim)
  await redis.rpush(KEYS.QUEUE(deviceId), taskId);

  return task;
}

/**
 * Pega próxima task da fila (Worker puxa)
 */
async function getNextTask(deviceId) {
  // Verifica se já está processando
  const processingTaskId = await redis.get(KEYS.PROCESSING(deviceId));
  if (processingTaskId) {
    const taskData = await redis.get(KEYS.TASK(processingTaskId));
    if (taskData) {
      return { task: null, reason: 'device_busy', currentTask: JSON.parse(taskData) };
    }
  }

  // Pega da fila (início)
  const taskId = await redis.lpop(KEYS.QUEUE(deviceId));
  if (!taskId) {
    return { task: null, reason: 'queue_empty' };
  }

  // Busca dados
  const taskData = await redis.get(KEYS.TASK(taskId));
  if (!taskData) {
    return { task: null, reason: 'task_not_found' };
  }

  const task = JSON.parse(taskData);
  task.status = 'processing';
  task.startedAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();

  // Atualiza
  await redis.set(KEYS.TASK(taskId), JSON.stringify(task));
  
  // 🔒 TTL de 5 minutos - se worker morrer, chave expira automaticamente
  await redis.set(KEYS.PROCESSING(deviceId), taskId, 'EX', 300);

  return { task };
}

/**
 * Marca task como completa
 */
async function completeTask(taskId, result = {}) {
  const taskData = await redis.get(KEYS.TASK(taskId));
  if (!taskData) return { success: false, reason: 'task_not_found' };

  const task = JSON.parse(taskData);
  task.status = 'completed';
  task.result = result;
  task.completedAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();

  await redis.set(KEYS.TASK(taskId), JSON.stringify(task));
  await redis.del(KEYS.PROCESSING(task.deviceId));

  return { success: true, task };
}

/**
 * Marca task como falha
 */
async function failTask(taskId, error = {}, requeue = false) {
  const taskData = await redis.get(KEYS.TASK(taskId));
  if (!taskData) return { success: false, reason: 'task_not_found' };

  const task = JSON.parse(taskData);
  task.status = 'failed';
  task.error = error;
  task.failedAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  task.retryCount = (task.retryCount || 0) + 1;

  await redis.del(KEYS.PROCESSING(task.deviceId));

  // Requeue se solicitado
  if (requeue && task.retryCount < 3) {
    task.status = 'pending';
    await redis.set(KEYS.TASK(taskId), JSON.stringify(task));
    await redis.lpush(KEYS.QUEUE(task.deviceId), taskId);
    return { success: true, task, requeued: true };
  }

  await redis.set(KEYS.TASK(taskId), JSON.stringify(task));
  return { success: true, task, requeued: false };
}

/**
 * Retorna tamanho da fila
 */
async function getQueueLength(deviceId) {
  return await redis.llen(KEYS.QUEUE(deviceId));
}

/**
 * Retorna task específica
 */
async function getTask(taskId) {
  const taskData = await redis.get(KEYS.TASK(taskId));
  return taskData ? JSON.parse(taskData) : null;
}

/**
 * Lista tasks pendentes
 */
async function getPendingTasks(deviceId) {
  const taskIds = await redis.lrange(KEYS.QUEUE(deviceId), 0, -1);
  const tasks = [];
  
  for (const taskId of taskIds) {
    const task = await getTask(taskId);
    if (task) tasks.push(task);
  }
  
  return tasks;
}

/**
 * Incrementa contador de tasks (hoje e total)
 */
async function incrementCounters(deviceId) {
  // Incrementa total
  await redis.incr(KEYS.COUNTER_TOTAL(deviceId));
  
  // Incrementa hoje (com TTL até meia-noite)
  const todayKey = KEYS.COUNTER_TODAY(deviceId);
  await redis.incr(todayKey);
  
  // Calcula segundos até meia-noite
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const secondsUntilMidnight = Math.floor((midnight - now) / 1000);
  
  // Define TTL se for a primeira task do dia
  const count = await redis.get(todayKey);
  if (count === '1') {
    await redis.expire(todayKey, secondsUntilMidnight);
  }
}

/**
 * Retorna contadores (hoje e total)
 */
async function getCounters(deviceId) {
  const today = await redis.get(KEYS.COUNTER_TODAY(deviceId)) || '0';
  const total = await redis.get(KEYS.COUNTER_TOTAL(deviceId)) || '0';
  
  return {
    today: parseInt(today),
    total: parseInt(total)
  };
}

/**
 * Limpa fila de um device
 */
async function clearQueue(deviceId) {
  const taskIds = await redis.lrange(KEYS.QUEUE(deviceId), 0, -1);
  
  // Remove tasks da fila
  await redis.del(KEYS.QUEUE(deviceId));
  
  // Remove tasks individuais
  for (const taskId of taskIds) {
    await redis.del(KEYS.TASK(taskId));
  }
  
  return { cleared: taskIds.length };
}

module.exports = {
  connect,
  addTask,
  getNextTask,
  completeTask,
  failTask,
  getQueueLength,
  getTask,
  getPendingTasks,
  incrementCounters,
  getCounters,
  clearQueue
};
