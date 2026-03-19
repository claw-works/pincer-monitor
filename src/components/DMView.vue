<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow flex flex-col h-full overflow-hidden">

    <!-- Right: 消息区 -->
    <div class="flex-1 flex flex-col min-w-0">

      <!-- Header -->
      <div class="border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
          <span v-if="agentAId && selectedPartnerId">
            {{ agentName(agentAId) }} ↔ {{ agentName(selectedPartnerId) }}
          </span>
          <span v-else class="text-gray-400">{{ $t('dm.select_both') }}</span>
        </span>
        <span v-if="loadingHistory" class="text-xs text-gray-400 ml-auto">{{ $t('dm.loading') }}</span>
        <button @click="dmSearchOpen = !dmSearchOpen; dmSearchOpen || clearDmSearch()" class="text-xs text-gray-400 hover:text-indigo-500 ml-auto transition">🔍</button>
      </div>

      <!-- DM Search bar -->
      <div v-if="dmSearchOpen" class="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex gap-2">
        <input
          v-model="dmSearchQ"
          @keydown.enter="doDmSearch"
          @keydown.escape="clearDmSearch(); dmSearchOpen = false"
          :placeholder="$t('dm.search_placeholder')"
          class="flex-1 text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button @click="doDmSearch" class="text-xs px-2 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">{{ $t('dm.search') }}</button>
        <button @click="clearDmSearch(); dmSearchOpen = false" class="text-xs px-2 text-gray-400 dark:text-gray-500">✕</button>
      </div>

      <!-- Messages (search or normal) -->
      <div
        class="flex-1 overflow-y-auto p-4 space-y-3"
        ref="convoEl"
        @scroll="onConvoScroll"
      >
        <!-- Load more indicator -->
        <div v-if="hasMoreHistory && localMsgs.length" class="flex justify-center py-2 flex-shrink-0">
          <button
            v-if="!loadingMore"
            @click="loadMoreHistory"
            class="text-xs text-indigo-500 hover:text-indigo-700 border border-indigo-200 dark:border-indigo-700 px-3 py-1 rounded-full transition"
          >↑ {{ $t('dm.load_more_history') }}</button>
          <span v-else class="text-xs text-gray-400">{{ $t('dm.loading') }}</span>
        </div>
        <!-- Search results -->
        <template v-if="dmSearchResults !== null">
          <div v-if="dmSearchLoading" class="text-center text-gray-400 py-8 text-sm">{{ $t('dm.searching') }}</div>
          <div v-else-if="!dmSearchResults.length" class="text-center text-gray-400 py-8 text-sm">{{ $t('dm.no_results') }}</div>
          <template v-else>
            <div v-for="msg in dmSearchResults" :key="msg.id" class="flex gap-2 items-start">
              <div :class="['w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', avatarColor(msg.from_agent_id)]">
                {{ (agentName(msg.from_agent_id) || '?')[0].toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-1.5 mb-0.5">
                  <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">{{ agentName(msg.from_agent_id) }}</span>
                  <span class="text-[10px] text-gray-400">{{ formatTime(msg.created_at) }}</span>
                </div>
                <p class="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2">{{ msg.payload?.text }}</p>
              </div>
            </div>
            <div v-if="dmSearchHasMore" class="text-center pt-2">
              <button @click="loadMoreDmSearch" class="text-xs text-indigo-500 hover:text-indigo-700 px-3 py-1 border border-indigo-200 dark:border-indigo-700 rounded-full">{{ $t('dm.load_more', { total: dmSearchTotal }) }}</button>
            </div>
          </template>
        </template>
        <!-- Normal conversation -->
        <template v-else>
        <div v-if="!agentAId" class="text-center text-gray-400 text-sm py-12">
          {{ $t('dm.need_perspective') }}
        </div>
        <div v-else-if="!selectedPartnerId" class="text-center text-gray-400 text-sm py-12">
          {{ $t('dm.select_partner') }}
        </div>
        <div v-else-if="loadingHistory" class="text-center text-gray-400 text-sm py-12">{{ $t('dm.loading_messages') }}</div>
        <div v-else-if="!convoMsgs.length" class="text-center text-gray-400 text-sm py-12">{{ $t('dm.no_messages') }}</div>
        <div
          v-else
          v-for="msg in convoMsgs"
          :key="msg.id"
          :class="['flex items-end gap-2', isMyMsg(msg) ? 'flex-row-reverse' : 'flex-row']"
        >
          <div
            :class="[
              'max-w-[78%] px-3 py-2 rounded-2xl text-sm break-words leading-relaxed',
              isMyMsg(msg)
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm',
            ]"
          >
            <div v-if="!isMyMsg(msg)" class="text-xs font-semibold text-indigo-500 dark:text-indigo-400 mb-0.5">
              {{ agentName(msg.from_agent_id) }}
            </div>
            <div>{{ msg.payload?.text || JSON.stringify(msg.payload || '') }}</div>
            <div class="text-xs opacity-50 mt-1 text-right">{{ formatTime(msg.created_at) }}</div>
          </div>
        </div>
        </template>  <!-- end normal conversation -->
      </div>

      <!-- Send box — human only -->
      <div class="border-t border-gray-100 dark:border-gray-700 p-3 flex-shrink-0">
        <div v-if="!agentAId" class="text-xs text-gray-400 text-center py-1">{{ $t('dm.need_perspective_action') }}</div>
        <div v-else-if="!isHumanSender" class="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 text-center">
          {{ $t('dm.ai_perspective_warning') }}
        </div>
        <div v-else-if="selectedPartnerId" class="flex gap-2">
          <textarea
            v-model="dmInput"
            rows="1"
            :placeholder="$t('dm.input_placeholder')"
            class="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none min-h-[44px] max-h-32"
            style="field-sizing: content"
            @keydown.enter.exact="onDmEnter"
            @keydown.shift.enter.exact.prevent="dmInput += '\n'"
            @compositionstart="dmComposing = true"
            @compositionend="dmComposing = false"
          ></textarea>
          <button
            @click="sendDmMsg"
            :disabled="!dmInput.trim() || dmSending"
            class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white w-11 h-11 rounded-2xl text-sm transition flex-shrink-0 flex items-center justify-center"
            :title="$t('dm.send')"
          >
            <svg v-if="dmSending" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </button>
        </div>
        <div v-else class="text-xs text-gray-300 dark:text-gray-500 text-center py-1">{{ $t('dm.select_to_send') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePincerStore } from '../stores/pincer'
import { fetchConversation, sendDM, searchDMMessages } from '../api'

const props = defineProps({
  initialPartnerId: { type: String, default: '' }
})

const { t } = useI18n()
const store = usePincerStore()

// Agent A: respects global perspective (selectedAgentId) first, falls back to humanAgentId
const agentAId = ref(store.selectedAgentId || store.humanAgentId || '')
watch(() => store.humanAgentId, (id) => { if (!agentAId.value && id) agentAId.value = id })
watch(() => store.selectedAgentId, (id) => { agentAId.value = id || store.humanAgentId || '' })

const selectedPartnerId = ref(props.initialPartnerId || null)
// Watch for parent navigation (clicking different agent in sidebar)
watch(() => props.initialPartnerId, (id) => { if (id) selectedPartnerId.value = id })

const convoEl = ref(null)
// DM draft: persist per conversation pair
function draftKey(a, b) {
  if (!a || !b) return null
  return `pincer_dm_draft_${[a, b].sort().join('_')}`
}

const dmInput = ref('')
const dmComposing = ref(false)

function onDmEnter(e) {
  if (dmComposing.value) return
  e.preventDefault()
  sendDmMsg()
}

// Restore draft when conversation changes
watch([() => agentAId.value, () => selectedPartnerId.value], ([a, b]) => {
  const key = draftKey(a, b)
  dmInput.value = key ? (localStorage.getItem(key) || '') : ''
})

// Save draft as user types
watch(dmInput, (val) => {
  const key = draftKey(agentAId.value, selectedPartnerId.value)
  if (key) localStorage.setItem(key, val)
})
const dmSending = ref(false)
const loadingHistory = ref(false)
const loadingMore = ref(false)
const hasMoreHistory = ref(true)
const PAGE_SIZE = 50
const localMsgs = ref([])

const humanAgents = computed(() => store.agents.filter(a => a.type === 'human'))
const aiAgents = computed(() => store.agents.filter(a => a.type !== 'human'))

const isHumanSender = computed(() => {
  if (!agentAId.value) return false
  if (agentAId.value === store.humanAgentId) return true
  return store.agents.find(a => a.id === agentAId.value)?.type === 'human'
})

// Partner list: all agents except agent A
const partnerList = computed(() => {
  const me = agentAId.value
  const others = store.agents.filter(a => a.id !== me)
  return [...others.filter(a => a.type === 'human'), ...others.filter(a => a.type !== 'human')]
})

// Open DM from AgentCards click
watch(() => store.activeDmAgentId, (id) => { if (id) selectedPartnerId.value = id })

// Load conversation when both sides are set
watch([agentAId, selectedPartnerId], ([a, b]) => {
  if (a && b) loadConversation(a, b)
  else localMsgs.value = []
})

async function loadConversation(a, b) {
  loadingHistory.value = true
  loadingMore.value = false
  hasMoreHistory.value = true
  localMsgs.value = []
  try {
    const msgs = await fetchConversation(a, b, { limit: PAGE_SIZE })
    const arr = Array.isArray(msgs) ? msgs : (msgs.messages || [])
    arr.sort((x, y) => new Date(x.created_at) - new Date(y.created_at))
    localMsgs.value = arr
    if (arr.length < PAGE_SIZE) hasMoreHistory.value = false
  } catch (e) {
    console.warn('Failed to load conversation:', e.message)
  } finally {
    loadingHistory.value = false
    await nextTick()
    scrollToBottom()
  }
}

async function loadMoreHistory() {
  if (loadingMore.value || !hasMoreHistory.value) return
  const a = agentAId.value, b = selectedPartnerId.value
  if (!a || !b || !localMsgs.value.length) return
  loadingMore.value = true
  const oldest = localMsgs.value[0]
  const scrollEl = convoEl.value
  const prevScrollHeight = scrollEl?.scrollHeight || 0
  try {
    const msgs = await fetchConversation(a, b, { limit: PAGE_SIZE, before: oldest.created_at })
    const arr = Array.isArray(msgs) ? msgs : (msgs.messages || [])
    arr.sort((x, y) => new Date(x.created_at) - new Date(y.created_at))
    if (!arr.length) { hasMoreHistory.value = false; return }
    // Prepend older messages and restore scroll position
    localMsgs.value = [...arr, ...localMsgs.value]
    if (arr.length < PAGE_SIZE) hasMoreHistory.value = false
    await nextTick()
    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeight
  } catch (e) {
    console.warn('Failed to load more:', e.message)
  } finally {
    loadingMore.value = false
  }
}

const convoMsgs = computed(() => localMsgs.value)

watch(convoMsgs, async () => { await nextTick(); scrollToBottom() })

function scrollToBottom() {
  if (convoEl.value) convoEl.value.scrollTop = convoEl.value.scrollHeight
}

function onConvoScroll() {
  if (!convoEl.value) return
  // Trigger load more when scrolled to within 40px of top
  if (convoEl.value.scrollTop < 40 && hasMoreHistory.value && !loadingMore.value) {
    loadMoreHistory()
  }
}

function isMyMsg(msg) { return msg.from_agent_id === agentAId.value }

function agentName(id) {
  if (!id) return t('dm.unknown')
  return store.agents.find(a => a.id === id)?.name || id.slice(0, 8)
}

const AVATAR_COLORS = [
  'bg-pink-400 text-white', 'bg-purple-400 text-white',
  'bg-blue-400 text-white', 'bg-teal-400 text-white',
  'bg-orange-400 text-white',
]

function avatarColor(id) {
  if (!id) return 'bg-gray-300 text-gray-600'
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function sendDmMsg() {
  const text = dmInput.value.trim()
  const a = agentAId.value
  const b = selectedPartnerId.value
  if (!text || !a || !b) return
  dmSending.value = true
  try {
    await sendDM(a, b, text)
    localMsgs.value = [...localMsgs.value, {
      id: `local-${Date.now()}`,
      from_agent_id: a,
      to_agent_id: b,
      payload: { text },
      created_at: new Date().toISOString(),
    }]
    dmInput.value = ''
    const key = draftKey(agentAId.value, selectedPartnerId.value)
    if (key) localStorage.removeItem(key)
  } catch (e) {
    console.error('DM failed:', e)
  } finally {
    dmSending.value = false
  }
}

// Real-time DM updates via monitor WS (no HTTP polling needed)
// - Human sender: inbox WS → store.lastInboxEvent → reload conversation
// - Agent-agent: monitor WS → store.lastDmEvent → append message incrementally

function appendDmMessage(msg) {
  // Append a single DM to the local conversation without full reload
  const fromId = msg.from_agent_id || msg.from || 'unknown'
  const toId = msg.to_agent_id || msg.to || ''
  const a = agentAId.value
  const b = selectedPartnerId.value
  if (!a || !b) return
  const involves = (fromId === a || fromId === b) && (toId === a || toId === b)
  if (!involves) return
  // Deduplicate
  const key = fromId === a ? b : a
  const existing = store.dms[key] || []
  if (existing.find(m => m.id === msg.id)) return
  store.mergeDMs(key, [msg])
}

// Human sender: react to inbox WS events → full reload to get server-ordered messages
watch(() => store.lastInboxEvent, (evt) => {
  if (!evt || !isHumanSender.value || !selectedPartnerId.value) return
  const relevant = evt.from_agent_id === selectedPartnerId.value || evt.to_agent_id === selectedPartnerId.value
  if (relevant) loadConversation(agentAId.value, selectedPartnerId.value)
})

// Agent-agent: react to monitor WS agent.message events → append incrementally
watch(() => store.lastDmEvent, (evt) => {
  if (!evt || isHumanSender.value) return
  appendDmMessage(evt)
})

onUnmounted(() => {/* cleanup handled by store WS */})



// DM Search
const dmSearchOpen = ref(false)
const dmSearchQ = ref('')
const dmSearchResults = ref(null)
const dmSearchTotal = ref(0)
const dmSearchOffset = ref(0)
const dmSearchLoading = ref(false)
const DM_SEARCH_LIMIT = 20
const dmSearchHasMore = computed(() => dmSearchResults.value && dmSearchResults.value.length < dmSearchTotal.value)

async function doDmSearch() {
  const q = dmSearchQ.value.trim()
  if (!q || !agentAId.value || !selectedPartnerId.value) return
  dmSearchLoading.value = true
  dmSearchOffset.value = 0
  dmSearchResults.value = []
  try {
    const data = await searchDMMessages(agentAId.value, selectedPartnerId.value, q, { limit: DM_SEARCH_LIMIT, offset: 0 })
    dmSearchResults.value = data.items || []
    dmSearchTotal.value = data.total || 0
  } finally {
    dmSearchLoading.value = false
  }
}

async function loadMoreDmSearch() {
  const q = dmSearchQ.value.trim()
  if (!q || dmSearchLoading.value) return
  dmSearchLoading.value = true
  try {
    const nextOffset = dmSearchOffset.value + DM_SEARCH_LIMIT
    const data = await searchDMMessages(agentAId.value, selectedPartnerId.value, q, { limit: DM_SEARCH_LIMIT, offset: nextOffset })
    dmSearchResults.value = [...(dmSearchResults.value || []), ...(data.items || [])]
    dmSearchTotal.value = data.total || 0
    dmSearchOffset.value = nextOffset
  } finally {
    dmSearchLoading.value = false
  }
}

function clearDmSearch() {
  dmSearchQ.value = ''
  dmSearchResults.value = null
  dmSearchTotal.value = 0
  dmSearchOffset.value = 0
}
</script>
