<template>
  <!-- Login page if not configured -->
  <LoginPage v-if="!configured" @logged-in="onLoggedIn" />

  <!-- Main dashboard -->
  <div v-else class="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm px-3 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-2">
        <!-- Hamburger button (mobile only) -->
        <button
          class="sm:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition mr-1"
          @click="sidebarOpen = !sidebarOpen"
          :aria-label="sidebarOpen ? '关闭菜单' : '打开菜单'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path v-if="!sidebarOpen" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            <path v-else stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
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
            class="absolute right-0 top-10 z-50 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4"
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
      <!-- Sidebar: fixed on desktop, drawer on mobile -->
      <!-- Mobile backdrop -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 bg-black/30 z-30 sm:hidden"
        @click="sidebarOpen = false"
      />
      <nav :class="[
        'bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col flex-shrink-0 overflow-hidden',
        'sm:flex sm:relative sm:w-52 sm:z-auto',
        sidebarOpen ? 'flex fixed left-0 top-0 h-full w-64 z-40 shadow-xl pt-14' : 'hidden',
      ]">

        <!-- 项目群 section: 议事厅 + project rooms -->
        <div class="border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <button
            @click="groupOpen = !groupOpen; saveCollapse('groupOpen', groupOpen)"
            class="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <span>{{ $t('app.group_section') }}</span>
            <span>{{ groupOpen ? '▲' : '▼' }}</span>
          </button>
          <template v-if="groupOpen">
          <!-- 议事厅 -->
          <button
            @click="active = 'room'; sidebarOpen = false"
            :class="[
              'flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition mx-2 rounded-lg',
              active === 'room' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            ]"
          >
            <span>💬</span><span class="hidden sm:inline">{{ $t('app.room_name') }}</span>
            <span v-if="store.messages.length > 0" class="ml-auto text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 px-1.5 py-0.5 rounded-full">{{ store.messages.length }}</span>
          </button>
          <!-- Project rooms -->
          <button
            v-for="project in projectsWithRoom"
            :key="project.id"
            @click="selectProjectRoom(project); sidebarOpen = false"
            :class="[
              'flex items-center gap-2 px-4 py-2 text-sm text-left transition mx-2 rounded-lg',
              active === 'project_room' && activeProjectId === project.id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            ]"
          >
            <span class="text-sm flex-shrink-0">📁</span>
            <span class="text-xs font-medium truncate hidden sm:block">{{ project.name }}</span>
          </button>
          </template>
        </div>

<!-- 伙伴 section: humans + agents (DM) -->
        <div class="border-t border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden" style="min-height: 0; flex: 1 1 0;">
          <button
            @click="partnersOpen = !partnersOpen; saveCollapse('partnersOpen', partnersOpen)"
            class="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:bg-gray-50 dark:hover:bg-gray-700 transition flex-shrink-0"
          >
            <span>{{ $t('app.partners_section') }}</span>
            <span>{{ partnersOpen ? '▲' : '▼' }}</span>
          </button>
          <div v-if="partnersOpen" class="overflow-y-auto flex-1 pb-2">
            <button
              v-for="agent in sidebarAgents"
              :key="agent.id + '_dm'"
              @click="selectAgentDM(agent)"
              :class="[
                'w-full flex items-center gap-2 px-4 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700',
                active === 'dm' && dmTargetId === agent.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
              ]"
            >
              <template v-if="agent.type === 'human'">
                <span class="text-sm flex-shrink-0">👤</span>
              </template>
              <template v-else>
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="agent.status === 'online' ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-500'"></span>
              </template>
              <div class="min-w-0 flex-1 hidden sm:block">
                <span class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate block">{{ agent.name || agent.id.slice(0, 8) }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Nav items (top) -->
        <div class="py-3 flex flex-col gap-0.5">
          <button
            v-for="item in navItems"
            :key="item.key"
            @click="active = item.key; sidebarOpen = false"
            :class="[
              'flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition text-left',
              item.desktopOnly ? 'hidden sm:flex' : 'flex',
              active === item.key
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
            ]"
          >
            <span class="text-base">{{ item.icon }}</span>
            <span class="hidden sm:inline">{{ item.label }}</span>
            <span
              v-if="item.badge !== undefined && item.badge > 0"
              class="ml-auto text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full"
            >
              {{ item.badge }}
            </span>
          </button>
        </div>

        <!-- 切换视角 (collapsible) -->
        <div class="border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <button
            @click="perspectiveOpen = !perspectiveOpen"
            class="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <span>{{ $t('app.perspective_section') }}</span>
            <span>{{ perspectiveOpen ? '▲' : '▼' }}</span>
          </button>
          <div v-if="perspectiveOpen" class="pb-2 max-h-48 overflow-y-auto">
            <!-- 我的视角 (always at top, clears perspective) -->
            <button
              @click="store.selectAgent('')"
              :class="[
                'w-full flex items-center gap-2 px-4 py-1.5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700',
                !store.selectedAgentId ? 'bg-indigo-50 dark:bg-indigo-900/30' : '',
              ]"
            >
              <span class="text-xs flex-shrink-0">👤</span>
              <span class="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{{ $t('app.my_perspective') }}</span>
              <span v-if="!store.selectedAgentId" class="text-xs text-indigo-500">✓</span>
            </button>
            <div class="mx-4 border-t border-gray-100 dark:border-gray-700 my-1"></div>
            <!-- Agent list -->
            <button
              v-for="agent in aiAgents"
              :key="agent.id"
              @click="store.selectAgent(agent.id)"
              :class="[
                'w-full flex items-center gap-2 px-4 py-1.5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700',
                store.selectedAgentId === agent.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : '',
              ]"
            >
              <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="agent.status === 'online' ? 'bg-green-400' : 'bg-gray-300'"></span>
              <span class="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{{ agent.name || agent.id.slice(0, 8) }}</span>
              <span v-if="store.selectedAgentId === agent.id" class="text-xs text-indigo-500">✓</span>
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
        <section v-else-if="active === 'room' || active === 'project_room'" class="flex-1 min-h-0 flex flex-col sm:p-6 p-0">
          <h2 v-if="active === 'project_room' && activeProject"
            class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex-shrink-0 hidden sm:block px-4 sm:px-0 pt-4 sm:pt-0">
            📁 {{ activeProject.name }}
          </h2>
          <h2 v-else class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex-shrink-0 hidden sm:block px-4 sm:px-0 pt-4 sm:pt-0">
            {{ $t('app.room_messages') }}
          </h2>
          <div class="flex-1 min-h-0">
            <MessageFeed :key="currentRoomId" :room-id="currentRoomId" class="h-full" @need-profile="active = 'profile'" />
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
        <section v-else-if="active === 'dm'" class="flex-1 min-h-0 flex flex-col sm:p-0 p-0">
          <div class="flex-1 min-h-0">
            <DMView class="h-full" :initial-partner-id="dmTargetId" />
          </div>
        </section>

      </main>
    </div>

    <!-- Mobile bottom tab bar (sm: hidden) -->
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePincerStore } from './stores/pincer'
import { isConfigured, clearConfig, getHumanName, getRoomId } from './config'
import { fetchProjects } from './api'
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
const perspectiveOpen = ref(false)  // 切换视角 collapse state
const groupOpen = ref(localStorage.getItem('sidebar_groupOpen') !== 'false')  // 项目群
const partnersOpen = ref(localStorage.getItem('sidebar_partnersOpen') !== 'false')  // 伙伴

function saveCollapse(key, val) {
  localStorage.setItem('sidebar_' + key, String(val))
}
const dmTargetId = ref('')  // which agent DM is selected in sidebar
const sidebarOpen = ref(false)  // mobile drawer state
const activeProjectId = ref('')  // which project room is active
const allProjects = ref([])  // projects list (fetched at startup)

// Load projects at startup
onMounted(() => {
  fetchProjects().then(data => {
    allProjects.value = Array.isArray(data) ? data : (data.projects || [])
  }).catch(() => {})
})

// Projects with room_id for the sidebar
const projectsWithRoom = computed(() =>
  allProjects.value.filter(p => p.room_id)
)

// Active project object
const activeProject = computed(() =>
  projectsWithRoom.value.find(p => p.id === activeProjectId.value) || null
)

// Current room ID: project room or default room
const currentRoomId = computed(() => {
  if (active.value === 'project_room' && activeProject.value?.room_id) {
    return activeProject.value.room_id
  }
  return getRoomId()
})

function selectProjectRoom(project) {
  activeProjectId.value = project.id
  active.value = 'project_room'
}

function selectAgentDM(agent) {
  dmTargetId.value = agent.id
  active.value = 'dm'
  sidebarOpen.value = false  // close drawer on mobile
}

watch(active, (val) => {
  localStorage.setItem('pincer_active_tab', val)
  // Refresh agents on tab switch to keep perspective name fresh
  store.refreshAgents()
})

const navItems = computed(() => [
  { key: 'tasks',    icon: '📋', label: t('nav.tasks'),    badge: filteredTaskCount.value },
  { key: 'projects', icon: '📁', label: t('nav.projects'), desktopOnly: true },
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
