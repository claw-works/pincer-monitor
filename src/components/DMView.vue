<template>
  <div class="bg-white rounded-xl shadow flex" style="height: 480px;">
    <!-- Left: recipient list -->
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
          @click="selectRecipient(agent.id)"
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
          </div>
        </button>
      </div>
    </div>

    <!-- Right: conversation -->
    <div class="flex-1 flex flex-col min-w-0">
      <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
        <span>{{ selectedConvo ? agentName(selectedConvo) : '选择对话' }}</span>
        <span v-if="loadingHistory" class="text-gray-300 font-normal normal-case">加载中…</span>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3" ref="convoEl">
        <!-- No perspective -->
        <div v-if="!currentSenderId" class="text-center text-gray-400 text-sm py-8">
          请先在左侧侧边栏选择视角（Agent）
        </div>
        <!-- Has perspective, no recipient -->
        <div v-else-if="!selectedConvo" class="text-center text-gray-400 text-sm py-8">
          从左侧选择对话对象
        </div>
        <!-- Loading -->
        <div v-else-if="loadingHistory" class="text-center text-gray-400 text-sm py-8">
          加载消息中…
        </div>
        <!-- Empty -->
        <div v-else-if="!convoMsgs.length" class="text-center text-gray-400 text-sm py-8">
          暂无消息，发一条吧 👋
        </div>
        <!-- Messages -->
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
            <div class="text-xs opacity-60 mt-1">{{ formatTime(msg.created_at) }}</div>
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
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { usePincerStore } from '../stores/pincer'
import { fetchAgentMessages, sendDM } from '../api'

const store = usePincerStore()
const selectedConvo = ref(null)        // B — recipient
const convoEl = ref(null)
const dmInput = ref('')
const dmSending = ref(false)
const loadingHistory = ref(false)
const localMsgs = ref([])             // merged conversation messages

// A — sender perspective: selectedAgentId || humanAgentId
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
  if (id) selectRecipient(id)
})

// When both sender AND recipient are set, load conversation
watch(
  [currentSenderId, selectedConvo],
  ([senderA, recipientB]) => {
    if (senderA && recipientB) loadConversation(senderA, recipientB)
    else localMsgs.value = []
  }
)

/**
 * Load two-way conversation between A (sender) and B (recipient):
 * - GET /agents/A/messages?from=B  → what B said to A
 * - GET /agents/B/messages?from=A  → what A said to B
 * Merge + sort by created_at
 */
async function loadConversation(senderA, recipientB) {
  loadingHistory.value = true
  localMsgs.value = []
  try {
    const [fromB, fromA] = await Promise.all([
      fetchAgentMessages(senderA, { from: recipientB, limit: 100 }),
      fetchAgentMessages(recipientB, { from: senderA, limit: 100 }),
    ])
    const aArr = Array.isArray(fromB) ? fromB : (fromB.messages || [])
    const bArr = Array.isArray(fromA) ? fromA : (fromA.messages || [])
    // Deduplicate by id, sort by created_at
    const all = [...aArr, ...bArr]
    const seen = new Set()
    const deduped = all.filter(m => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })
    deduped.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    localMsgs.value = deduped
  } catch (e) {
    console.warn('Failed to load DM conversation:', e.message)
  } finally {
    loadingHistory.value = false
    await nextTick()
    scrollToBottom()
  }
}

const convoMsgs = computed(() => localMsgs.value)

watch(convoMsgs, async () => {
  await nextTick()
  scrollToBottom()
})

function scrollToBottom() {
  if (convoEl.value) convoEl.value.scrollTop = convoEl.value.scrollHeight
}

async function selectRecipient(id) {
  selectedConvo.value = id
}

// A's message: from_agent_id === sender A
function isMyMsg(msg) {
  return msg.from_agent_id === currentSenderId.value
}

const agentNameMap = computed(() => {
  const map = {}
  for (const agent of store.agents) {
    if (agent.id && agent.name) map[agent.id] = agent.name
  }
  return map
})

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
  const senderA = currentSenderId.value
  const recipientB = selectedConvo.value
  if (!text || !senderA || !recipientB) return
  dmSending.value = true
  try {
    await sendDM(senderA, recipientB, text)
    // Optimistic: add outgoing message locally
    localMsgs.value = [
      ...localMsgs.value,
      {
        id: `local-${Date.now()}`,
        from_agent_id: senderA,
        to_agent_id: recipientB,
        payload: { text },
        created_at: new Date().toISOString(),
      },
    ]
    dmInput.value = ''
  } catch (e) {
    console.error('DM failed', e)
  } finally {
    dmSending.value = false
  }
}
</script>
