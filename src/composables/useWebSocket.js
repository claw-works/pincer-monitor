import { ref, onUnmounted } from 'vue'
import { getPincerBase, getApiKey } from '../config'

/**
 * WebSocket composable for Pincer hub real-time events.
 *
 * Events emitted by server:
 *   room.message      — new room message
 *   task.update       — task status changed
 *   task.result       — task completed with result
 *   agent.online      — agent came online
 *   agent.heartbeat   — agent heartbeat
 *
 * Usage:
 *   const { connected, connect, disconnect } = useWebSocket(onEvent)
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
    // Convert http(s) → ws(s)
    const wsBase = base.replace(/^http/, 'ws')
    return `${wsBase}/api/v1/ws?api_key=${encodeURIComponent(apiKey)}`
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    stopped = false

    try {
      ws = new WebSocket(getWsUrl())
    } catch (e) {
      console.warn('[WS] Failed to create WebSocket:', e)
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      connected.value = true
      reconnectDelay = 5000 // reset backoff on successful connect
      console.log('[WS] Connected')
      clearTimeout(reconnectTimer)

      if (hasConnectedBefore) {
        // Reconnect: notify store to catch up on missed messages
        console.log('[WS] Reconnected — triggering catch-up')
        onReconnect?.()
      }
      hasConnectedBefore = true
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onEvent && onEvent(data)
      } catch (e) {
        console.warn('[WS] Failed to parse message:', event.data)
      }
    }

    ws.onerror = (e) => {
      console.warn('[WS] Error', e)
    }

    ws.onclose = (e) => {
      connected.value = false
      console.log(`[WS] Closed (code=${e.code})`)
      if (!stopped) scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer)
    console.log(`[WS] Reconnecting in ${reconnectDelay}ms...`)
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
