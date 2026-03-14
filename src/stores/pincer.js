import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchAgents, fetchTasks, fetchMessages, fetchInbox, fetchRooms } from '../api'
import { getRoomId, getHumanAgentId, getIsHuman, saveRoomId, POLL_INTERVAL } from '../config'
import { useWebSocket } from '../composables/useWebSocket'
import { useInboxWS } from '../composables/useInboxWS'

export const usePincerStore = defineStore('pincer', () => {
  const agents = ref([])
  const tasks = ref([])
  const messages = ref([])
  const loading = ref(false)
  const error = ref(null)
  const wsConnected = ref(false)
  const lastMessageAt = ref(null) // ISO timestamp of last seen room message

  // Human agent identity
  const humanAgentId = ref(getHumanAgentId())
  const isHuman = ref(getIsHuman())

  // Selected agent for current view perspective
  const selectedAgentId = ref(localStorage.getItem('pincer_selected_agent') || '')
  const selectedAgent = computed(() =>
    selectedAgentId.value ? agents.value.find(a => a.id === selectedAgentId.value) || null : null
  )

  function selectAgent(id) {
    selectedAgentId.value = selectedAgentId.value === id ? '' : id
    localStorage.setItem('pincer_selected_agent', selectedAgentId.value)
    // Refresh agents to ensure name is up-to-date in the perspective badge
    if (selectedAgentId.value) refreshAgents()
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

  // Refresh the room_id from the backend (handles opaque UUID format migration).
  // Call on startup and whenever a room request returns 404.
  async function refreshRoomId() {
    try {
      const rooms = await fetchRooms()
      const list = Array.isArray(rooms) ? rooms : (rooms.rooms || [])
      if (list.length > 0) {
        const newId = list[0].id
        if (newId && newId !== getRoomId()) {
          saveRoomId(newId)
          console.log('[Store] room_id updated:', newId)
        }
        return newId
      }
    } catch (e) {
      console.warn('[Store] refreshRoomId failed:', e)
    }
    return getRoomId()
  }

  async function refreshMessages({ since } = {}) {
    const roomId = getRoomId()
    if (!roomId) return
    const PAGE_SIZE = 50
    try {
      if (since) {
        // Paginate to catch up on ALL missed messages during WS outage.
        // Loop until a page returns fewer than PAGE_SIZE results (no more pages).
        let cursor = since
        let totalMerged = 0

        do {
          const m = await fetchMessages(roomId, { limit: PAGE_SIZE, since: cursor })
          const page = Array.isArray(m) ? m : (m.messages || [])
          if (page.length === 0) break

          // Merge page into existing messages, dedup by id
          const existingIds = new Set(messages.value.map(x => x.id))
          const newMsgs = page.filter(x => !existingIds.has(x.id))
          if (newMsgs.length === 0) break  // safety: all dupes → stop (prevents infinite loop)
          if (newMsgs.length > 0) {
            messages.value = [...messages.value, ...newMsgs].sort(
              (a, b) => new Date(a.created_at) - new Date(b.created_at)
            )
            totalMerged += newMsgs.length
          }

          if (page.length < PAGE_SIZE) break
          // Advance cursor to last message's timestamp for next page
          cursor = page[page.length - 1].created_at
        } while (true)

        if (totalMerged > 0) {
          console.log(`[Store] Merged ${totalMerged} missed messages via since=${since}`)
        }
      } else {
        // Initial load: single fetch, replace messages
        // (history depth of PAGE_SIZE is sufficient for startup)
        const m = await fetchMessages(roomId, { limit: PAGE_SIZE })
        const fetched = Array.isArray(m) ? m : (m.messages || [])
        messages.value = fetched
      }

      // Update lastMessageAt to the most recent message timestamp.
      // messages are sorted ascending by created_at, so last element = latest.
      if (messages.value.length > 0) {
        const latest = messages.value[messages.value.length - 1].created_at
        if (!lastMessageAt.value || latest > lastMessageAt.value) {
          lastMessageAt.value = latest
        }
      }
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
          // Track latest message timestamp
          if (data.created_at && (!lastMessageAt.value || data.created_at > lastMessageAt.value)) {
            lastMessageAt.value = data.created_at
          }
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

      case 'agent.message': {
        // DM received via monitor WS — normalise and append to dms
        if (!data) break
        const fromId = data.from || data.from_agent_id || data.sender_agent_id || 'unknown'
        const toId = data.to || data.to_agent_id || ''
        const normalised = {
          id: data.id,
          from_agent_id: fromId,
          to_agent_id: toId,
          payload: data.payload,
          created_at: data.timestamp || data.created_at || new Date().toISOString(),
        }
        // Deduplicate and append
        const key = fromId
        const existing = dms.value[key] || []
        if (!existing.find(m => m.id === normalised.id)) {
          accumulateDMs([normalised])
        }
        lastDmEvent.value = normalised
        break
      }

      default:
        // Unknown event type — ignore silently
        break
    }
  }

  // ── WebSocket lifecycle ───────────────────────────────────────────────────
  const { connected: wsStatus, connect: wsConnect, disconnect: wsDisconnect } = useWebSocket(
    handleWsEvent,
    {
      onReconnect: () => {
        // Catch up on any messages missed during WS outage
        refreshMessages({ since: lastMessageAt.value })
      },
    }
  )

  // Inbox WebSocket — real-time DMs for the human user
  const lastInboxEvent = ref(null)
  // Monitor WS agent.message — real-time DMs for agent-agent view
  const lastDmEvent = ref(null)

  function handleInboxWsMessage(msg) {
    const fromId = msg.from || msg.from_agent_id || msg.sender_agent_id || 'unknown'
    const normalised = {
      id: msg.id,
      from_agent_id: fromId,
      to_agent_id: msg.to || getHumanAgentId(),
      payload: msg.payload,
      created_at: msg.timestamp || new Date().toISOString(),
    }
    accumulateDMs([normalised])
    lastInboxEvent.value = normalised  // notify DMView
  }

  const { connect: inboxWsConnect, disconnect: inboxWsDisconnect } = useInboxWS(
    handleInboxWsMessage,
    {
      onReconnect: () => {
        // Flush any offline messages that arrived while disconnected
        refreshDMs()
      },
    }
  )

  // Light fallback: re-sync agents + tasks every 30s (WS doesn't cover these)
  const FALLBACK_INTERVAL = POLL_INTERVAL * 6 // 30s

  let fallbackTimer = null

  function startPolling() {
    // Guard: stop existing timers/WS before restarting to prevent stacking
    if (fallbackTimer) {
      clearInterval(fallbackTimer)
      fallbackTimer = null
    }

    // Initial full data load via HTTP
    // Refresh room_id first (handles opaque UUID migration from user:xxx:default)
    refreshRoomId().then(() => {
      refresh()
      // Start Room WebSocket after room_id is confirmed
      wsConnect()
    })

    // Start Inbox WebSocket for real-time DMs (only if humanAgentId is set)
    if (getHumanAgentId()) {
      inboxWsConnect()
    }

    // Light fallback: keep agents fresh (tasks managed by TaskBoard component)
    fallbackTimer = setInterval(() => {
      refreshAgents()
    }, FALLBACK_INTERVAL)
  }

  function stopPolling() {
    wsDisconnect()
    inboxWsDisconnect()
    if (fallbackTimer) {
      clearInterval(fallbackTimer)
      fallbackTimer = null
    }
  }

  return {
    agents, tasks, messages, loading, error,
    wsConnected: wsStatus,
    humanAgentId,
    isHuman,
    selectedAgentId, selectedAgent, selectAgent,
    activeDmAgentId, openDM,
    dms, addOutgoingDM, mergeDMs,
    lastInboxEvent,
    lastDmEvent,
    refresh, refreshAgents, refreshTasks, refreshMessages, refreshDMs, refreshRoomId,
    startPolling, stopPolling,
    // Allow components to connect inbox WS after humanAgentId is set
    connectInboxWS: inboxWsConnect,
  }
})
