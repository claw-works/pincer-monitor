<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    <div
      v-for="agent in store.agents"
      :key="agent.id"
      class="bg-white rounded-xl shadow p-4 flex items-center gap-3"
    >
      <span
        class="w-3 h-3 rounded-full flex-shrink-0"
        :class="agent.status === 'online' ? 'bg-green-400' : 'bg-gray-300'"
      />
      <div>
        <div class="font-semibold text-gray-800">{{ agent.name || agent.id }}</div>
        <div class="text-xs text-gray-400">{{ agent.id }}</div>
        <div v-if="agent.last_heartbeat" class="text-xs text-gray-400">
          {{ formatTime(agent.last_heartbeat) }}
        </div>
      </div>
    </div>
    <div v-if="!store.agents.length" class="col-span-3 text-center text-gray-400 py-8">
      No agents found
    </div>
  </div>
</template>

<script setup>
import { usePincerStore } from '../stores/pincer'

const store = usePincerStore()

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString()
}
</script>
