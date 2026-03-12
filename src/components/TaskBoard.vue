<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 flex-shrink-0 gap-3 flex-wrap">
      <div class="flex items-center gap-2">
        <h2 class="font-semibold text-gray-700 dark:text-gray-300">{{ $t('tasks.board_title') }}</h2>
        <!-- Project filter -->
        <select
          v-model="selectedProjectId"
          class="text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-gray-600"
        >
          <option value="">{{ $t('tasks.all_projects') }}</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          <option value="__none__">{{ $t('tasks.unclassified') }}</option>
        </select>
      </div>
      <button
        v-if="store.humanAgentId"
        @click="showModal = true"
        class="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition"
      >
        {{ $t('tasks.new_task') }}
      </button>
    </div>

    <!-- Kanban columns -->
    <div class="flex gap-3 overflow-x-auto pb-2 flex-1">
      <div
        v-for="col in columns"
        :key="col.status"
        class="flex flex-col flex-shrink-0 w-56 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
        @dragover.prevent
        @drop="onDrop($event, col.status)"
        :class="{ 'ring-2 ring-indigo-400 bg-indigo-50 dark:bg-indigo-900/20': dragOverCol === col.status }"
        @dragenter="dragOverCol = col.status"
        @dragleave="onDragLeave"
      >
        <!-- Column header -->
        <div class="px-3 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-200 dark:border-gray-600">
          <span class="text-xs font-semibold uppercase tracking-wide" :class="col.labelClass">
            {{ col.label }}
          </span>
          <span class="text-xs text-gray-400 bg-white dark:bg-gray-700 rounded-full px-1.5 py-0.5 border border-gray-200 dark:border-gray-600">
            {{ tasksByStatus(col.status).length }}
          </span>
        </div>

        <!-- Task cards -->
        <div class="flex flex-col gap-2 p-2 overflow-y-auto flex-1 min-h-16">
          <div
            v-for="task in tasksByStatus(col.status)"
            :key="task.id"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @dragend="onDragEnd"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
            :class="{ 'opacity-40': draggingId === task.id }"
            @click="openDetail(task)"
          >
            <p class="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">
              {{ task.title || task.description }}
            </p>
            <div class="mt-1.5 flex items-center justify-between">
              <span class="font-mono text-[10px] text-gray-300 dark:text-gray-500">{{ task.id?.slice(0, 8) }}</span>
              <span
                v-if="agentName(task.assigned_agent_id)"
                class="text-[10px] text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 rounded-full"
              >
                {{ agentName(task.assigned_agent_id) }}
              </span>
            </div>
          </div>

          <div v-if="!tasksByStatus(col.status).length" class="text-center text-gray-300 dark:text-gray-500 text-xs py-4 select-none">
            {{ $t('tasks.empty_column') }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Load more -->
  <div v-if="hasMore || loadingMore" class="flex justify-center pt-3 pb-1">
    <button
      @click="loadMoreTasks"
      :disabled="loadingMore"
      class="text-xs text-indigo-500 hover:text-indigo-700 px-4 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-700 hover:border-indigo-400 transition disabled:opacity-50"
    >{{ loadingMore ? $t('tasks.loading_more') : $t('tasks.load_more') }}</button>
  </div>

  <!-- Task Detail Modal -->
  <Teleport to="body">
    <div
      v-if="detailTask"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      @click.self="detailTask = null"
    >
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
        <div class="flex items-start justify-between mb-4">
          <h3 class="text-base font-bold text-gray-800 dark:text-gray-100 pr-4">{{ detailTask.title }}</h3>
          <button @click="detailTask = null" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">✕</button>
        </div>
        <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div v-if="detailTask.description">
            <p class="text-xs font-semibold text-gray-400 uppercase mb-1">{{ $t('tasks.description') }}</p>
            <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ detailTask.description }}</p>
          </div>
          <div v-if="detailTask.guidance">
            <p class="text-xs font-semibold text-gray-400 uppercase mb-1">{{ $t('tasks.guidance') }}</p>
            <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-xs font-mono">{{ detailTask.guidance }}</p>
          </div>
          <div v-if="detailTask.acceptance_criteria">
            <p class="text-xs font-semibold text-gray-400 uppercase mb-1">{{ $t('tasks.acceptance_criteria') }}</p>
            <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ detailTask.acceptance_criteria }}</p>
          </div>
          <div v-if="detailTask.result">
            <p class="text-xs font-semibold text-gray-400 uppercase mb-1">{{ $t('tasks.result') }}</p>
            <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-xs">{{ detailTask.result }}</p>
          </div>
          <div class="flex gap-4 text-xs text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
            <span>{{ $t('tasks.status_label') }}<span class="font-medium" :class="statusTextClass(detailTask.status)">{{ detailTask.status }}</span></span>
            <span v-if="detailTask.assigned_agent_id">
              {{ $t('tasks.assigned_label') }}{{ agentName(detailTask.assigned_agent_id) || detailTask.assigned_agent_id?.slice(0,8) }}
            </span>
            <span>{{ $t('tasks.updated_label') }}{{ formatTime(detailTask.updated_at) }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- New Task Modal -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      @click.self="showModal = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100 mb-5">{{ $t('tasks.modal_title') }}</h3>

        <form @submit.prevent="submitTask" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('tasks.title_field') }}</label>
            <input
              v-model="form.title"
              type="text"
              required
              :placeholder="$t('tasks.title_placeholder')"
              class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('tasks.desc_field') }}</label>
            <textarea
              v-model="form.description"
              rows="3"
              :placeholder="$t('tasks.desc_placeholder')"
              class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ $t('tasks.capabilities_field') }} <span class="text-gray-400 font-normal">{{ $t('tasks.capabilities_hint') }}</span>
            </label>
            <input
              v-model="form.capabilities"
              type="text"
              placeholder="coding, go, frontend"
              class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ $t('tasks.assign_field') }} <span class="text-gray-400 font-normal">{{ $t('tasks.optional') }}</span>
            </label>
            <select
              v-model="form.assignedAgentId"
              class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="">{{ $t('tasks.no_assign') }}</option>
              <optgroup label="AI Agents">
                <option v-for="agent in aiAgents" :key="agent.id" :value="agent.id">
                  {{ agent.name || agent.id.slice(0, 8) }}
                </option>
              </optgroup>
              <optgroup v-if="humanAgents.length" :label="$t('tasks.human_group')">
                <option v-for="agent in humanAgents" :key="agent.id" :value="agent.id">
                  👤 {{ agent.name || agent.id.slice(0, 8) }}
                </option>
              </optgroup>
            </select>
          </div>
          <p v-if="submitError" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            ⚠ {{ submitError }}
          </p>
          <div class="flex gap-2 pt-1">
            <button
              type="button"
              @click="showModal = false"
              class="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 py-2 rounded-lg text-sm transition"
            >
              {{ $t('tasks.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
            >
              {{ submitting ? $t('tasks.creating') : $t('tasks.create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePincerStore } from '../stores/pincer'
import { createTask, updateTaskStatus, fetchAllTasks, fetchProjects } from '../api'
import { usePolling } from '../composables/usePolling'

const { t } = useI18n()
const store = usePincerStore()

// ── Projects ──────────────────────────────────────────────────
const projects = ref([])
const selectedProjectId = ref('')

async function loadProjects() {
  try {
    const data = await fetchProjects()
    projects.value = Array.isArray(data) ? data : (data.projects || [])
  } catch {}
}
loadProjects()

// Fetch all tasks (not just active) for Kanban — paginated
const PAGE_SIZE = 50
const allTasks = ref([])
const taskOffset = ref(0)
const hasMore = ref(false)
const loadingMore = ref(false)

async function refreshAllTasks() {
  try {
    taskOffset.value = 0
    const result = await fetchAllTasks({ limit: PAGE_SIZE, offset: 0 })
    const arr = Array.isArray(result) ? result : (result?.tasks || [])
    allTasks.value = arr
    hasMore.value = arr.length === PAGE_SIZE
  } catch {
    allTasks.value = store.tasks
    hasMore.value = false
  }
}

async function loadMoreTasks() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const nextOffset = taskOffset.value + PAGE_SIZE
    const result = await fetchAllTasks({ limit: PAGE_SIZE, offset: nextOffset })
    const arr = Array.isArray(result) ? result : (result?.tasks || [])
    allTasks.value = [...allTasks.value, ...arr]
    taskOffset.value = nextOffset
    hasMore.value = arr.length === PAGE_SIZE
  } finally {
    loadingMore.value = false
  }
}

refreshAllTasks()
usePolling(refreshAllTasks, 5000)

const columns = computed(() => [
  { status: 'pending',  label: 'Pending',  labelClass: 'text-yellow-600' },
  { status: 'assigned', label: 'Assigned', labelClass: 'text-blue-600'   },
  { status: 'running',  label: 'Running',  labelClass: 'text-purple-600' },
  { status: 'done',     label: 'Done',     labelClass: 'text-green-600'  },
  { status: 'failed',   label: 'Failed',   labelClass: 'text-red-500'    },
])

const visibleTasks = computed(() => {
  const tasks = allTasks.value.length ? allTasks.value : store.tasks
  if (!selectedProjectId.value) return tasks
  if (selectedProjectId.value === '__none__') return tasks.filter(t => !t.project_id)
  return tasks.filter(t => t.project_id === selectedProjectId.value)
})

function tasksByStatus(status) {
  return visibleTasks.value
    .filter(t => t.status === status)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
}

function agentName(id) {
  if (!id) return ''
  const a = store.agents.find(a => a.id === id)
  return a?.name || ''
}

// ── Drag & Drop ──────────────────────────────────────────────
const draggingId = ref(null)
const dragOverCol = ref(null)
let dragLeaveTimer = null

function onDragStart(e, task) {
  draggingId.value = task.id
  e.dataTransfer.setData('taskId', task.id)
  e.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  draggingId.value = null
  dragOverCol.value = null
}

function onDragLeave() {
  dragLeaveTimer = setTimeout(() => { dragOverCol.value = null }, 80)
}

async function onDrop(e, newStatus) {
  clearTimeout(dragLeaveTimer)
  dragOverCol.value = null
  const taskId = e.dataTransfer.getData('taskId')
  if (!taskId) return
  const task = visibleTasks.value.find(t => t.id === taskId)
  if (!task || task.status === newStatus) return
  // Optimistic update
  const oldStatus = task.status
  task.status = newStatus
  try {
    await updateTaskStatus(taskId, newStatus, store.humanAgentId)
    await refreshAllTasks()
  } catch (err) {
    console.error('Failed to update task status:', err)
    task.status = oldStatus
    await refreshAllTasks()
  }
}

// ── Detail modal ─────────────────────────────────────────────
const detailTask = ref(null)
function openDetail(task) { detailTask.value = task }

// ── New task modal ────────────────────────────────────────────
const showModal = ref(false)
const submitting = ref(false)
const submitError = ref('')
const form = ref({ title: '', description: '', capabilities: '', assignedAgentId: '' })

const aiAgents = computed(() =>
  store.agents.filter(a => a.type !== 'human' && a.id !== store.humanAgentId)
)
const humanAgents = computed(() =>
  store.agents.filter(a => a.type === 'human' || a.id === store.humanAgentId)
)

function resetForm() {
  form.value = { title: '', description: '', capabilities: '', assignedAgentId: '' }
  submitError.value = ''
}

async function submitTask() {
  submitError.value = ''
  submitting.value = true
  try {
    const payload = { title: form.value.title }
    if (form.value.description) payload.description = form.value.description
    if (form.value.capabilities) {
      payload.required_capabilities = form.value.capabilities.split(',').map(s => s.trim()).filter(Boolean)
    }
    if (form.value.assignedAgentId) payload.assigned_agent_id = form.value.assignedAgentId
    await createTask(payload)
    showModal.value = false
    resetForm()
    await refreshAllTasks()
  } catch (e) {
    submitError.value = e.message
  } finally {
    submitting.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusTextClass(status) {
  const map = {
    pending:  'text-yellow-600',
    assigned: 'text-blue-600',
    running:  'text-purple-600',
    done:     'text-green-600',
    failed:   'text-red-500',
  }
  return map[status] || 'text-gray-500'
}
</script>
