<template>
  <div class="bg-white rounded-xl shadow p-4 h-96 flex flex-col">
    <div class="font-semibold text-gray-700 mb-3">消息流</div>
    <div class="flex-1 overflow-y-auto space-y-2 pr-1" ref="scrollEl">
      <div
        v-for="msg in sorted"
        :key="msg.id"
        class="text-sm"
      >
        <span class="text-xs text-indigo-400 font-mono mr-1">
          {{ shortId(msg.sender_agent_id) }}
        </span>
        <span class="text-gray-500 text-xs mr-2">{{ formatTime(msg.created_at) }}</span>
        <span class="text-gray-800 whitespace-pre-wrap">{{ msg.content }}</span>
      </div>
      <div v-if="!sorted.length" class="text-center text-gray-400 py-8">No messages</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { usePincerStore } from '../stores/pincer'

const store = usePincerStore()
const scrollEl = ref(null)

const sorted = computed(() =>
  [...store.messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
)

watch(() => store.messages.length, async () => {
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
})

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString()
}

function shortId(id) {
  if (!id) return 'system'
  return id.slice(0, 8)
}
</script>
