import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchAgents, fetchTasks, fetchMessages } from '../api'
import { ROOM_ID, POLL_INTERVAL } from '../config'

export const usePincerStore = defineStore('pincer', () => {
  const agents = ref([])
  const tasks = ref([])
  const messages = ref([])
  const loading = ref(false)
  const error = ref(null)
  let timer = null

  async function refresh() {
    try {
      const [a, t, m] = await Promise.all([
        fetchAgents(),
        fetchTasks(),
        ROOM_ID ? fetchMessages(ROOM_ID) : Promise.resolve([]),
      ])
      agents.value = Array.isArray(a) ? a : (a.agents || [])
      tasks.value = Array.isArray(t) ? t : (t.tasks || [])
      messages.value = Array.isArray(m) ? m : (m.messages || [])
      error.value = null
    } catch (e) {
      error.value = e.message
    }
  }

  function startPolling() {
    refresh()
    timer = setInterval(refresh, POLL_INTERVAL)
  }

  function stopPolling() {
    if (timer) clearInterval(timer)
  }

  return { agents, tasks, messages, loading, error, refresh, startPolling, stopPolling }
})
