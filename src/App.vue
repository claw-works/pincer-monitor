<template>
  <div class="min-h-screen bg-gray-100 text-gray-900">
    <!-- Header -->
    <header class="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xl">🦀</span>
        <h1 class="text-lg font-bold tracking-tight">Pincer Monitor</h1>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="store.error" class="text-xs text-red-500">⚠ {{ store.error }}</span>
        <span class="text-xs text-gray-400">Auto-refresh 5s</span>
        <button
          @click="store.refresh()"
          class="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg transition"
        >
          Refresh
        </button>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <!-- Agents -->
      <section>
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Agents ({{ store.agents.length }})
        </h2>
        <AgentCards />
      </section>

      <!-- Messages -->
      <section>
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Room Messages
        </h2>
        <MessageFeed />
      </section>

      <!-- Tasks -->
      <section>
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Active Tasks ({{ store.tasks.length }})
        </h2>
        <TaskBoard />
      </section>
    </main>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { usePincerStore } from './stores/pincer'
import AgentCards from './components/AgentCards.vue'
import MessageFeed from './components/MessageFeed.vue'
import TaskBoard from './components/TaskBoard.vue'

const store = usePincerStore()
onMounted(() => store.startPolling())
onUnmounted(() => store.stopPolling())
</script>
