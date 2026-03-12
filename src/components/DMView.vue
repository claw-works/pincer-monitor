<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow flex h-full overflow-hidden">

    <!-- Left: 选择器 + 伙伴列表 -->
    <div class="w-52 border-r border-gray-100 dark:border-gray-700 flex flex-col flex-shrink-0">

      <!-- Current identity (read-only, controlled by global perspective switcher) -->
      <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 flex items-center gap-2">
        <span class="text-xs text-gray-400">{{ $t('dm.perspective') }}</span>
        <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
          {{ agentAId ? (isHumanSender ? '👤 ' : '🐾 ') + agentName(agentAId) : $t('dm.not_selected') }}
        </span>
      </div>

      <!-- Partner list (Agent B) -->
      <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
        <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide">{{ $t('dm.contacts_title') }}</div>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div v-if="partnerList.length === 0" class="text-xs text-gray-400 italic px-4 py-4">{{ $t('dm.no_agents') }}</div>
        <template v-for="agent in partnerList" :key="agent.id">
          <button
            @click="selectedPartnerId = agent.id"
            :class="[
              'w-full flex items-center gap-2.5 px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition',
              selectedPartnerId === agent.id ? 'bg-indigo-50 dark:bg-indigo-900/30 border-r-2 border-indigo-500' : '',
            ]"
          >
            <div :class="['w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', avatarColor(agent.id)]">
              {{ (agent.name || agent.id).charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex items-center gap-1">
                <span>{{ agent.name || agent.id.slice(0, 8) }}</span>
                <span v-if="agent.type === 'human'" class="text-xs text-blue-400">👤</span>
                <span v-else class="text-xs text-gray-300">🐾</span>
              </div>
              <div class="text-xs mt-0.5">
                <span :class="agent.status === 'online' ? 'text-green-500' : 'text-gray-300 dark:text-gray-500'">●</span>
                <span class="text-gray-400 ml-1">{{ agent.status || 'offline' }}</span>
              </div>
            </div>
          </button>
        </template>
      </div>
    </div>

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
      <div class="flex-1 overflow-y-auto p-4 space-y-3" ref="convoEl">
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
            rows="2"
            :placeholder="$t('dm.input_placeholder')"
            class="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
          ></textarea>
          <button
            @click="sendDmMsg"
            :disabled="!dmInput.trim() || dmSending"
            class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm transition flex-shrink-0"
          >
            {{ dmSending ? '…' : $t('dm.send') }}
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

const { t } = useI18n()
const store = usePincerStore()

// Agent A: independent selector (default to humanAgentId or selectedAgentId)
const agentAId = ref(store.humanAgentId || store.selectedAgentId || '')
watch(() => store.humanAgentId, (id) => { if (!agentAId.value && id) agentAId.value = id })
watch(() => store.selectedAgentId, (id) => { if (id) agentAId.value = id })

const selectedPartnerId = ref(null)
const convoEl = ref(null)
// DM draft: persist per conversation pair
function draftKey(a, b) {
  if (!a || !b) return null
  return `pincer_dm_draft_${[a, b].sort().join('_')}`
}

const dmInput = ref('')

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
  localMsgs.value = []
  try {
    const msgs = await fetchConversation(a, b)
    const arr = Array.isArray(msgs) ? msgs : (msgs.messages || [])
    arr.sort((x, y) => new Date(x.created_at) - new Date(y.created_at))
    localMsgs.value = arr
  } catch (e) {
    console.warn('Failed to load conversation:', e.message)
  } finally {
    loadingHistory.value = false
    await nextTick()
    scrollToBottom()
  }
}

const convoMsgs = computed(() => localMsgs.value)

watch(convoMsgs, async () => { await nextTick(); scrollToBottom() })

function scrollToBottom() {
  if (convoEl.value) convoEl.value.scrollTop = convoEl.value.scrollHeight
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

// Auto-refresh conversation
// - Human sender: listen to store.lastInboxEvent (set by inbox WS) → reload on new DM
// - Agent sender: poll every 30s
let pollTimer = null

function startAutoRefresh() {
  stopAutoRefresh()
  if (!agentAId.value || !selectedPartnerId.value) return
  if (!isHumanSender.value) {
    // agent-agent view: slow poll
    pollTimer = setInterval(() => {
      loadConversation(agentAId.value, selectedPartnerId.value)
    }, 30000)
  }
}

function stopAutoRefresh() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

// When human sender: react to inbox WS events
watch(() => store.lastInboxEvent, (evt) => {
  if (!evt || !isHumanSender.value || !selectedPartnerId.value) return
  const relevant = evt.from_agent_id === selectedPartnerId.value || evt.to_agent_id === selectedPartnerId.value
  if (relevant) loadConversation(agentAId.value, selectedPartnerId.value)
})

// Restart poll timer when conversation changes
watch([agentAId, selectedPartnerId, isHumanSender], () => startAutoRefresh())

onMounted(() => startAutoRefresh())
onUnmounted(() => stopAutoRefresh())

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
