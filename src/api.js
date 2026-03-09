import axios from 'axios'
import { PINCER_BASE, API_KEY } from './config'

const client = axios.create({
  baseURL: PINCER_BASE,
  headers: { 'X-API-Key': API_KEY },
})

export const fetchAgents = () => client.get('/api/v1/agents').then(r => r.data)
export const fetchTasks = (status = 'active') => client.get('/api/v1/tasks', { params: { status } }).then(r => r.data)
export const fetchMessages = (roomId, limit = 30) =>
  client.get(`/api/v1/rooms/${roomId}/messages`, { params: { limit } }).then(r => r.data)
