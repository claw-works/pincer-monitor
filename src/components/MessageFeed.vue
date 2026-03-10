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
        :class="['flex items-start gap-2', isMine(msg) ? 'flex-row-reverse' : 'flex-row']"
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
    <!-- Chat input / perspective indicator -->
    <div class="mt-3 relative">
      <!-- AI perspective: read-only notice -->
      <div
        v-if="isAiPerspective"
        class="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 text-center"
      >
        🐾 {{ store.selectedAgent?.name || store.selectedAgent?.id?.slice(0,8) }} 视角（只读）
      </div>

      <!-- No identity: prompt setup -->
      <div v-else-if="!currentRoomSender" class="mt-0">
        <button
          @click="$emit('need-profile')"
          class="w-full text-xs text-indigo-500 hover:text-indigo-700 border border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl py-2 transition"
        >
          请先设置身份才能发消息 →
        </button>
      </div>

      <!-- Human sender: show input -->
      <div v-else class="relative">
      <!-- @mention dropdown -->
      <div
        v-if="mentionList.length"
        class="absolute bottom-full mb-1 left-0 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden"
      >
        <button
          v-for="agent in mentionList"
          :key="agent.id"
          @mousedown.prevent="insertMention(agent)"
          class="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 text-left text-sm"
        >
          <span v-if="agent.type === 'human'" class="text-blue-400 text-xs">👤</span>
          <span v-else class="text-gray-300 text-xs">🐾</span>
          <span class="text-gray-800 font-medium">{{ agent.name || agent.id.slice(0, 8) }}</span>
        </button>
      </div>
      <div class="flex gap-2 items-end">
        <textarea
          ref="chatInputEl"
          v-model="inputText"
          @input="onInput"
          @keydown.escape="mentionList = []"
          @keydown.tab.prevent="mentionList.length && insertMention(mentionList[0])"
          rows="2"
          placeholder="发消息到 Room… (@提及)"
          class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
        ></textarea>
        <button
          @click="sendMessage"
          :disabled="!inputText.trim() || sending"
          class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white px-4 rounded-xl text-sm transition flex-shrink-0 self-stretch"
        >
          {{ sending ? '…' : '发送' }}
        </button>
      </div>
      </div>  <!-- end human-sender block -->
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
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

const emit = defineEmits(['need-profile'])
const store = usePincerStore()
// Messages are delivered via WebSocket (store.startPolling → wsConnect).
// No polling needed here.
const scrollEl = ref(null)

// Perspective-aware sender logic
const isAiPerspective = computed(() => {
  if (!store.selectedAgentId) return false
  const agent = store.agents.find(a => a.id === store.selectedAgentId)
  return agent?.type !== 'human'
})

// Effective room sender: selected human perspective, or fallback to registered human
const currentRoomSender = computed(() => {
  if (store.selectedAgentId) {
    const agent = store.agents.find(a => a.id === store.selectedAgentId)
    return agent?.type === 'human' ? store.selectedAgentId : null
  }
  return store.humanAgentId || null
})

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

function scrollToBottom() {
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}
onMounted(async () => {
  await nextTick()
  scrollToBottom()
})
// Watch the id of the last message so we scroll whether the change comes from
// WS push, HTTP poll, or an outgoing message being appended.
const lastMsgId = computed(() => {
  const msgs = store.messages
  return msgs.length ? msgs[msgs.length - 1].id : null
})
watch(lastMsgId, async () => {
  await nextTick()
  scrollToBottom()
})

function isMine(msg) {
  const myId = currentRoomSender.value || store.selectedAgentId
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
const chatInputEl = ref(null)
const mentionList = ref([])

// @mention detection
function onInput(e) {
  const val = inputText.value
  const cursor = e.target.selectionStart
  // Find last '@' before cursor
  const before = val.slice(0, cursor)
  const atIdx = before.lastIndexOf('@')
  if (atIdx === -1) { mentionList.value = []; return }
  const query = before.slice(atIdx + 1).toLowerCase()
  // Only show if no space in query (still typing the mention)
  if (query.includes(' ')) { mentionList.value = []; return }
  mentionList.value = store.agents
    .filter(a => (a.name || a.id).toLowerCase().includes(query))
    .slice(0, 6)
}

function insertMention(agent) {
  const name = agent.name || agent.id.slice(0, 8)
  const val = inputText.value
  const el = chatInputEl.value
  const cursor = el ? el.selectionStart : val.length
  const before = val.slice(0, cursor)
  const after = val.slice(cursor)
  const atIdx = before.lastIndexOf('@')
  inputText.value = before.slice(0, atIdx) + '@' + name + ' ' + after
  mentionList.value = []
  // Restore focus + cursor after inserted text
  nextTick(() => {
    if (el) {
      const pos = atIdx + name.length + 2
      el.focus()
      el.setSelectionRange(pos, pos)
    }
  })
}

async function sendMessage() {
  const text = inputText.value.trim()
  const sender = currentRoomSender.value
  if (!text || !sender) return
  sending.value = true
  mentionList.value = []
  try {
    await sendRoomMessage(getRoomId(), sender, text)
    inputText.value = ''
    // Refresh to pick up the sent message if WS hasn't pushed it yet,
    // then explicitly scroll to bottom regardless of whether length changed.
    await store.refreshMessages()
    await nextTick()
    scrollToBottom()
  } catch (e) {
    console.error('send failed', e)
  } finally {
    sending.value = false
  }
}
</script>
