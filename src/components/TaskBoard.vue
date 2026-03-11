<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 flex-shrink-0">
      <h2 class="font-semibold text-gray-700">任务看板</h2>
      <button
        v-if="store.humanAgentId"
        @click="showModal = true"
        class="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition"
      >
        + 新建任务
      </button>
    </div>

    <!-- Kanban columns -->
    <div class="flex gap-3 overflow-x-auto pb-2 flex-1">
      <div
        v-for="col in columns"
        :key="col.status"
        class="flex flex-col flex-shrink-0 w-56 rounded-xl bg-gray-50 border border-gray-200"
        @dragover.prevent
        @drop="onDrop($event, col.status)"
        :class="{ 'ring-2 ring-indigo-400 bg-indigo-50': dragOverCol === col.status }"
        @dragenter="dragOverCol = col.status"
        @dragleave="onDragLeave"
      >
        <!-- Column header -->
        <div class="px-3 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-200">
          <span class="text-xs font-semibold uppercase tracking-wide" :class="col.labelClass">
            {{ col.label }}
          </span>
          <span class="text-xs text-gray-400 bg-white rounded-full px-1.5 py-0.5 border border-gray-200">
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
            class="bg-white rounded-lg shadow-sm border border-gray-100 p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
            :class="{ 'opacity-40': draggingId === task.id }"
            @click="openDetail(task)"
          >
            <p class="text-xs font-medium text-gray-800 leading-snug line-clamp-2">
              {{ task.title || task.description }}
            </p>
            <div class="mt-1.5 flex items-center justify-between">
              <span class="font-mono text-[10px] text-gray-300">{{ task.id?.slice(0, 8) }}</span>
              <span
                v-if="agentName(task.assigned_agent_id)"
                class="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 rounded-full"
              >
                {{ agentName(task.assigned_agent_id) }}
              </span>
            </div>
          </div>

          <div v-if="!tasksByStatus(col.status).length" class="text-center text-gray-300 text-xs py-4 select-none">
            空
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Task Detail Modal -->
  <Teleport to="body">
    <div
      v-if="detailTask"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      @click.self="detailTask = null"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
        <div class="flex items-start justify-between mb-4">
          <h3 class="text-base font-bold text-gray-800 pr-4">{{ detailTask.title }}</h3>
          <button @click="detailTask = null" class="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div class="space-y-3 text-sm text-gray-700">
          <div v-if="detailTask.description">
            <p class="text-xs font-semibold text-gray-400 uppercase mb-1">描述</p>
            <p class="text-gray-700 whitespace-pre-wrap">{{ detailTask.description }}</p>
          </div>
          <div v-if="detailTask.guidance">
            <p class="text-xs font-semibold text-gray-400 uppercase mb-1">执行指导</p>
            <p class="text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 text-xs font-mono">{{ detailTask.guidance }}</p>
          </div>
          <div v-if="detailTask.acceptance_criteria">
            <p class="text-xs font-semibold text-gray-400 uppercase mb-1">验收标准</p>
            <p class="text-gray-700 whitespace-pre-wrap">{{ detailTask.acceptance_criteria }}</p>
          </div>
          <div v-if="detailTask.result">
            <p class="text-xs font-semibold text-gray-400 uppercase mb-1">结果</p>
            <p class="text-gray-700 whitespace-pre-wrap bg-green-50 rounded-lg p-3 text-xs">{{ detailTask.result }}</p>
          </div>
          <div class="flex gap-4 text-xs text-gray-400 pt-2 border-t">
            <span>状态：<span class="font-medium" :class="statusTextClass(detailTask.status)">{{ detailTask.status }}</span></span>
            <span v-if="detailTask.assigned_agent_id">
              指派：{{ agentName(detailTask.assigned_agent_id) || detailTask.assigned_agent_id?.slice(0,8) }}
            </span>
            <span>更新：{{ formatTime(detailTask.updated_at) }}</span>
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
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-5">新建任务</h3>

        <form @submit.prevent="submitTask" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
            <input
              v-model="form.title"
              type="text"
              required
              placeholder="任务标题"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="任务描述（可选）"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              所需能力 <span class="text-gray-400 font-normal">（逗号分隔）</span>
            </label>
            <input
              v-model="form.capabilities"
              type="text"
              placeholder="coding, go, frontend"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              指派给 <span class="text-gray-400 font-normal">（可选）</span>
            </label>
            <select
              v-model="form.assignedAgentId"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="">— 不指派（hub 自动分配）—</option>
              <optgroup label="AI Agents">
                <option v-for="agent in aiAgents" :key="agent.id" :value="agent.id">
                  {{ agent.name || agent.id.slice(0, 8) }}
                </option>
              </optgroup>
              <optgroup v-if="humanAgents.length" label="人类">
                <option v-for="agent in humanAgents" :key="agent.id" :value="agent.id">
                  👤 {{ agent.name || agent.id.slice(0, 8) }}
                </option>
              </optgroup>
            </select>
          </div>
          <p v-if="submitError" class="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
            ⚠ {{ submitError }}
          </p>
          <div class="flex gap-2 pt-1">
            <button
              type="button"
              @click="showModal = false"
              class="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 py-2 rounded-lg text-sm transition"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
            >
              {{ submitting ? '创建中…' : '创建' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePincerStore } from '../stores/pincer'
import { createTask, updateTaskStatus, fetchAllTasks } from '../api'
import { usePolling } from '../composables/usePolling'

const store = usePincerStore()

// Fetch all tasks (not just active) for Kanban
const allTasks = ref([])
async function refreshAllTasks() {
  try {
    const result = await fetchAllTasks()
    allTasks.value = Array.isArray(result) ? result : (result?.tasks || [])
  } catch {
    // fallback to store tasks
    allTasks.value = store.tasks
  }
}
refreshAllTasks()
usePolling(refreshAllTasks, 5000)

const columns = [
  { status: 'pending',  label: 'Pending',  labelClass: 'text-yellow-600' },
  { status: 'assigned', label: 'Assigned', labelClass: 'text-blue-600'   },
  { status: 'running',  label: 'Running',  labelClass: 'text-purple-600' },
  { status: 'done',     label: 'Done',     labelClass: 'text-green-600'  },
  { status: 'failed',   label: 'Failed',   labelClass: 'text-red-500'    },
]

const visibleTasks = computed(() => {
  return allTasks.value.length ? allTasks.value : store.tasks
})

function tasksByStatus(status) {
  return visibleTasks.value.filter(t => t.status === status)
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
  task.status = newStatus
  try {
    await updateTaskStatus(taskId, newStatus)
    await refreshAllTasks()
  } catch (err) {
    console.error('Failed to update task status:', err)
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
