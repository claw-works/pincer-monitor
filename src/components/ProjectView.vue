<template>
  <div class="flex h-full">
    <!-- Left: project list -->
    <div class="w-52 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
      <div class="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
        项目
      </div>

      <!-- 未分类 -->
      <button
        @click="selectedProject = null"
        :class="[
          'flex items-center justify-between px-4 py-3 text-sm text-left transition hover:bg-gray-50',
          selectedProject === null
            ? 'bg-indigo-50 text-indigo-700 font-medium border-r-2 border-indigo-500'
            : 'text-gray-700',
        ]"
      >
        <span class="flex items-center gap-2"><span>📂</span> 未分类</span>
        <span class="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
          {{ unclassifiedTasks.length }}
        </span>
      </button>

      <!-- Loading -->
      <div v-if="loading" class="px-4 py-3 text-xs text-gray-400">加载中…</div>

      <!-- Project list -->
      <button
        v-for="project in projects"
        :key="project.id"
        @click="selectProject(project)"
        :class="[
          'flex items-center justify-between px-4 py-3 text-sm text-left transition hover:bg-gray-50',
          selectedProject?.id === project.id
            ? 'bg-indigo-50 text-indigo-700 font-medium border-r-2 border-indigo-500'
            : 'text-gray-700',
        ]"
      >
        <span class="flex items-center gap-2 min-w-0">
          <span class="flex-shrink-0">📁</span>
          <span class="truncate">{{ project.name }}</span>
        </span>
        <span
          v-if="projectTaskCounts[project.id] !== undefined"
          class="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1"
        >
          {{ projectTaskCounts[project.id] }}
        </span>
      </button>
    </div>

    <!-- Right: task list for selected project -->
    <div class="flex-1 overflow-y-auto p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-gray-800">
          {{ selectedProject ? selectedProject.name : '未分类任务' }}
        </h3>
        <span class="text-xs text-gray-400">{{ visibleTasks.length }} 个任务</span>
      </div>

      <!-- Loading tasks -->
      <div v-if="loadingTasks" class="text-sm text-gray-400">加载中…</div>

      <!-- No tasks -->
      <div v-else-if="visibleTasks.length === 0" class="text-sm text-gray-400 italic py-8 text-center">
        该分类暂无任务
      </div>

      <!-- Task rows -->
      <div v-else class="space-y-2">
        <div
          v-for="task in visibleTasks"
          :key="task.id"
          class="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start gap-3 shadow-sm"
        >
          <span :class="statusDot(task.status)" class="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"></span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800 truncate">{{ task.title || task.description }}</div>
            <div class="flex items-center gap-2 mt-1.5 flex-wrap">
              <span :class="statusBadge(task.status)" class="text-xs px-1.5 py-0.5 rounded font-medium">
                {{ task.status }}
              </span>
              <span v-if="task.assigned_agent_id" class="text-xs text-gray-400 font-mono">
                → {{ agentName(task.assigned_agent_id) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { usePincerStore } from '../stores/pincer'
import { fetchProjects, fetchProjectTasks } from '../api'

const store = usePincerStore()

const projects = ref([])
const loading = ref(true)
const selectedProject = ref(null) // null = 未分类
const projectTasks = ref({}) // { projectId: [task, ...] }
const loadingTasks = ref(false)
const projectTaskCounts = ref({})

// Tasks with no project_id from the global store
const unclassifiedTasks = computed(() =>
  store.tasks.filter(t => !t.project_id)
)

// Tasks to display on right panel
const visibleTasks = computed(() => {
  if (selectedProject.value === null) return unclassifiedTasks.value
  return projectTasks.value[selectedProject.value.id] || []
})

onMounted(async () => {
  try {
    const data = await fetchProjects()
    projects.value = Array.isArray(data) ? data : (data.projects || [])
    // Pre-count tasks for each project
    for (const p of projects.value) {
      fetchProjectTasks(p.id).then(tasks => {
        const arr = Array.isArray(tasks) ? tasks : (tasks.tasks || [])
        projectTaskCounts.value = { ...projectTaskCounts.value, [p.id]: arr.length }
        projectTasks.value = { ...projectTasks.value, [p.id]: arr }
      }).catch(() => {})
    }
  } finally {
    loading.value = false
  }
})

async function selectProject(project) {
  selectedProject.value = project
  if (!project) return
  if (projectTasks.value[project.id] !== undefined) return

  loadingTasks.value = true
  try {
    const tasks = await fetchProjectTasks(project.id)
    const arr = Array.isArray(tasks) ? tasks : (tasks.tasks || [])
    projectTasks.value = { ...projectTasks.value, [project.id]: arr }
    projectTaskCounts.value = { ...projectTaskCounts.value, [project.id]: arr.length }
  } finally {
    loadingTasks.value = false
  }
}

function agentName(id) {
  const agent = store.agents.find(a => a.id === id)
  return agent?.name || id.slice(0, 8)
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
