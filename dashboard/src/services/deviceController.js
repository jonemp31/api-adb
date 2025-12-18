import http from '@/http-common'

const fetchAll = async () => {
  return await http.get('/devices').then(r => r.data)
}

const getStats = async () => {
  return await http.get('/status').then(r => r.data)
}

const getDeviceStats = async (alias) => {
  return await http.get(`/device/${alias}/stats`).then(r => r.data)
}

const reconnect = async (deviceId) => {
  return await http.post(`/device/${deviceId}/reconnect`).then(r => r.data)
}

const disconnect = async (deviceId) => {
  return await http.post(`/device/${deviceId}/disconnect`).then(r => r.data)
}

const toggleWorker = async (deviceId, enabled) => {
  return await http.post(`/device/${deviceId}/worker`, { enabled }).then(r => r.data)
}

const testCommand = async (deviceId, command) => {
  return await http.post(`/device/${deviceId}/test`, { command }).then(r => r.data)
}

const updateCoordinates = async (deviceId, coordinates) => {
  return await http.put(`/device/${deviceId}/coordinates`, coordinates).then(r => r.data)
}

export default {
  fetchAll,
  getStats,
  getDeviceStats,
  reconnect,
  disconnect,
  toggleWorker,
  testCommand,
  updateCoordinates
}
