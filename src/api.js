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
export const fetchMessages = (roomId, limit = 30) =>
  getClient().get(`/api/v1/rooms/${roomId}/messages`, { params: { limit } }).then(r => r.data)
export const fetchRooms = () => getClient().get('/api/v1/rooms').then(r => r.data)
export const fetchProjects = () => getClient().get('/api/v1/projects').then(r => r.data)
export const fetchProjectTasks = (projectId) =>
  getClient().get(`/api/v1/projects/${projectId}/tasks`).then(r => r.data)
