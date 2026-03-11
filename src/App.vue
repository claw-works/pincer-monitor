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
        <!-- Current agent indicator -->
        <span
          v-if="store.selectedAgent"
          class="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full ml-1"
        >
          视角: {{ store.selectedAgent.name || store.selectedAgent.id?.slice(0, 8) }}
        </span>
      </div>
      <div class="flex items-center gap-3">
        <!-- WS connection indicator -->
        <span
          :title="store.wsConnected ? 'WebSocket 已连接' : 'WebSocket 断开，使用轮询备用'"
          class="text-xs flex items-center gap-1"
          :class="store.wsConnected ? 'text-green-500' : 'text-gray-300'"
        >
          <span class="w-1.5 h-1.5 rounded-full inline-block" :class="store.wsConnected ? 'bg-green-400' : 'bg-gray-300'"></span>
          {{ store.wsConnected ? 'Live' : 'Polling' }}
        </span>
        <span v-if="store.error" class="text-xs text-red-500">⚠ {{ store.error }}</span>
        <button
          @click="store.refresh()"
          class="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg transition"
        >
          Refresh
        </button>

        <!-- #18: Identity widget -->
        <div class="relative">
          <!-- Avatar (identity set) -->
          <button
            v-if="store.humanAgentId"
            @click="identityOpen = !identityOpen"
            class="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-bold hover:bg-indigo-600 transition"
            :title="humanDisplayName"
          >
            {{ humanInitial }}
          </button>

          <!-- Login button (identity not set) -->
          <button
            v-else
            @click="identityOpen = !identityOpen"
            class="text-xs border border-indigo-300 text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg transition"
          >
            👤 设置身份
          </button>

          <!-- Identity dropdown -->
          <div
            v-if="identityOpen"
            class="absolute right-0 top-10 z-50 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-4"
          >
            <ProfileSetup @close="identityOpen = false" />
          </div>
        </div>

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
      <nav class="w-52 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">

        <!-- Nav items (top) -->
        <div class="py-3 flex flex-col gap-0.5">
          <button
            v-for="item in navItems"
            :key="item.key"
            @click="active = item.key"
            :class="[
              'flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition text-left',
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
        </div>

        <!-- Divider + Agents section (bottom, scrollable) -->
        <div class="border-t border-gray-100 flex flex-col min-h-0 flex-1 overflow-hidden">
          <div class="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">
            Agents
            <span class="normal-case font-normal text-gray-300 ml-1">(点击切换视角)</span>
          </div>
          <div class="overflow-y-auto flex-1 pb-3">
            <button
              v-for="agent in sidebarAgents"
              :key="agent.id"
              @click="store.selectAgent(agent.id)"
              :class="[
                'w-full flex items-center gap-2 px-4 py-2 text-left transition hover:bg-gray-50',
                store.selectedAgentId === agent.id
                  ? 'bg-indigo-50'
                  : '',
              ]"
            >
              <!-- Status dot -->
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :class="agent.status === 'online' ? 'bg-green-400' : 'bg-gray-300'"
              ></span>
              <div class="min-w-0 flex-1">
                <div class="text-xs font-medium text-gray-700 truncate flex items-center gap-1">
                  <span>{{ agent.name || agent.id.slice(0, 8) }}</span>
                  <span v-if="agent.type === 'human'" class="text-blue-300 text-xs">👤</span>
                </div>
              </div>
              <!-- Selected indicator -->
              <span
                v-if="store.selectedAgentId === agent.id"
                class="text-xs text-indigo-500 flex-shrink-0"
              >✓</span>
            </button>
            <!-- Deselect -->
            <button
              v-if="store.selectedAgentId"
              @click="store.selectAgent(store.selectedAgentId)"
              class="w-full text-xs text-gray-400 hover:text-gray-600 px-4 py-1.5 text-center transition"
            >
              取消视角选择
            </button>
          </div>
        </div>

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
            <MessageFeed class="h-full" @need-profile="active = 'profile'" />
          </div>
        </section>

        <!-- Tasks -->
        <section v-else-if="active === 'tasks'" class="flex-1 min-h-0 flex flex-col p-6">
          <TaskBoard class="flex-1 min-h-0" />
        </section>

        <!-- Projects + Tasks (two-panel, fill height) -->
        <section v-else-if="active === 'projects'" class="flex-1 min-h-0 flex flex-col">
          <ProjectView class="flex-1 min-h-0" />
        </section>

        <!-- Profile -->
        <section v-else-if="active === 'profile'" class="flex-1 overflow-y-auto p-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            身份设置
          </h2>
          <ProfileSetup />
        </section>

        <!-- DMs — fills height -->
        <section v-else-if="active === 'dm'" class="flex-1 min-h-0 flex flex-col p-6">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex-shrink-0">
            Private Messages
          </h2>
          <div class="flex-1 min-h-0">
            <DMView class="h-full" />
          </div>
        </section>

      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePincerStore } from './stores/pincer'
import { isConfigured, clearConfig } from './config'
import AgentCards from './components/AgentCards.vue'
import MessageFeed from './components/MessageFeed.vue'
import TaskBoard from './components/TaskBoard.vue'
import ProjectView from './components/ProjectView.vue'
import DMView from './components/DMView.vue'
import ProfileSetup from './components/ProfileSetup.vue'
import LoginPage from './components/LoginPage.vue'

const store = usePincerStore()
const configured = ref(isConfigured())
const active = ref(localStorage.getItem('pincer_active_tab') || 'room')

watch(active, (val) => localStorage.setItem('pincer_active_tab', val))

const navItems = computed(() => [
  { key: 'room',     icon: '💬', label: 'Room',     badge: store.messages.length },
  { key: 'dm',       icon: '📩', label: 'DMs' },
  { key: 'tasks',    icon: '📋', label: 'Tasks',    badge: filteredTaskCount.value },
  { key: 'projects', icon: '📁', label: 'Projects' },
])

// AI agents only (exclude humans) — for sidebar perspective switcher
const aiAgents = computed(() =>
  store.agents.filter(a => a.type !== "human")
)

// All agents: humans first, then AI — for sidebar perspective switcher
const sidebarAgents = computed(() => {
  const humans = store.agents.filter(a => a.type === 'human')
  const ais = store.agents.filter(a => a.type !== 'human')
  return [...humans, ...ais]
})

// Task count respects current agent filter
const filteredTaskCount = computed(() => {
  if (!store.selectedAgentId) return store.tasks.length
  return store.tasks.filter(t => t.assigned_agent_id === store.selectedAgentId).length
})

// #18: identity dropdown
const identityOpen = ref(false)

const humanDisplayName = computed(() => {
  const agent = store.agents.find(a => a.id === store.humanAgentId)
  return agent?.name || store.humanAgentId?.slice(0, 8) || ''
})

const humanInitial = computed(() =>
  humanDisplayName.value.charAt(0).toUpperCase() || '?'
)

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
