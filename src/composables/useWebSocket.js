import { ref, onUnmounted } from 'vue'
import { getPincerBase, getApiKey, getRoomId } from '../config'

/**
 * WebSocket composable for Pincer room chat real-time events.
 *
 * Connects to: GET /api/v1/rooms/{room_id}/ws?api_key=<key>
 *
 * Server pushes MonitorEvent envelopes:
 *   { id, type, payload, timestamp }
 *
 * Event types:
 *   room.message — new room message (payload = message object)
 *
 * Usage:
 *   const { connected, connect, disconnect } = useWebSocket(onEvent, { onReconnect })
 */
export function useWebSocket(onEvent, { onReconnect } = {}) {
  const connected = ref(false)
  let ws = null
  let reconnectTimer = null
  let stopped = false
  let hasConnectedBefore = false
  let reconnectDelay = 5000

  function getWsUrl() {
    const base = getPincerBase()
    const apiKey = getApiKey()
    const roomId = getRoomId()
    // Convert http(s) → ws(s)
    const wsBase = base.replace(/^http/, 'ws')
    // Note: roomId may contain colons (e.g. "user:xxx:default") — do NOT
    // encodeURIComponent the roomId as chi router won't match %3A in path params.
    return `${wsBase}/api/v1/rooms/${roomId}/ws?api_key=${encodeURIComponent(apiKey)}`
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    stopped = false

    try {
      ws = new WebSocket(getWsUrl())
    } catch (e) {
      console.warn('[RoomWS] Failed to create WebSocket:', e)
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      connected.value = true
      reconnectDelay = 5000
      console.log('[RoomWS] Connected')
      clearTimeout(reconnectTimer)

      if (hasConnectedBefore) {
        console.log('[RoomWS] Reconnected — triggering catch-up')
        onReconnect?.()
      }
      hasConnectedBefore = true
    }

    ws.onmessage = (event) => {
      try {
        const envelope = JSON.parse(event.data)
        // Server sends MonitorEvent: { id, type, payload, timestamp }
        // Normalise to { type, data } for the store handler.
        const normalised = {
          type: envelope.type,
          data: envelope.payload ?? envelope.data,
        }
        onEvent && onEvent(normalised)
      } catch (e) {
        console.warn('[RoomWS] Failed to parse message:', event.data)
      }
    }

    ws.onerror = (e) => {
      console.warn('[RoomWS] Error', e)
    }

    ws.onclose = (e) => {
      connected.value = false
      console.log(`[RoomWS] Closed (code=${e.code})`)
      if (!stopped) scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer)
    console.log(`[RoomWS] Reconnecting in ${reconnectDelay}ms...`)
    reconnectTimer = setTimeout(() => {
      if (!stopped) connect()
    }, reconnectDelay)
    // Exponential backoff: 5s → 10s → 20s → max 60s
    reconnectDelay = Math.min(reconnectDelay * 2, 60000)
  }

  function disconnect() {
    stopped = true
    clearTimeout(reconnectTimer)
    if (ws) {
      ws.close()
      ws = null
    }
    connected.value = false
  }

  onUnmounted(() => disconnect())

  return { connected, connect, disconnect }
}
