<template>
  <div class="bg-white rounded-xl shadow flex h-96">
    <!-- Left: agent list -->
    <div class="w-48 border-r border-gray-100 flex flex-col flex-shrink-0">
      <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 border-b border-gray-100">
        对话
      </div>
      <div class="flex-1 overflow-y-auto">
        <div v-if="allConvos.length === 0" class="text-xs text-gray-400 italic px-4 py-4">
          点击 Agent 卡片上的 💬 开始私信
        </div>
        <button
          v-for="agentId in allConvos"
          :key="agentId"
          @click="selectConvo(agentId)"
          :class="[
            'w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition',
            selectedConvo === agentId ? 'bg-indigo-50 border-r-2 border-indigo-500' : '',
          ]"
        >
          <div
            :class="['w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                     avatarColor(agentId)]"
          >
            {{ avatarInitial(agentId) }}
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-gray-800 truncate">{{ agentName(agentId) }}</div>
            <div class="text-xs text-gray-400">{{ store.dms[agentId]?.length || 0 }} 条</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Right: conversation -->
    <div class="flex-1 flex flex-col min-w-0">
      <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 border-b border-gray-100">
        {{ selectedConvo ? agentName(selectedConvo) : '选择一个对话' }}
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3" ref="convoEl">
        <div v-if="!selectedConvo" class="text-center text-gray-400 text-sm py-8">
          从左侧选择一个 agent 查看对话
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
            <div v-else>{{ JSON.stringify(msg.payload || msg) }}</div>
            <div class="text-xs opacity-60 mt-1">{{ formatTime(msg.created_at || msg.timestamp) }}</div>
          </div>
        </div>
      </div>

      <!-- Send input -->
      <div v-if="selectedConvo && store.humanAgentId" class="border-t border-gray-100 p-3 flex gap-2">
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
import { sendDM } from '../api'

const store = usePincerStore()
const selectedConvo = ref(null)
const convoEl = ref(null)
const dmInput = ref('')
const dmSending = ref(false)

// When activeDmAgentId changes (from AgentCards click), open that convo
watch(() => store.activeDmAgentId, (id) => {
  if (id) selectedConvo.value = id
})

const agentNameMap = computed(() => {
  const map = {}
  for (const agent of store.agents) {
    if (agent.id && agent.name) map[agent.id] = agent.name
  }
  return map
})

// All convos = inbox keys + activeDmAgentId (even if empty)
const allConvos = computed(() => {
  const keys = new Set(Object.keys(store.dms))
  if (store.activeDmAgentId) keys.add(store.activeDmAgentId)
  return [...keys]
})

const convoMsgs = computed(() => {
  if (!selectedConvo.value) return []
  return store.dms[selectedConvo.value] || []
})

watch(convoMsgs, async () => {
  await nextTick()
  if (convoEl.value) convoEl.value.scrollTop = convoEl.value.scrollHeight
})

function selectConvo(id) {
  selectedConvo.value = id
}

function isMyMsg(msg) {
  return msg.from_agent_id === store.humanAgentId
}

function agentName(id) {
  if (!id) return 'Unknown'
  return agentNameMap.value[id] || id.slice(0, 8)
}

function avatarInitial(id) {
  const name = agentNameMap.value[id]
  if (name) return name.charAt(0).toUpperCase()
  return id ? id.slice(0, 1).toUpperCase() : '?'
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
  if (!text || !selectedConvo.value || !store.humanAgentId) return
  dmSending.value = true
  try {
    await sendDM(store.humanAgentId, selectedConvo.value, text)
    store.addOutgoingDM(selectedConvo.value, text)
    dmInput.value = ''
  } catch (e) {
    console.error('DM failed', e)
  } finally {
    dmSending.value = false
  }
}
</script>
