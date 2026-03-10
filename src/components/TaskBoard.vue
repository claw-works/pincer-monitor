<template>
  <div class="bg-white rounded-xl shadow p-4">
    <div class="font-semibold text-gray-700 mb-3 flex items-center justify-between">
      <span>任务看板</span>
      <button
        v-if="store.humanAgentId"
        @click="showModal = true"
        class="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition"
      >
        + 新建任务
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-gray-400 border-b">
            <th class="pb-2 pr-4">ID</th>
            <th class="pb-2 pr-4">Title</th>
            <th class="pb-2 pr-4">Status</th>
            <th class="pb-2 pr-4">Assigned</th>
            <th class="pb-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in visibleTasks" :key="task.id" class="border-b hover:bg-gray-50">
            <td class="py-2 pr-4 font-mono text-xs text-gray-400">{{ task.id?.slice(0,8) }}</td>
            <td class="py-2 pr-4 text-gray-800 max-w-xs truncate">{{ task.title || task.description }}</td>
            <td class="py-2 pr-4">
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="statusClass(task.status)"
              >{{ task.status }}</span>
            </td>
            <td class="py-2 pr-4 font-mono text-xs text-gray-400">
              {{ task.assigned_agent_id?.slice(0,8) || '—' }}
            </td>
            <td class="py-2 text-xs text-gray-400">{{ formatTime(task.updated_at) }}</td>
          </tr>
          <tr v-if="!visibleTasks.length">
            <td colspan="5" class="py-8 text-center text-gray-400">No active tasks</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

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
          <!-- Title -->
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

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="任务描述（可选）"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
            />
          </div>

          <!-- Required Capabilities -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              所需能力
              <span class="text-gray-400 font-normal">（逗号分隔）</span>
            </label>
            <input
              v-model="form.capabilities"
              type="text"
              placeholder="coding, go, frontend"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <!-- Assign to agent -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              指派给
              <span class="text-gray-400 font-normal">（可选）</span>
            </label>
            <select
              v-model="form.assignedAgentId"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="">— 不指派（hub 自动分配）—</option>
              <option v-for="agent in aiAgents" :key="agent.id" :value="agent.id">
                {{ agent.name || agent.id.slice(0,8) }}
              </option>
            </select>
          </div>

          <!-- Error -->
          <p v-if="submitError" class="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
            ⚠ {{ submitError }}
          </p>

          <!-- Buttons -->
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
import { createTask } from '../api'
import { usePolling } from '../composables/usePolling'

const store = usePincerStore()
usePolling(() => store.refreshTasks(), 5000)

// Filter tasks by current agent perspective
const visibleTasks = computed(() => {
  if (!store.selectedAgentId) return store.tasks
  return store.tasks.filter(t => t.assigned_agent_id === store.selectedAgentId)
})

const showModal = ref(false)
const submitting = ref(false)
const submitError = ref('')

const form = ref({
  title: '',
  description: '',
  capabilities: '',
  assignedAgentId: '',
})

const aiAgents = computed(() =>
  store.agents.filter(a => a.type !== 'human' && a.id !== store.humanAgentId)
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
    await store.refresh()
  } catch (e) {
    submitError.value = e.message
  } finally {
    submitting.value = false
  }
}

function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function statusClass(status) {
  const map = {
    active: 'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}
</script>
