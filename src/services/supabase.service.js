// =======================================================
// SUPABASE SERVICE - Seu código adaptado
// =======================================================

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Busca todos os devices online
 */
async function getOnlineDevices() {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('status', 'ONLINE');
  
  if (error) throw error;
  return data || [];
}

/**
 * Atualiza ou cria device
 */
async function upsertDevice(deviceData) {
  const { data, error } = await supabase
    .from('devices')
    .upsert(deviceData, { onConflict: 'id' });
  
  if (error) throw error;
  return data;
}

/**
 * Atualiza múltiplos devices
 */
async function upsertDevices(devicesArray) {
  const { data, error } = await supabase
    .from('devices')
    .upsert(devicesArray, { onConflict: 'id' });
  
  if (error) throw error;
  return data;
}

/**
 * Busca device por alias
 */
async function getDeviceByAlias(alias) {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('alias', alias)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Busca device por ID
 */
async function getDeviceById(id) {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Busca todos os devices
 */
async function getAllDevices() {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .order('alias', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

/**
 * Atualiza status de um device
 */
async function updateDeviceStatus(id, status) {
  const { data, error } = await supabase
    .from('devices')
    .update({ 
      status, 
      last_seen: new Date().toISOString() 
    })
    .eq('id', id);
  
  if (error) throw error;
  return data;
}

/**
 * Atualiza campo específico do device
 */
async function updateDeviceField(deviceId, field, value) {
  const { data, error } = await supabase
    .from('devices')
    .update({ [field]: value })
    .eq('id', deviceId);
  
  if (error) throw error;
  return data;
}

/**
 * Atualiza coordenadas do device
 */
async function updateDeviceCoordinates(deviceId, focus_x, focus_y) {
  const { data, error } = await supabase
    .from('devices')
    .update({ focus_x, focus_y })
    .eq('id', deviceId);
  
  if (error) throw error;
  return data;
}

module.exports = {
  supabase,
  getOnlineDevices,
  upsertDevice,
  upsertDevices,
  getDeviceByAlias,
  getDeviceById,
  getAllDevices,
  updateDeviceStatus,
  updateDeviceField,
  updateDeviceCoordinates
};
