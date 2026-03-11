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

    <!-- Right: project info + task list -->
    <div class="flex-1 overflow-y-auto p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-gray-800">
          {{ selectedProject ? selectedProject.name : '未分类任务' }}
        </h3>
        <span class="text-xs text-gray-400">{{ visibleTasks.length }} 个任务</span>
      </div>

      <!-- Tab bar (only when a project is selected) -->
      <div v-if="selectedProject" class="flex gap-1 mb-4 border-b border-gray-100 pb-0">
        <button
          v-for="tab in ['tasks', 'reports']"
          :key="tab"
          @click="activeTab = tab; tab === 'reports' && loadReports()"
          :class="[
            'px-3 py-1.5 text-xs font-medium rounded-t transition',
            activeTab === tab
              ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
              : 'text-gray-500 hover:text-gray-700'
          ]"
        >{{ tab === 'tasks' ? '📋 任务' : '📊 日报' }}</button>
      </div>

      <!-- Project meta: repo + overview -->
      <div v-if="selectedProject" class="mb-4 bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-2 text-sm">
        <div v-if="selectedProject.description" class="text-gray-600">{{ selectedProject.description }}</div>
        <div v-if="selectedProject.repo" class="flex items-center gap-1.5">
          <span class="text-xs text-gray-400 font-semibold uppercase tracking-wide">Repo</span>
          <a :href="selectedProject.repo" target="_blank" class="text-xs text-indigo-500 hover:underline truncate">
            {{ selectedProject.repo }}
          </a>
        </div>
        <div v-if="selectedProject.overview">
          <p class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Overview</p>
          <p class="text-xs text-gray-600 whitespace-pre-wrap bg-white rounded-lg px-3 py-2 border border-gray-100">{{ selectedProject.overview }}</p>
        </div>
      </div>

      <!-- Loading tasks -->
      <div v-if="loadingTasks && activeTab === 'tasks'" class="text-sm text-gray-400">加载中…</div>

      <!-- No tasks -->
      <div v-else-if="activeTab === 'tasks' && visibleTasks.length === 0" class="text-sm text-gray-400 italic py-8 text-center">
        该分类暂无任务
      </div>

      <!-- Task rows -->
      <div v-else-if="activeTab === 'tasks'" class="space-y-2">
        <div
          v-for="task in visibleTasks"
          :key="task.id"
          class="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          @click="detailTask = task"
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

      <!-- Reports tab -->
      <div v-if="selectedProject && activeTab === 'reports'">
        <div v-if="loadingReports" class="text-sm text-gray-400 py-4">加载日报中…</div>
        <div v-else-if="reports.length === 0" class="text-sm text-gray-400 italic py-8 text-center">
          暂无日报（每天 23:30 生成一次）
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="report in reports"
            :key="report.date"
            class="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm"
          >
            <div class="text-xs font-semibold text-indigo-600 mb-2">📅 {{ report.date }}</div>
            <p class="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{{ report.content }}</p>
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
        <div class="space-y-3 text-sm">
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
          <div class="flex gap-4 text-xs text-gray-400 pt-2 border-t flex-wrap">
            <span>状态：<span class="font-medium text-gray-600">{{ detailTask.status }}</span></span>
            <span v-if="detailTask.assigned_agent_id">指派：{{ agentName(detailTask.assigned_agent_id) }}</span>
            <span>更新：{{ new Date(detailTask.updated_at).toLocaleString('zh-CN') }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePincerStore } from '../stores/pincer'
import { fetchProjects, fetchProjectTasks, fetchProjectReports } from '../api'

const store = usePincerStore()

const projects = ref([])
const loading = ref(true)
const selectedProject = ref(null)
const projectTasks = ref({})
const loadingTasks = ref(false)
const projectTaskCounts = ref({})
const detailTask = ref(null)
const activeTab = ref('tasks')
const reports = ref([])
const loadingReports = ref(false)

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
  activeTab.value = 'tasks'
  reports.value = []
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

async function loadReports() {
  if (!selectedProject.value) return
  loadingReports.value = true
  try {
    const data = await fetchProjectReports(selectedProject.value.id)
    reports.value = Array.isArray(data) ? data : (data.reports || [])
  } catch (e) {
    reports.value = []
  } finally {
    loadingReports.value = false
  }
}
</script>
