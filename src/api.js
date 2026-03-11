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
export const fetchProjectTasks = (projectId) =>
  getClient().get(`/api/v1/projects/${projectId}/tasks`).then(r => r.data)
export const createProject = (name) =>
  getClient().post('/api/v1/projects', { name }).then(r => r.data)
export const fetchInbox = (agentId) =>
  getClient().get(`/api/v1/agents/${agentId}/inbox`).then(r => r.data)

export const fetchAgentMessages = (agentId, { from, limit = 100 } = {}) =>
  getClient().get(`/api/v1/agents/${agentId}/messages`, { params: { from, limit } }).then(r => r.data)

// Human identity
export const registerHuman = (name = 'You') =>
  getClient().post('/api/v1/agents/register', { name, type: 'human' }).then(r => r.data)

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

// Update task status (for Kanban drag & drop)
export const updateTaskStatus = (taskId, status) =>
  getClient().put(`/api/v1/tasks/${taskId}`, { status }).then(r => r.data)

// Fetch all tasks (no status filter)
export const fetchAllTasks = () =>
  getClient().get('/api/v1/tasks', { params: { status: 'all' } }).then(r => r.data)

// Bidirectional conversation between two agents
export const fetchConversation = (a, b, limit = 100) =>
  getClient().get('/api/v1/conversations', { params: { a, b, limit } }).then(r => r.data)
