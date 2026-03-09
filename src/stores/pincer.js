import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchAgents, fetchTasks, fetchMessages, fetchInbox } from '../api'
import { getRoomId, POLL_INTERVAL } from '../config'

export const usePincerStore = defineStore('pincer', () => {
  const agents = ref([])
  const tasks = ref([])
  const messages = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Selected agent (for bubble view "right side")
  const selectedAgentId = ref(localStorage.getItem('pincer_selected_agent') || '')

  function selectAgent(id) {
    selectedAgentId.value = selectedAgentId.value === id ? '' : id
    localStorage.setItem('pincer_selected_agent', selectedAgentId.value)
  }

  // DM inbox — accumulated across polls, keyed by sender_agent_id
  const dms = ref({}) // { agentId: [msg, ...] }

  let timer = null

  async function refresh() {
    try {
      const roomId = getRoomId()
      const [a, t, m] = await Promise.all([
        fetchAgents(),
        fetchTasks(),
        roomId ? fetchMessages(roomId) : Promise.resolve([]),
      ])
      agents.value = Array.isArray(a) ? a : (a.agents || [])
      tasks.value = Array.isArray(t) ? t : (t.tasks || [])
      messages.value = Array.isArray(m) ? m : (m.messages || [])
      error.value = null

      // Poll inbox for selected agent (if any)
      if (selectedAgentId.value) {
        try {
          const inbox = await fetchInbox(selectedAgentId.value)
          if (Array.isArray(inbox) && inbox.length > 0) {
            accumulateDMs(inbox)
          }
        } catch (_) { /* inbox poll failures are non-fatal */ }
      }
    } catch (e) {
      error.value = e.message
    }
  }

  function accumulateDMs(msgs) {
    const updated = { ...dms.value }
    for (const msg of msgs) {
      const key = msg.from_agent_id || msg.sender_agent_id || 'unknown'
      if (!updated[key]) updated[key] = []
      // Deduplicate by id
      if (!updated[key].find(m => m.id === msg.id)) {
        updated[key] = [...updated[key], msg]
      }
    }
    dms.value = updated
  }

  function startPolling() {
    refresh()
    timer = setInterval(refresh, POLL_INTERVAL)
  }

  function stopPolling() {
    if (timer) clearInterval(timer)
  }

  return {
    agents, tasks, messages, loading, error,
    selectedAgentId, selectAgent,
    dms,
    refresh, startPolling, stopPolling,
  }
})
