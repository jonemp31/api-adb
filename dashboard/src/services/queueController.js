import http from '@/http-common'

const getQueueLength = async (deviceAlias) => {
  return await http.get(`/queue/${deviceAlias}`).then(r => r.data)
}

const getPendingTasks = async (deviceAlias) => {
  return await http.get(`/queue/${deviceAlias}/tasks`).then(r => r.data)
}

const addTask = async (deviceAlias, taskData) => {
  return await http.post('/task', {
    deviceAlias,
    ...taskData
  }).then(r => r.data)
}

const clearQueue = async (deviceAlias) => {
  return await http.delete(`/queue/${deviceAlias}`).then(r => r.data)
}

const getTaskHistory = async (deviceAlias, limit = 50) => {
  return await http.get(`/queue/${deviceAlias}/history`, {
    params: { limit }
  }).then(r => r.data)
}

export default {
  getQueueLength,
  getPendingTasks,
  addTask,
  clearQueue,
  getTaskHistory
}
