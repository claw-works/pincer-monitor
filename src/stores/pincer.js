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

  // ── Granular refresh methods ──────────────────────────────────────────────

  async function refreshAgents() {
    humanAgentId.value = getHumanAgentId()
    try {
      const a = await fetchAgents()
      agents.value = Array.isArray(a) ? a : (a.agents || [])
      error.value = null
    } catch (e) {
      error.value = e.message
    }
  }

  async function refreshTasks() {
    try {
      const t = await fetchTasks()
      tasks.value = Array.isArray(t) ? t : (t.tasks || [])
      error.value = null
    } catch (e) {
      error.value = e.message
    }
  }

  async function refreshMessages() {
    const roomId = getRoomId()
    if (!roomId) return
    try {
      const m = await fetchMessages(roomId)
      messages.value = Array.isArray(m) ? m : (m.messages || [])
      error.value = null
    } catch (e) {
      error.value = e.message
    }
  }

  async function refreshDMs() {
    const humanId = getHumanAgentId()
    if (!humanId) return
    try {
      const inbox = await fetchInbox(humanId)
      if (Array.isArray(inbox) && inbox.length > 0) {
        accumulateDMs(inbox)
      }
    } catch (_) { /* non-fatal */ }
  }

  // Combined refresh (kept for manual "Refresh" button)
  async function refresh() {
    await Promise.allSettled([
      refreshAgents(),
      refreshTasks(),
      refreshMessages(),
      refreshDMs(),
    ])
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

  // Legacy: global polling (used by App.vue for initial load + agents sidebar)
  let timer = null

  function startPolling() {
    refreshAgents()
    timer = setInterval(refreshAgents, POLL_INTERVAL)
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
    refresh, refreshAgents, refreshTasks, refreshMessages, refreshDMs,
    startPolling, stopPolling,
  }
})
