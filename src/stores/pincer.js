import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchAgents, fetchTasks, fetchMessages, fetchInbox } from '../api'
import { getRoomId, getHumanAgentId, POLL_INTERVAL } from '../config'

export const usePincerStore = defineStore('pincer', () => {
  const agents = ref([])
  const tasks = ref([])
  const messages = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Human agent identity
  const humanAgentId = ref(getHumanAgentId())

  // Selected agent for current view perspective
  const selectedAgentId = ref(localStorage.getItem('pincer_selected_agent') || '')
  const selectedAgent = computed(() =>
    selectedAgentId.value ? agents.value.find(a => a.id === selectedAgentId.value) || null : null
  )

  function selectAgent(id) {
    selectedAgentId.value = selectedAgentId.value === id ? '' : id
    localStorage.setItem('pincer_selected_agent', selectedAgentId.value)
  }

  // Active DM target (clicked from AgentCards)
  const activeDmAgentId = ref(null)

  function openDM(id) {
    activeDmAgentId.value = activeDmAgentId.value === id ? null : id
  }

  // DM inbox — accumulated across polls, keyed by sender_agent_id
  const dms = ref({}) // { agentId: [msg, ...] }

  let timer = null

  async function refresh() {
    // Re-read humanAgentId in case it was just saved
    humanAgentId.value = getHumanAgentId()

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

      // Poll inbox for human agent (if any)
      const humanId = getHumanAgentId()
      if (humanId) {
        try {
          const inbox = await fetchInbox(humanId)
          if (Array.isArray(inbox) && inbox.length > 0) {
            accumulateDMs(inbox)
          }
        } catch (_) { /* non-fatal */ }
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
      if (!updated[key].find(m => m.id === msg.id)) {
        updated[key] = [...updated[key], msg]
      }
    }
    dms.value = updated
  }

  function addOutgoingDM(toAgentId, text) {
    const humanId = getHumanAgentId()
    const msg = {
      id: `local-${Date.now()}`,
      from_agent_id: humanId,
      to_agent_id: toAgentId,
      payload: { from: 'You', text },
      created_at: new Date().toISOString(),
    }
    const updated = { ...dms.value }
    if (!updated[toAgentId]) updated[toAgentId] = []
    updated[toAgentId] = [...updated[toAgentId], msg]
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
    humanAgentId,
    selectedAgentId, selectedAgent, selectAgent,
    activeDmAgentId, openDM,
    dms, addOutgoingDM,
    refresh, startPolling, stopPolling,
  }
})
