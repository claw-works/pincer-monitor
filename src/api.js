import axios from 'axios'
import { getPincerBase, getApiKey } from './config'

function getClient() {
  return axios.create({
    baseURL: getPincerBase(),
    headers: { 'X-API-Key': getApiKey() },
  })
}

export const fetchAgents = () => getClient().get('/api/v1/agents').then(r => r.data)
export const fetchTasks = (status = 'active') =>
  getClient().get('/api/v1/tasks', { params: { status } }).then(r => r.data)
export const fetchMessages = (roomId, { limit = 30, since } = {}) => {
  const params = { limit }
  if (since) params.since = since
  return getClient().get(`/api/v1/rooms/${roomId}/messages`, { params }).then(r => r.data)
}
export const fetchRooms = () => getClient().get('/api/v1/rooms').then(r => r.data)
export const fetchProjects = () => getClient().get('/api/v1/projects').then(r => r.data)
export const fetchProjectReports = (projectId, limit = 30) =>
  getClient().get(`/api/v1/projects/${projectId}/reports?limit=${limit}`).then(r => r.data)
export const fetchProjectTasks = (projectId, { limit = 50, offset = 0 } = {}) =>
  getClient().get(`/api/v1/projects/${projectId}/tasks`, { params: { limit, offset } }).then(r => r.data)
export const createProject = (name) =>
  getClient().post('/api/v1/projects', { name }).then(r => r.data)
export const fetchInbox = (agentId) =>
  getClient().get(`/api/v1/agents/${agentId}/inbox`).then(r => r.data)

export const fetchAgentMessages = (agentId, { from, limit = 100 } = {}) =>
  getClient().get(`/api/v1/agents/${agentId}/messages`, { params: { from, limit } }).then(r => r.data)

// Human identity
export const registerHuman = (name = 'You') =>
  getClient().post('/api/v1/agents/register', { name, type: 'human' }).then(r => r.data)

// Register as human identity (upsert via auth endpoint)
export const registerHumanIdentity = (name) =>
  getClient().post('/api/v1/auth/register-human', { name }).then(r => r.data)

// Send room message as human
export const sendRoomMessage = (roomId, senderAgentId, content) =>
  getClient().post(`/api/v1/rooms/${roomId}/messages`, {
    sender_agent_id: senderAgentId,
    content,
  }).then(r => r.data)

// Send DM
export const sendDM = (fromAgentId, toAgentId, text) =>
  getClient().post('/api/v1/messages/send', {
    from_agent_id: fromAgentId,
    to_agent_id: toAgentId,
    type: 'agent.message',
    payload: { from: 'You', text },
  }).then(r => r.data)

// Create task
export const createTask = (fields) =>
  getClient().post('/api/v1/tasks', fields).then(r => r.data)

// Update task status (for Kanban drag & drop) — uses proper sub-path API
export const updateTaskStatus = (taskId, newStatus, agentId, extra = {}) => {
  const client = getClient()
  if (newStatus === 'assigned') {
    return client.patch(`/api/v1/tasks/${taskId}/claim`, { agent_id: agentId }).then(r => r.data)
  } else if (newStatus === 'running') {
    return client.patch(`/api/v1/tasks/${taskId}/start`).then(r => r.data)
  } else if (newStatus === 'review') {
    return client.patch(`/api/v1/tasks/${taskId}/submit`).then(r => r.data)
  } else if (newStatus === 'done') {
    return client.patch(`/api/v1/tasks/${taskId}/complete`, { result: extra.result || '' }).then(r => r.data)
  } else if (newStatus === 'failed') {
    return client.patch(`/api/v1/tasks/${taskId}/fail`, { error: extra.error || '' }).then(r => r.data)
  }
  return Promise.reject(new Error(`Unknown status: ${newStatus}`))
}

// Fetch all tasks (no status filter)
export const fetchAllTasks = ({ limit = 50, offset = 0 } = {}) =>
  getClient().get('/api/v1/tasks', { params: { limit, offset } }).then(r => r.data)

// Review workflow
export const submitTask = (taskId) =>
  getClient().patch(`/api/v1/tasks/${taskId}/submit`).then(r => r.data)
export const approveTask = (taskId) =>
  getClient().patch(`/api/v1/tasks/${taskId}/approve`).then(r => r.data)
export const rejectTask = (taskId, reason) =>
  getClient().patch(`/api/v1/tasks/${taskId}/reject`, { reason }).then(r => r.data)

// Search messages
export const searchRoomMessages = (roomId, q, { limit = 20, offset = 0 } = {}) =>
  getClient().get(`/api/v1/rooms/${roomId}/messages/search`, { params: { q, limit, offset } }).then(r => r.data)

export const searchDMMessages = (agentA, agentB, q, { limit = 20, offset = 0 } = {}) =>
  getClient().get('/api/v1/messages/search', { params: { q, agent_a: agentA, agent_b: agentB, limit, offset } }).then(r => r.data)

// Reset API Key
export const resetApiKey = () =>
  getClient().post('/api/v1/auth/reset-key').then(r => r.data)

// Bidirectional conversation between two agents
export const fetchConversation = (a, b, limit = 100) =>
  getClient().get('/api/v1/conversations', { params: { a, b, limit } }).then(r => r.data)
