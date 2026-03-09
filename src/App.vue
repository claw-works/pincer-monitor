<template>
  <!-- Login page if not configured -->
  <LoginPage v-if="!configured" @logged-in="onLoggedIn" />

  <!-- Main dashboard -->
  <div v-else class="min-h-screen bg-gray-100 text-gray-900">
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
        <button
          @click="logout"
          class="text-xs text-gray-400 hover:text-red-500 transition"
          title="退出登录"
        >
          ⎋ 退出
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

      <!-- Projects -->
      <section>
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Projects
        </h2>
        <ProjectView />
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
import { ref, onMounted, onUnmounted } from 'vue'
import { usePincerStore } from './stores/pincer'
import { isConfigured, clearConfig } from './config'
import AgentCards from './components/AgentCards.vue'
import MessageFeed from './components/MessageFeed.vue'
import TaskBoard from './components/TaskBoard.vue'
import ProjectView from './components/ProjectView.vue'
import LoginPage from './components/LoginPage.vue'

const store = usePincerStore()
const configured = ref(isConfigured())

function onLoggedIn() {
  configured.value = true
  store.startPolling()
}

function logout() {
  store.stopPolling()
  clearConfig()
  configured.value = false
}

onMounted(() => {
  if (configured.value) store.startPolling()
})
onUnmounted(() => store.stopPolling())
</script>
