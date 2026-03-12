<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col h-full">
    <div class="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between gap-2">
      <span>{{ $t('feed.title') }}</span>
      <!-- Search toggle -->
      <button @click="searchOpen = !searchOpen; searchOpen || clearSearch()" class="text-xs text-gray-400 hover:text-indigo-500 transition">🔍</button>
    </div>

    <!-- Search bar -->
    <div v-if="searchOpen" class="mb-3 flex gap-2">
      <input
        v-model="searchQ"
        @keydown.enter="doSearch"
        @keydown.escape="clearSearch(); searchOpen = false"
        :placeholder="$t('feed.search_placeholder')"
        class="flex-1 text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
      <button @click="doSearch" class="text-xs px-2 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">{{ $t('feed.search') }}</button>
      <button @click="clearSearch(); searchOpen = false" class="text-xs px-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
    </div>

    <!-- Search results -->
    <div v-if="searchResults !== null" class="flex-1 overflow-y-auto space-y-2 pr-1">
      <div v-if="searchLoading" class="text-center text-gray-400 py-8 text-sm">{{ $t('feed.searching') }}</div>
      <div v-else-if="!searchResults.length" class="text-center text-gray-400 py-8 text-sm">{{ $t('feed.no_results') }}</div>
      <template v-else>
        <div
          v-for="msg in searchResults"
          :key="msg.id"
          class="flex gap-2 items-start"
        >
          <div :class="['w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', avatarColor(msg.sender_agent_id)]">
            {{ (agentName(msg.sender_agent_id) || '?')[0].toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-1.5 mb-0.5">
              <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">{{ agentName(msg.sender_agent_id) }}</span>
              <span class="text-[10px] text-gray-400">{{ formatTime(msg.created_at) }}</span>
            </div>
            <p class="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1.5">{{ msg.content }}</p>
          </div>
        </div>
        <div v-if="searchHasMore" class="text-center pt-2">
          <button @click="loadMoreSearch" class="text-xs text-indigo-500 hover:text-indigo-700 px-3 py-1 border border-indigo-200 dark:border-indigo-700 rounded-full">{{ $t('feed.load_more', { total: searchTotal }) }}</button>
        </div>
      </template>
    </div>

    <!-- Normal message list -->
    <div v-else class="flex-1 overflow-y-auto space-y-2 pr-1" ref="scrollEl">
      <div v-if="!sorted.length" class="text-center text-gray-400 py-8 text-sm">{{ $t('feed.no_messages') }}</div>

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
            <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{{ agentName(msg.sender_agent_id) }}</span>
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
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 italic rounded-bl-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm',
            ]"
            v-html="renderMd(msg.content)"
          />
        </div>
      </div>
    </div>  <!-- end normal message list -->
    <!-- Chat input / perspective indicator -->
    <div class="mt-3 relative">
      <!-- AI perspective: read-only notice -->
      <div
        v-if="isAiPerspective"
        class="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2 text-center"
      >
        🐾 {{ $t('feed.perspective_readonly', { name: store.selectedAgent?.name || store.selectedAgent?.id?.slice(0,8) }) }}
      </div>

      <!-- No identity: prompt setup -->
      <div v-else-if="!currentRoomSender" class="mt-0">
        <button
          @click="$emit('need-profile')"
          class="w-full text-xs text-indigo-500 hover:text-indigo-700 border border-dashed border-indigo-200 dark:border-indigo-700 hover:border-indigo-400 rounded-xl py-2 transition"
        >
          {{ $t('feed.need_profile') }}
        </button>
      </div>

      <!-- Human sender: show input -->
      <div v-else class="relative">
      <!-- @mention dropdown -->
      <div
        v-if="mentionList.length"
        class="absolute bottom-full mb-1 left-0 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-20 overflow-hidden"
      >
        <button
          v-for="agent in mentionList"
          :key="agent.id"
          @mousedown.prevent="insertMention(agent)"
          class="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-left text-sm"
        >
          <span v-if="agent.id === '__all__'" class="text-xs">📢</span>
          <span v-else-if="agent.type === 'human'" class="text-blue-400 text-xs">👤</span>
          <span v-else class="text-gray-300 text-xs">🐾</span>
          <span class="text-gray-800 dark:text-gray-200 font-medium">{{ agent._label || agent.name || agent.id.slice(0, 8) }}</span>
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
          :placeholder="$t('feed.input_placeholder')"
          class="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
        ></textarea>
        <button
          @click="sendMessage"
          :disabled="!inputText.trim() || sending"
          class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white px-4 rounded-xl text-sm transition flex-shrink-0 self-stretch"
        >
          {{ sending ? $t('feed.sending') : $t('feed.send') }}
        </button>
      </div>
      </div>  <!-- end human-sender block -->
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import { usePincerStore } from '../stores/pincer'
import { sendRoomMessage, searchRoomMessages } from '../api'
import { getRoomId } from '../config'

const { t } = useI18n()

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
  if (!id) return t('feed.system')
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

const DRAFT_KEY = 'pincer_room_draft'
const inputText = ref(localStorage.getItem(DRAFT_KEY) || '')
const sending = ref(false)
const chatInputEl = ref(null)
const mentionList = ref([])

watch(inputText, (val) => localStorage.setItem(DRAFT_KEY, val))

// @mention detection
const allMentionEntry = computed(() => ({
  id: '__all__', name: 'all', _label: t('feed.all_mention_label')
}))

function onInput(e) {
  const val = inputText.value
  const cursor = e.target.selectionStart
  const before = val.slice(0, cursor)
  const atIdx = before.lastIndexOf('@')
  if (atIdx === -1) { mentionList.value = []; return }
  const query = before.slice(atIdx + 1).toLowerCase()
  if (query.includes(' ')) { mentionList.value = []; return }
  const agentMatches = store.agents
    .filter(a => (a.name || a.id).toLowerCase().includes(query))
    .slice(0, 5)
  const allMatch = 'all'.includes(query) || '所有人'.includes(query)
  mentionList.value = allMatch ? [allMentionEntry.value, ...agentMatches] : agentMatches
}

function insertMention(agent) {
  const name = agent.id === '__all__' ? 'all' : (agent.name || agent.id.slice(0, 8))
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
    localStorage.removeItem(DRAFT_KEY)
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

// Search
const searchOpen = ref(false)
const searchQ = ref('')
const searchResults = ref(null)
const searchTotal = ref(0)
const searchOffset = ref(0)
const searchLoading = ref(false)
const SEARCH_LIMIT = 20
const searchHasMore = computed(() => searchResults.value && searchResults.value.length < searchTotal.value)

async function doSearch() {
  const q = searchQ.value.trim()
  if (!q) return
  searchLoading.value = true
  searchOffset.value = 0
  searchResults.value = []
  try {
    const data = await searchRoomMessages(getRoomId(), q, { limit: SEARCH_LIMIT, offset: 0 })
    searchResults.value = data.items || []
    searchTotal.value = data.total || 0
  } finally {
    searchLoading.value = false
  }
}

async function loadMoreSearch() {
  const q = searchQ.value.trim()
  if (!q || searchLoading.value) return
  searchLoading.value = true
  try {
    const nextOffset = searchOffset.value + SEARCH_LIMIT
    const data = await searchRoomMessages(getRoomId(), q, { limit: SEARCH_LIMIT, offset: nextOffset })
    searchResults.value = [...(searchResults.value || []), ...(data.items || [])]
    searchTotal.value = data.total || 0
    searchOffset.value = nextOffset
  } finally {
    searchLoading.value = false
  }
}

function clearSearch() {
  searchQ.value = ''
  searchResults.value = null
  searchTotal.value = 0
  searchOffset.value = 0
}
</script>
