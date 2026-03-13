// pincer API config — reads from localStorage first, falls back to env vars
export const BUILD_TIME_BASE = import.meta.env.VITE_PINCER_BASE || ''

export function getPincerBase() {
  return localStorage.getItem('pincer_url') || BUILD_TIME_BASE || 'http://localhost:8080'
}

export function getApiKey() {
  return localStorage.getItem('pincer_api_key') || ''
}

export function getRoomId() {
  return localStorage.getItem('pincer_room_id') || ''
}

export function getHumanAgentId() {
  return localStorage.getItem('pincer_human_agent_id') || ''
}

export function saveHumanAgentId(id) {
  localStorage.setItem('pincer_human_agent_id', id)
}

export function isConfigured() {
  return !!(getApiKey() && getRoomId())
}

// Save URL + API Key (step 1 of login)
export function saveConnection({ url, apiKey }) {
  localStorage.setItem('pincer_url', url)
  localStorage.setItem('pincer_api_key', apiKey)
}

// Save selected room (step 2 of login)
export function saveRoomId(roomId) {
  localStorage.setItem('pincer_room_id', roomId)
}

export function getHumanName() {
  return localStorage.getItem('pincer_human_name') || ''
}

export function saveHumanName(name) {
  localStorage.setItem('pincer_human_name', name)
}

export function getIsHuman() {
  return localStorage.getItem('pincer_is_human') === 'true'
}

export function saveIsHuman(val) {
  localStorage.setItem('pincer_is_human', val ? 'true' : 'false')
}

export function clearConfig() {
  localStorage.removeItem('pincer_url')
  localStorage.removeItem('pincer_api_key')
  localStorage.removeItem('pincer_room_id')
  localStorage.removeItem('pincer_human_agent_id')
  localStorage.removeItem('pincer_human_name')
  localStorage.removeItem('pincer_is_human')
}

export const POLL_INTERVAL = 5000 // ms
