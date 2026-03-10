<template>
  <div class="bg-white rounded-xl shadow flex" style="height: 480px;">
    <!-- Left: all agents list -->
    <div class="w-48 border-r border-gray-100 flex flex-col flex-shrink-0">
      <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 border-b border-gray-100 flex-shrink-0">
        私信
      </div>
      <div class="flex-1 overflow-y-auto">
        <div v-if="otherAgents.length === 0" class="text-xs text-gray-400 italic px-4 py-4">
          暂无其他 Agent
        </div>
        <button
          v-for="agent in otherAgents"
          :key="agent.id"
          @click="selectConvo(agent.id)"
          :class="[
            'w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition',
            selectedConvo === agent.id ? 'bg-indigo-50 border-r-2 border-indigo-500' : '',
          ]"
        >
          <div
            :class="['w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                     avatarColor(agent.id)]"
          >
            {{ (agent.name || agent.id).charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-800 truncate">
              {{ agent.name || agent.id.slice(0, 8) }}
            </div>
            <div class="text-xs text-gray-400">
              {{ store.dms[agent.id]?.length || 0 }} 条
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Right: conversation -->
    <div class="flex-1 flex flex-col min-w-0">
      <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
        <span>{{ selectedConvo ? agentName(selectedConvo) : '选择一个对话' }}</span>
        <span v-if="loadingHistory" class="text-gray-300 font-normal normal-case">加载中…</span>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3" ref="convoEl">
        <div v-if="!selectedConvo" class="text-center text-gray-400 text-sm py-8">
          从左侧选择一个 Agent 开始私信
        </div>
        <div v-else-if="loadingHistory" class="text-center text-gray-400 text-sm py-8">
          加载历史消息…
        </div>
        <div v-else-if="!convoMsgs.length" class="text-center text-gray-400 text-sm py-8">
          暂无消息，发一条吧 👋
        </div>
        <div
          v-else
          v-for="msg in convoMsgs"
          :key="msg.id"
          :class="['flex', isMyMsg(msg) ? 'flex-row-reverse' : 'flex-row']"
        >
          <div
            :class="[
              'max-w-[80%] px-3 py-2 rounded-2xl text-sm break-words',
              isMyMsg(msg)
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm',
            ]"
          >
            <div v-if="msg.payload?.text">{{ msg.payload.text }}</div>
            <div v-else class="font-mono text-xs opacity-70">{{ JSON.stringify(msg.payload || msg) }}</div>
            <div class="text-xs opacity-60 mt-1">{{ formatTime(msg.created_at || msg.timestamp) }}</div>
          </div>
        </div>
      </div>

      <!-- Send input -->
      <div v-if="selectedConvo && currentSenderId" class="border-t border-gray-100 p-3 flex gap-2 flex-shrink-0">
        <input
          v-model="dmInput"
          @keydown.enter.prevent="sendDmMsg"
          type="text"
          placeholder="发私信…"
          class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
        <button
          @click="sendDmMsg"
          :disabled="!dmInput.trim() || dmSending"
          class="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm transition"
        >
          {{ dmSending ? '…' : '发送' }}
        </button>
      </div>
      <div v-else-if="selectedConvo && !currentSenderId" class="border-t border-gray-100 p-3 text-xs text-gray-400 text-center flex-shrink-0">
        请先设置人类身份（👤 页面）才能发送私信
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { usePincerStore } from '../stores/pincer'
import { fetchAgentMessages, sendDM } from '../api'

const store = usePincerStore()
const selectedConvo = ref(null)
const convoEl = ref(null)
const dmInput = ref('')
const dmSending = ref(false)
const loadingHistory = ref(false)

// "我"的视角 agent id：优先用 selectedAgentId（视角切换），其次 humanAgentId
const currentSenderId = computed(() =>
  store.selectedAgentId || store.humanAgentId || null
)

// Show all agents except the current perspective agent
const otherAgents = computed(() => {
  const myId = currentSenderId.value
  return store.agents.filter(a => a.id !== myId)
})

// When activeDmAgentId changes (from AgentCards click), open that convo
watch(() => store.activeDmAgentId, (id) => {
  if (id) selectConvo(id)
})

// When perspective changes, reload history
watch(currentSenderId, async (newId) => {
  if (newId) await loadHistory(newId)
})

onMounted(async () => {
  if (currentSenderId.value) {
    await loadHistory(currentSenderId.value)
  }
})

async function loadHistory(agentId) {
  loadingHistory.value = true
  try {
    const msgs = await fetchAgentMessages(agentId, 100)
    const arr = Array.isArray(msgs) ? msgs : (msgs.messages || [])
    // Group by from_agent_id (messages received by me)
    const grouped = {}
    for (const msg of arr) {
      const key = msg.from_agent_id || 'unknown'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(msg)
    }
    // Merge into store.dms (don't overwrite outgoing messages)
    for (const [key, msgList] of Object.entries(grouped)) {
      store.mergeDMs(key, msgList)
    }
  } catch (e) {
    console.warn('Failed to load DM history:', e.message)
  } finally {
    loadingHistory.value = false
  }
}

const agentNameMap = computed(() => {
  const map = {}
  for (const agent of store.agents) {
    if (agent.id && agent.name) map[agent.id] = agent.name
  }
  return map
})

const convoMsgs = computed(() => {
  if (!selectedConvo.value) return []
  return store.dms[selectedConvo.value] || []
})

watch(convoMsgs, async () => {
  await nextTick()
  if (convoEl.value) convoEl.value.scrollTop = convoEl.value.scrollHeight
})

async function selectConvo(id) {
  selectedConvo.value = id
  // Scroll after DOM update
  await nextTick()
  if (convoEl.value) convoEl.value.scrollTop = convoEl.value.scrollHeight
}

// isMyMsg: use current perspective agent (not just humanAgentId)
function isMyMsg(msg) {
  const myId = currentSenderId.value
  return msg.from_agent_id === myId || msg.to_agent_id !== myId
}

function agentName(id) {
  if (!id) return 'Unknown'
  return agentNameMap.value[id] || id.slice(0, 8)
}

const AVATAR_COLORS = [
  'bg-pink-400 text-white',
  'bg-purple-400 text-white',
  'bg-blue-400 text-white',
  'bg-teal-400 text-white',
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
  if (!text || !selectedConvo.value || !currentSenderId.value) return
  dmSending.value = true
  try {
    await sendDM(currentSenderId.value, selectedConvo.value, text)
    store.addOutgoingDM(selectedConvo.value, text)
    dmInput.value = ''
  } catch (e) {
    console.error('DM failed', e)
  } finally {
    dmSending.value = false
  }
}
</script>
