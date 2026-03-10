import { onMounted, onUnmounted } from 'vue'

/**
 * Start polling fn() immediately on mount, repeat every intervalMs.
 * Automatically clears on component unmount.
 */
export function usePolling(fn, intervalMs = 5000) {
  let timer = null

  onMounted(() => {
    fn()
    timer = setInterval(fn, intervalMs)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })
}
