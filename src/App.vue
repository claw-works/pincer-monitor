<template>
  <!-- Login page if not configured -->
  <LoginPage v-if="!configured" @logged-in="onLoggedIn" />

  <!-- Main dashboard -->
  <div v-else class="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm px-3 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-2">
        <img src="/logo-transparent.png" alt="Pincer" class="w-7 h-7 object-contain" />
        <h1 class="text-lg font-bold tracking-tight">{{ $t('app.title') }}</h1>
        <!-- Current agent indicator -->
        <span
          v-if="store.selectedAgent"
          class="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full ml-1"
        >
          {{ $t('app.perspective') }} {{ store.selectedAgent.name || store.selectedAgent.id?.slice(0, 8) }}
        </span>
      </div>
      <div class="flex items-center gap-3">
        <!-- WS connection indicator -->
        <span
          :title="store.wsConnected ? $t('app.ws_connected') : $t('app.ws_disconnected')"
          class="text-xs flex items-center gap-1"
          :class="store.wsConnected ? 'text-green-500' : 'text-gray-300 dark:text-gray-500'"
        >
          <span class="w-1.5 h-1.5 rounded-full inline-block" :class="store.wsConnected ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-500'"></span>
          {{ store.wsConnected ? $t('app.live') : $t('app.polling') }}
        </span>
        <span v-if="store.error" class="text-xs text-red-500">⚠ {{ store.error }}</span>
        <button
          @click="store.refresh()"
          class="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg transition"
        >
          {{ $t('app.refresh') }}
        </button>

        <!-- Theme toggle -->
        <button
          @click="toggleTheme()"
          class="text-xs w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>

        <!-- Language switcher -->
        <button
          @click="switchLocale()"
          class="text-xs border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-2 py-1 rounded-lg transition font-medium"
        >
          {{ locale === 'zh' ? '中' : 'EN' }}
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
            class="text-xs border border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1 rounded-lg transition"
          >
            👤 {{ $t('app.set_identity') }}
          </button>

          <!-- Identity dropdown -->
          <div
            v-if="identityOpen"
            class="absolute right-0 top-10 z-50 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <ProfileSetup @close="identityOpen = false" />
          </div>
          <!-- Click-outside backdrop to close popup (39f0b48c) -->
          <Teleport to="body">
            <div
              v-if="identityOpen"
              class="fixed inset-0 z-40"
              @click="identityOpen = false"
            />
          </Teleport>
        </div>

        <button
          @click="logout"
          class="text-xs text-gray-400 hover:text-red-500 transition"
          :title="$t('app.logout_title')"
        >
          ⎋ {{ $t('app.logout') }}
        </button>
      </div>
    </header>

    <!-- Body: sidebar + content -->
    <div class="flex flex-1 min-h-0">

      <!-- Sidebar -->
      <nav class="hidden sm:flex w-52 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col flex-shrink-0 overflow-hidden">

        <!-- Nav items (top) -->
        <div class="py-3 flex flex-col gap-0.5">
          <button
            v-for="item in navItems"
            :key="item.key"
            @click="active = item.key"
            :class="[
              'flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition text-left',
              active === item.key
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
            ]"
          >
            <span class="text-base">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span
              v-if="item.badge !== undefined && item.badge > 0"
              class="ml-auto text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full"
            >
              {{ item.badge }}
            </span>
          </button>
        </div>

        <!-- Divider + Agents section (bottom, scrollable) -->
        <div class="border-t border-gray-100 dark:border-gray-700 flex flex-col min-h-0 flex-1 overflow-hidden">
          <div class="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">
            {{ $t('app.agents_section') }}
            <span class="normal-case font-normal text-gray-300 dark:text-gray-500 ml-1">{{ $t('app.click_to_switch') }}</span>
          </div>
          <div class="overflow-y-auto flex-1 pb-3">
            <button
              v-for="agent in sidebarAgents"
              :key="agent.id"
              @click="store.selectAgent(agent.id)"
              :class="[
                'w-full flex items-center gap-2 px-4 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700',
                store.selectedAgentId === agent.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/30'
                  : '',
              ]"
            >
              <!-- Status dot -->
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :class="agent.status === 'online' ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-500'"
              ></span>
              <div class="min-w-0 flex-1">
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate flex items-center gap-1">
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
              class="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-4 py-1.5 text-center transition"
            >
              {{ $t('app.cancel_perspective') }}
            </button>
          </div>
        </div>

      </nav>

      <!-- Content area -->
      <main class="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">

        <!-- Agents -->
        <section v-if="active === 'agents'" class="flex-1 overflow-y-auto p-6">
          <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            {{ $t('app.agents_section') }} ({{ store.agents.length }})
          </h2>
          <AgentCards />
        </section>

        <!-- Room Messages — fills height -->
        <section v-else-if="active === 'room'" class="flex-1 min-h-0 flex flex-col sm:p-6 p-0">
          <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex-shrink-0 hidden sm:block px-4 sm:px-0 pt-4 sm:pt-0">
            {{ $t('app.room_messages') }}
          </h2>
          <div class="flex-1 min-h-0">
            <MessageFeed class="h-full" @need-profile="active = 'profile'" />
          </div>
        </section>

        <!-- Tasks -->
        <section v-else-if="active === 'tasks'" class="flex-1 min-h-0 flex flex-col sm:p-6 p-2">
          <TaskBoard class="flex-1 min-h-0" />
        </section>

        <!-- Projects + Tasks (two-panel, fill height) -->
        <section v-else-if="active === 'projects'" class="flex-1 min-h-0 flex flex-col">
          <ProjectView class="flex-1 min-h-0" />
        </section>

        <!-- Reports -->
        <section v-else-if="active === 'reports'" class="flex-1 min-h-0 flex flex-col">
          <ReportsView class="flex-1 min-h-0" />
        </section>

        <!-- Profile -->
        <section v-else-if="active === 'profile'" class="flex-1 overflow-y-auto p-6">
          <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            {{ $t('app.profile_settings') }}
          </h2>
          <ProfileSetup />
        </section>

        <!-- DMs — fills height -->
        <section v-else-if="active === 'dm'" class="flex-1 min-h-0 flex flex-col sm:p-6 p-0">
          <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex-shrink-0">
            {{ $t('app.private_messages') }}
          </h2>
          <div class="flex-1 min-h-0">
            <DMView class="h-full" />
          </div>
        </section>

      </main>
    </div>

    <!-- Mobile bottom tab bar (sm: hidden) -->
    <nav class="sm:hidden flex items-stretch bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 safe-area-pb">
      <button
        v-for="item in navItems"
        :key="item.key"
        @click="active = item.key"
        class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs relative transition"
        :class="active === item.key ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'"
      >
        <span class="text-lg leading-none">{{ item.icon }}</span>
        <span class="text-[10px] font-medium">{{ item.label }}</span>
        <span v-if="item.badge" class="absolute top-1 right-1/4 bg-red-400 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {{ item.badge > 99 ? '99+' : item.badge }}
        </span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePincerStore } from './stores/pincer'
import { isConfigured, clearConfig, getHumanName } from './config'
import { useTheme } from './composables/useTheme'
import AgentCards from './components/AgentCards.vue'
import MessageFeed from './components/MessageFeed.vue'
import TaskBoard from './components/TaskBoard.vue'
import ProjectView from './components/ProjectView.vue'
import DMView from './components/DMView.vue'
import ReportsView from './components/ReportsView.vue'
import ProfileSetup from './components/ProfileSetup.vue'
import LoginPage from './components/LoginPage.vue'

const { t, locale } = useI18n()
const { theme, toggleTheme } = useTheme()

const store = usePincerStore()
const configured = ref(isConfigured())
const active = ref(localStorage.getItem('pincer_active_tab') || 'room')

watch(active, (val) => {
  localStorage.setItem('pincer_active_tab', val)
  // Refresh agents on tab switch to keep perspective name fresh
  store.refreshAgents()
})

const navItems = computed(() => [
  { key: 'room',     icon: '💬', label: t('nav.room'),     badge: store.messages.length },
  { key: 'dm',       icon: '📩', label: t('nav.dm') },
  { key: 'tasks',    icon: '📋', label: t('nav.tasks'),    badge: filteredTaskCount.value },
  { key: 'projects', icon: '📁', label: t('nav.projects') },
  { key: 'reports',  icon: '📊', label: t('nav.reports') },
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
  return getHumanName() || store.agents.find(a => a.id === store.humanAgentId)?.name || store.humanAgentId?.slice(0, 8) || ''
})

const humanInitial = computed(() =>
  humanDisplayName.value.charAt(0).toUpperCase() || '?'
)

function switchLocale() {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
  localStorage.setItem('pincer_locale', locale.value)
}

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
