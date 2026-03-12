<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    <div
      v-for="agent in store.agents"
      :key="agent.id"
      :class="[
        'bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex items-center gap-3 transition hover:shadow-md',
        store.selectedAgentId === agent.id ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700',
      ]"
    >
      <!-- Click area: select agent for view -->
      <button class="flex items-center gap-3 flex-1 text-left min-w-0" @click="store.selectAgent(agent.id)">
        <span
          class="w-3 h-3 rounded-full flex-shrink-0"
          :class="agent.status === 'online' ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-500'"
        />
        <div class="min-w-0">
          <div class="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            {{ agent.name || agent.id }}
            <span
              v-if="store.selectedAgentId === agent.id"
              class="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-normal"
            >{{ $t('agents.perspective_badge') }}</span>
            <span
              v-if="agent.type === 'human'"
              class="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full font-normal"
            >{{ $t('agents.human_badge') }}</span>
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
            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
            : 'bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400',
        ]"
        :title="$t('agents.dm_title')"
      >
        💬
      </button>
    </div>
    <div v-if="!store.agents.length" class="col-span-3 text-center text-gray-400 py-8">
      {{ $t('agents.no_agents') }}
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { usePincerStore } from '../stores/pincer'
import { usePolling } from '../composables/usePolling'

useI18n()
const store = usePincerStore()
usePolling(() => store.refreshAgents(), 10000)

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString()
}
</script>
