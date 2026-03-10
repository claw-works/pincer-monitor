<template>
  <!-- Login page if not configured -->
  <LoginPage v-if="!configured" @logged-in="onLoggedIn" />

  <!-- Main dashboard -->
  <div v-else class="h-screen flex flex-col bg-gray-100 text-gray-900">
    <!-- Header -->
    <header class="bg-white shadow-sm px-6 py-3 flex items-center justify-between flex-shrink-0">
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

    <!-- Body: sidebar + content -->
    <div class="flex flex-1 min-h-0">

      <!-- Sidebar -->
      <nav class="w-48 bg-white border-r border-gray-200 flex flex-col py-4 gap-1 flex-shrink-0">
        <button
          v-for="item in navItems"
          :key="item.key"
          @click="active = item.key"
          :class="[
            'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition text-left',
            active === item.key
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          ]"
        >
          <span class="text-base">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
          <span
            v-if="item.badge !== undefined && item.badge > 0"
            class="ml-auto text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full"
          >
            {{ item.badge }}
          </span>
        </button>
      </nav>

      <!-- Content area -->
      <main class="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">

        <!-- Agents -->
        <section v-if="active === 'agents'" class="flex-1 overflow-y-auto p-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Agents ({{ store.agents.length }})
          </h2>
          <AgentCards />
        </section>

        <!-- Room Messages — fills height -->
        <section v-else-if="active === 'room'" class="flex-1 min-h-0 flex flex-col p-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex-shrink-0">
            Room Messages
          </h2>
          <div class="flex-1 min-h-0">
            <MessageFeed class="h-full" />
          </div>
        </section>

        <!-- Tasks -->
        <section v-else-if="active === 'tasks'" class="flex-1 overflow-y-auto p-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Active Tasks ({{ store.tasks.length }})
          </h2>
          <TaskBoard />
        </section>

        <!-- Projects -->
        <section v-else-if="active === 'projects'" class="flex-1 overflow-y-auto p-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Projects
          </h2>
          <ProjectView />
        </section>

        <!-- DMs -->
        <section v-else-if="active === 'dm'" class="flex-1 overflow-y-auto p-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Private Messages
            <span class="text-gray-400 font-normal normal-case text-xs ml-1">
              (点击 Agent 卡片选择 inbox 主体)
            </span>
          </h2>
          <DMView />
        </section>

      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePincerStore } from './stores/pincer'
import { isConfigured, clearConfig } from './config'
import AgentCards from './components/AgentCards.vue'
import MessageFeed from './components/MessageFeed.vue'
import TaskBoard from './components/TaskBoard.vue'
import ProjectView from './components/ProjectView.vue'
import DMView from './components/DMView.vue'
import LoginPage from './components/LoginPage.vue'

const store = usePincerStore()
const configured = ref(isConfigured())
const active = ref('room')

const navItems = computed(() => [
  { key: 'room',     icon: '💬', label: 'Room',     badge: store.messages.length },
  { key: 'agents',   icon: '🤖', label: 'Agents',   badge: store.agents.length },
  { key: 'tasks',    icon: '📋', label: 'Tasks',    badge: store.tasks.length },
  { key: 'projects', icon: '📁', label: 'Projects' },
  { key: 'dm',       icon: '📩', label: 'DMs' },
])

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
