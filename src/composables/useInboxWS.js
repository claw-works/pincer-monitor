import { ref, onUnmounted } from 'vue'
import { getPincerBase, getApiKey } from '../config'

/**
 * WebSocket composable for the human-participated inbox (single chat / DMs).
 *
 * Connects to: GET /api/v1/inbox/ws?api_key=<key>
 *
 * Server pushes Hub messages as hub.Message JSON objects:
 *   { id, type, from, to, payload, timestamp, ... }
 *
 * The connection flushes pending offline messages on connect.
 *
 * Usage:
 *   const { connected, connect, disconnect } = useInboxWS(onMessage, { onReconnect })
 */
export function useInboxWS(onMessage, { onReconnect } = {}) {
  const connected = ref(false)
  let ws = null
  let reconnectTimer = null
  let stopped = false
  let hasConnectedBefore = false
  let reconnectDelay = 5000

  function getWsUrl() {
    const base = getPincerBase()
    const apiKey = getApiKey()
    const wsBase = base.replace(/^http/, 'ws')
    return `${wsBase}/api/v1/inbox/ws?api_key=${encodeURIComponent(apiKey)}`
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    stopped = false

    try {
      ws = new WebSocket(getWsUrl())
    } catch (e) {
      console.warn('[InboxWS] Failed to create WebSocket:', e)
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      connected.value = true
      reconnectDelay = 5000
      console.log('[InboxWS] Connected')
      clearTimeout(reconnectTimer)

      if (hasConnectedBefore) {
        console.log('[InboxWS] Reconnected')
        onReconnect?.()
      }
      hasConnectedBefore = true
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        onMessage && onMessage(msg)
      } catch (e) {
        console.warn('[InboxWS] Failed to parse message:', event.data)
      }
    }

    ws.onerror = (e) => {
      console.warn('[InboxWS] Error', e)
    }

    ws.onclose = (e) => {
      connected.value = false
      console.log(`[InboxWS] Closed (code=${e.code})`)
      if (!stopped) scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer)
    console.log(`[InboxWS] Reconnecting in ${reconnectDelay}ms...`)
    reconnectTimer = setTimeout(() => {
      if (!stopped) connect()
    }, reconnectDelay)
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
