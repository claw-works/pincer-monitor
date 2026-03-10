<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    <div
      v-for="agent in store.agents"
      :key="agent.id"
      :class="[
        'bg-white rounded-xl shadow p-4 flex items-center gap-3 transition hover:shadow-md',
        store.selectedAgentId === agent.id ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'hover:bg-gray-50',
      ]"
    >
      <!-- Click area: select agent for view -->
      <button class="flex items-center gap-3 flex-1 text-left min-w-0" @click="store.selectAgent(agent.id)">
        <span
          class="w-3 h-3 rounded-full flex-shrink-0"
          :class="agent.status === 'online' ? 'bg-green-400' : 'bg-gray-300'"
        />
        <div class="min-w-0">
          <div class="font-semibold text-gray-800 flex items-center gap-1.5">
            {{ agent.name || agent.id }}
            <span
              v-if="store.selectedAgentId === agent.id"
              class="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-normal"
            >视角</span>
            <span
              v-if="agent.type === 'human'"
              class="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-normal"
            >人类</span>
          </div>
          <div class="text-xs text-gray-400 truncate">{{ agent.id }}</div>
          <div v-if="agent.last_heartbeat" class="text-xs text-gray-400">
            {{ formatTime(agent.last_heartbeat) }}
          </div>
        </div>
      </button>

      <!-- DM button (only if human agent exists and this isn't me) -->
      <button
        v-if="store.humanAgentId && agent.id !== store.humanAgentId"
        @click="store.openDM(agent.id)"
        :class="[
          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm transition',
          store.activeDmAgentId === agent.id
            ? 'bg-indigo-100 text-indigo-600'
            : 'bg-gray-100 hover:bg-indigo-100 text-gray-500 hover:text-indigo-600',
        ]"
        title="私信"
      >
        💬
      </button>
    </div>
    <div v-if="!store.agents.length" class="col-span-3 text-center text-gray-400 py-8">
      No agents found
    </div>
  </div>
</template>

<script setup>
import { usePincerStore } from '../stores/pincer'
import { usePolling } from '../composables/usePolling'

const store = usePincerStore()
usePolling(() => store.refreshAgents(), 10000)

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString()
}
</script>
