<template>
  <div class="bg-white rounded-xl shadow p-4 flex flex-col h-full">
    <div class="font-semibold text-gray-700 mb-3 flex items-center justify-between">
      <span>消息流</span>
      <span v-if="store.selectedAgentId" class="text-xs text-indigo-500">
        以 {{ agentName(store.selectedAgentId) }} 视角查看
      </span>
      <span v-else class="text-xs text-gray-400">点击 Agent 卡片切换视角</span>
    </div>

    <div class="flex-1 overflow-y-auto space-y-2 pr-1" ref="scrollEl">
      <div v-if="!sorted.length" class="text-center text-gray-400 py-8 text-sm">No messages</div>

      <div
        v-for="msg in sorted"
        :key="msg.id"
        :class="['flex items-end gap-2', isMine(msg) ? 'flex-row-reverse' : 'flex-row']"
      >
        <!-- Avatar (others only) -->
        <div
          v-if="!isMine(msg)"
          :class="['w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mb-0.5',
                   avatarColor(msg.sender_agent_id)]"
        >
          {{ avatarInitial(msg.sender_agent_id) }}
        </div>

        <!-- Bubble -->
        <div :class="['max-w-[72%] flex flex-col', isMine(msg) ? 'items-end' : 'items-start']">
          <!-- Sender name + time (others only) -->
          <div v-if="!isMine(msg)" class="flex items-center gap-1.5 mb-1">
            <span class="text-xs font-semibold text-indigo-600">{{ agentName(msg.sender_agent_id) }}</span>
            <span class="text-xs text-gray-400">{{ formatTime(msg.created_at) }}</span>
          </div>
          <!-- Time only for mine -->
          <div v-else class="text-xs text-gray-400 mb-1">{{ formatTime(msg.created_at) }}</div>

          <!-- Content — markdown rendered -->
          <div
            :class="[
              'px-3 py-2 rounded-2xl text-sm break-words leading-relaxed prose prose-sm max-w-none',
              isMine(msg)
                ? 'bg-indigo-600 text-white rounded-br-sm prose-invert'
                : isSystem(msg)
                  ? 'bg-gray-100 text-gray-500 italic rounded-bl-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm',
            ]"
            v-html="renderMd(msg.content)"
          />
        </div>
      </div>
    </div>
    <!-- Chat input -->
    <div v-if="store.humanAgentId" class="mt-3 flex gap-2">
      <input
        v-model="inputText"
        @keydown.enter.prevent="sendMessage"
        type="text"
        placeholder="发消息到 Room…"
        class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
      />
      <button
        @click="sendMessage"
        :disabled="!inputText.trim() || sending"
        class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm transition"
      >
        {{ sending ? '…' : '发送' }}
      </button>
    </div>
    <div v-else class="mt-2 text-xs text-gray-400 text-center italic">
      登录后可发消息
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import { usePincerStore } from '../stores/pincer'
import { sendRoomMessage } from '../api'
import { getRoomId } from '../config'

// Configure marked with syntax highlighting
marked.setOptions({
  breaks: true,       // \n → <br>
  gfm: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
})

function renderMd(text) {
  if (!text) return ''
  const raw = marked.parse(text)
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
}

const store = usePincerStore()
const scrollEl = ref(null)

const sorted = computed(() =>
  [...store.messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
)

const agentNameMap = computed(() => {
  const map = {}
  for (const agent of store.agents) {
    if (agent.id && agent.name) map[agent.id] = agent.name
  }
  return map
})

watch(() => store.messages.length, async () => {
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
})

function isMine(msg) {
  const myId = store.humanAgentId || store.selectedAgentId
  return myId && msg.sender_agent_id === myId
}

function isSystem(msg) {
  return !msg.sender_agent_id
}

function agentName(id) {
  if (!id) return 'System'
  return agentNameMap.value[id] || id.slice(0, 8)
}

function avatarInitial(id) {
  if (!id) return 'S'
  const name = agentNameMap.value[id]
  if (name) return name.charAt(0).toUpperCase()
  return id.slice(0, 1).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-pink-400 text-white',
  'bg-purple-400 text-white',
  'bg-blue-400 text-white',
  'bg-teal-400 text-white',
  'bg-orange-400 text-white',
  'bg-rose-400 text-white',
]

function avatarColor(id) {
  if (!id) return 'bg-gray-300 text-gray-600'
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const inputText = ref('')
const sending = ref(false)

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || !store.humanAgentId) return
  sending.value = true
  try {
    await sendRoomMessage(getRoomId(), store.humanAgentId, text)
    inputText.value = ''
    await store.refresh()
  } catch (e) {
    console.error('send failed', e)
  } finally {
    sending.value = false
  }
}
</script>
