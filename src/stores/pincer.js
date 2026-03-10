import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchAgents, fetchTasks, fetchMessages, fetchInbox } from '../api'
import { getRoomId, getHumanAgentId, POLL_INTERVAL } from '../config'
import { useWebSocket } from '../composables/useWebSocket'

export const usePincerStore = defineStore('pincer', () => {
  const agents = ref([])
  const tasks = ref([])
  const messages = ref([])
  const loading = ref(false)
  const error = ref(null)
  const wsConnected = ref(false)

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

  // Merge a list of messages under a single key (by sender), dedup by id
  function mergeDMs(agentId, msgs) {
    const updated = { ...dms.value }
    if (!updated[agentId]) updated[agentId] = []
    const existing = new Set(updated[agentId].map(m => m.id))
    const newMsgs = msgs.filter(m => !existing.has(m.id))
    if (newMsgs.length > 0) {
      updated[agentId] = [...updated[agentId], ...newMsgs].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      )
      dms.value = updated
    }
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

  // ── WebSocket event handler ───────────────────────────────────────────────

  function handleWsEvent(event) {
    const { type, data } = event || {}

    switch (type) {
      case 'room.message': {
        // Append new message if not duplicate
        const roomId = getRoomId()
        if (data?.room_id && data.room_id !== roomId) break
        if (data && !messages.value.find(m => m.id === data.id)) {
          messages.value = [...messages.value, data]
        }
        break
      }

      case 'task.update':
      case 'task.result': {
        if (!data?.id) break
        const idx = tasks.value.findIndex(t => t.id === data.id)
        if (idx >= 0) {
          // Update existing task in-place
          tasks.value = [
            ...tasks.value.slice(0, idx),
            { ...tasks.value[idx], ...data },
            ...tasks.value.slice(idx + 1),
          ]
        } else {
          // New task we haven't seen
          tasks.value = [...tasks.value, data]
        }
        break
      }

      case 'agent.online':
      case 'agent.heartbeat': {
        if (!data?.id) break
        const aIdx = agents.value.findIndex(a => a.id === data.id)
        if (aIdx >= 0) {
          agents.value = [
            ...agents.value.slice(0, aIdx),
            { ...agents.value[aIdx], ...data, status: 'online' },
            ...agents.value.slice(aIdx + 1),
          ]
        } else {
          // Unknown agent — trigger a full refresh
          refreshAgents()
        }
        break
      }

      default:
        // Unknown event type — ignore silently
        break
    }
  }

  // ── WebSocket lifecycle ───────────────────────────────────────────────────

  const { connected: wsStatus, connect: wsConnect, disconnect: wsDisconnect } = useWebSocket(handleWsEvent)

  // Fallback polling interval (ms) — used when WS is not available
  // Set to null to disable fallback polling entirely once WS is stable
  const FALLBACK_INTERVAL = POLL_INTERVAL * 6 // 30s fallback

  let fallbackTimer = null

  function startPolling() {
    // Initial full data load via HTTP
    refresh()

    // Start WebSocket for real-time updates
    wsConnect()

    // Light fallback: re-sync agents list every 30s in case WS misses something
    fallbackTimer = setInterval(refreshAgents, FALLBACK_INTERVAL)
  }

  function stopPolling() {
    wsDisconnect()
    if (fallbackTimer) {
      clearInterval(fallbackTimer)
      fallbackTimer = null
    }
  }

  return {
    agents, tasks, messages, loading, error,
    wsConnected: wsStatus,
    humanAgentId,
    selectedAgentId, selectedAgent, selectAgent,
    activeDmAgentId, openDM,
    dms, addOutgoingDM, mergeDMs,
    refresh, refreshAgents, refreshTasks, refreshMessages, refreshDMs,
    startPolling, stopPolling,
  }
})
