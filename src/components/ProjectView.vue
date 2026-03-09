<template>
  <div class="space-y-4">
    <!-- Loading -->
    <div v-if="loading" class="text-sm text-gray-400">加载中…</div>

    <!-- Empty -->
    <div v-else-if="projects.length === 0" class="text-sm text-gray-400 italic">
      暂无项目
    </div>

    <!-- Project list -->
    <div v-else class="space-y-4">
      <div
        v-for="project in projects"
        :key="project.id"
        class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <!-- Project header -->
        <button
          class="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left"
          @click="toggle(project.id)"
        >
          <div class="flex items-center gap-3">
            <span class="text-lg">📁</span>
            <div>
              <div class="font-semibold text-gray-800">{{ project.name }}</div>
              <div class="text-xs text-gray-400 mt-0.5">{{ project.id.slice(0, 8) }}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span
              v-if="taskCounts[project.id] !== undefined"
              class="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full"
            >
              {{ taskCounts[project.id] }} 个任务
            </span>
            <span class="text-gray-400 text-sm">{{ expanded.has(project.id) ? '▲' : '▼' }}</span>
          </div>
        </button>

        <!-- Task list (expanded) -->
        <div v-if="expanded.has(project.id)" class="border-t border-gray-100 bg-gray-50 px-5 py-3">
          <div v-if="loadingTasks.has(project.id)" class="text-xs text-gray-400 py-2">
            加载任务…
          </div>
          <div
            v-else-if="!projectTasks[project.id] || projectTasks[project.id].length === 0"
            class="text-xs text-gray-400 italic py-2"
          >
            该项目暂无任务
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="task in projectTasks[project.id]"
              :key="task.id"
              class="flex items-start gap-3 bg-white rounded-lg px-4 py-3 border border-gray-100"
            >
              <span :class="statusDot(task.status)" class="mt-1 w-2 h-2 rounded-full flex-shrink-0"></span>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium text-gray-800 truncate">{{ task.title }}</div>
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                  <span :class="statusBadge(task.status)" class="text-xs px-1.5 py-0.5 rounded font-medium">
                    {{ task.status }}
                  </span>
                  <span v-if="task.assigned_agent_id" class="text-xs text-gray-400">
                    → {{ task.assigned_agent_id.slice(0, 8) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchProjects, fetchProjectTasks } from '../api'

const projects = ref([])
const loading = ref(true)
const expanded = ref(new Set())
const projectTasks = ref({})
const loadingTasks = ref(new Set())
const taskCounts = ref({})

onMounted(async () => {
  try {
    const data = await fetchProjects()
    projects.value = Array.isArray(data) ? data : (data.projects || [])
  } finally {
    loading.value = false
  }
})

async function toggle(id) {
  if (expanded.value.has(id)) {
    expanded.value = new Set([...expanded.value].filter(x => x !== id))
    return
  }
  expanded.value = new Set([...expanded.value, id])

  if (projectTasks.value[id] !== undefined) return

  loadingTasks.value = new Set([...loadingTasks.value, id])
  try {
    const tasks = await fetchProjectTasks(id)
    projectTasks.value = {
      ...projectTasks.value,
      [id]: Array.isArray(tasks) ? tasks : (tasks.tasks || []),
    }
    taskCounts.value = { ...taskCounts.value, [id]: projectTasks.value[id].length }
  } finally {
    loadingTasks.value = new Set([...loadingTasks.value].filter(x => x !== id))
  }
}

function statusDot(status) {
  return {
    'bg-yellow-400': status === 'pending',
    'bg-blue-400': status === 'running',
    'bg-green-500': status === 'done',
    'bg-red-400': status === 'failed',
    'bg-gray-300': !['pending', 'running', 'done', 'failed'].includes(status),
  }
}

function statusBadge(status) {
  return {
    'bg-yellow-100 text-yellow-700': status === 'pending',
    'bg-blue-100 text-blue-700': status === 'running',
    'bg-green-100 text-green-700': status === 'done',
    'bg-red-100 text-red-700': status === 'failed',
    'bg-gray-100 text-gray-600': !['pending', 'running', 'done', 'failed'].includes(status),
  }
}
</script>
