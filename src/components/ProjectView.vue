<template>
  <div class="flex h-full">
    <!-- Left: project list -->
    <div class="w-52 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto flex flex-col">
      <div class="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
        {{ $t('projects.section_title') }}
      </div>

      <!-- 未分类 -->
      <button
        @click="selectedProject = null"
        :class="[
          'flex items-center justify-between px-4 py-3 text-sm text-left transition hover:bg-gray-50 dark:hover:bg-gray-700',
          selectedProject === null
            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium border-r-2 border-indigo-500'
            : 'text-gray-700 dark:text-gray-300',
        ]"
      >
        <span class="flex items-center gap-2"><span>📂</span> {{ $t('projects.unclassified') }}</span>
        <span class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
          {{ unclassifiedTasks.length }}
        </span>
      </button>

      <!-- Loading -->
      <div v-if="loading" class="px-4 py-3 text-xs text-gray-400">{{ $t('projects.loading') }}</div>

      <!-- Project list -->
      <button
        v-for="project in projects"
        :key="project.id"
        @click="selectProject(project)"
        :class="[
          'flex items-center justify-between px-4 py-3 text-sm text-left transition hover:bg-gray-50 dark:hover:bg-gray-700',
          selectedProject?.id === project.id
            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium border-r-2 border-indigo-500'
            : 'text-gray-700 dark:text-gray-300',
        ]"
      >
        <span class="flex items-center gap-2 min-w-0">
          <span class="flex-shrink-0">📁</span>
          <span class="truncate">{{ project.name }}</span>
        </span>
        <span
          v-if="projectTaskCounts[project.id] !== undefined"
          class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1"
        >
          {{ projectTaskCounts[project.id] }}
        </span>
      </button>
    </div>

    <!-- Right: project info + task list -->
    <div class="flex-1 overflow-y-auto p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-gray-800 dark:text-gray-200">
          {{ selectedProject ? selectedProject.name : $t('projects.unclassified_tasks') }}
        </h3>
        <span class="text-xs text-gray-400">{{ $t('projects.task_count', { n: visibleTasks.length }) }}</span>
      </div>

      <!-- Tab bar (only when a project is selected) -->
      <div v-if="selectedProject" class="flex gap-1 mb-4 border-b border-gray-100 dark:border-gray-700 pb-0">
        <button
          v-for="tab in ['tasks', 'hierarchy', 'reports']"
          :key="tab"
          @click="activeTab = tab; tab === 'reports' && loadReports(); tab === 'hierarchy' && loadHierarchy()"
          :class="[
            'px-3 py-1.5 text-xs font-medium rounded-t transition',
            activeTab === tab
              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-b-2 border-indigo-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          ]"
        >{{ tab === 'tasks' ? $t('projects.tab_tasks') : tab === 'hierarchy' ? $t('projects.tab_hierarchy') : $t('projects.tab_reports') }}</button>
      </div>

      <!-- Project meta: repo + overview -->
      <div v-if="selectedProject" class="mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 p-4 space-y-2 text-sm">
        <div v-if="selectedProject.description" class="text-gray-600 dark:text-gray-400">{{ selectedProject.description }}</div>
        <div v-if="selectedProject.repo" class="flex items-center gap-1.5">
          <span class="text-xs text-gray-400 font-semibold uppercase tracking-wide">Repo</span>
          <a :href="selectedProject.repo" target="_blank" class="text-xs text-indigo-500 hover:underline truncate">
            {{ selectedProject.repo }}
          </a>
        </div>
        <div v-if="selectedProject.overview">
          <p class="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Overview</p>
          <p class="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-600">{{ selectedProject.overview }}</p>
        </div>
      </div>

      <!-- Loading tasks -->
      <div v-if="loadingTasks && activeTab === 'tasks'" class="text-sm text-gray-400">{{ $t('projects.loading_tasks') }}</div>

      <!-- No tasks -->
      <div v-else-if="activeTab === 'tasks' && visibleTasks.length === 0" class="text-sm text-gray-400 italic py-8 text-center">
        {{ $t('projects.no_tasks') }}
      </div>

      <!-- Task rows -->
      <div v-else-if="activeTab === 'tasks'" class="space-y-2">
        <div
          v-for="task in visibleTasks"
          :key="task.id"
          class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-600 px-4 py-3 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          @click="detailTask = task"
        >
          <span :class="statusDot(task.status)" class="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"></span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ task.title || task.description }}</div>
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

      <!-- Hierarchy tab (Epic → Story → Task) -->
      <div v-if="activeTab === 'hierarchy'" class="space-y-3">
        <div v-if="hierarchyLoading" class="text-sm text-gray-400 py-4">{{ $t('projects.loading') }}</div>
        <div v-else-if="!epics.length" class="text-sm text-gray-400 italic py-8 text-center">
          {{ $t('projects.no_epics') }}
        </div>
        <div v-else>
          <div
            v-for="epic in epics"
            :key="epic.id"
            class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-600 shadow-sm overflow-hidden"
          >
            <!-- Epic header -->
            <div
              class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition select-none"
              @click="toggleEpic(epic.id)"
            >
              <span class="text-gray-400 text-xs w-3">{{ expandedEpics.has(epic.id) ? '▼' : '▶' }}</span>
              <span class="flex-1 font-semibold text-gray-800 dark:text-gray-200 text-sm">{{ epicTitle(epic) }}</span>
              <span :class="statusClass(epic.status)" class="text-xs px-2 py-0.5 rounded-full font-medium">{{ epic.status }}</span>
              <!-- Progress bar -->
              <div v-if="epicProgress(epic)" class="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
                <div class="w-20 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div class="h-full bg-indigo-500 rounded-full transition-all" :style="{ width: epicProgress(epic).pct + '%' }"></div>
                </div>
                <span>{{ epicProgress(epic).done }}/{{ epicProgress(epic).total }}</span>
              </div>
            </div>

            <!-- Stories under this epic -->
            <div v-if="expandedEpics.has(epic.id)" class="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/50">
              <div v-if="storiesLoading[epic.id]" class="px-6 py-3 text-xs text-gray-400">{{ $t('projects.loading') }}</div>
              <div v-else-if="!stories[epic.id]?.length" class="px-6 py-3 text-xs text-gray-400 italic">{{ $t('projects.no_stories') }}</div>
              <div
                v-for="story in (stories[epic.id] || [])"
                :key="story.id"
              >
                <!-- Story header -->
                <div
                  class="flex items-center gap-3 pl-8 pr-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition select-none"
                  @click="toggleStory(story.id, epic.id)"
                >
                  <span class="text-gray-400 text-xs w-3">{{ expandedStories.has(story.id) ? '▼' : '▶' }}</span>
                  <span class="flex-1 text-sm text-gray-700 dark:text-gray-300">{{ storyTitle(story) }}</span>
                  <span :class="statusClass(story.status)" class="text-xs px-2 py-0.5 rounded-full font-medium">{{ story.status }}</span>
                </div>

                <!-- Tasks under this story -->
                <div v-if="expandedStories.has(story.id)" class="divide-y divide-gray-50 dark:divide-gray-700/30">
                  <div v-if="tasksLoading[story.id]" class="pl-14 pr-4 py-2 text-xs text-gray-400">{{ $t('projects.loading') }}</div>
                  <div v-else-if="!childTasks[story.id]?.length" class="pl-14 pr-4 py-2 text-xs text-gray-400 italic">{{ $t('projects.no_tasks') }}</div>
                  <div
                    v-for="task in (childTasks[story.id] || [])"
                    :key="task.id"
                    class="pl-14 pr-4 py-2"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <span class="text-sm text-gray-700 dark:text-gray-300 flex-1">{{ task.title }}</span>
                      <span :class="statusClass(task.status)" class="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0">{{ task.status }}</span>
                    </div>
                    <!-- user_story -->
                    <div v-if="task.user_story" class="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">
                      📖 {{ task.user_story }}
                    </div>
                    <!-- acceptance_criteria -->
                    <div v-if="task.acceptance_criteria" class="mt-1.5">
                      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">验收标准</p>
                      <ul class="space-y-0.5">
                        <li
                          v-for="(line, i) in criteriaLines(task.acceptance_criteria)"
                          :key="i"
                          class="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400"
                        >
                          <span class="text-green-400 flex-shrink-0 mt-0.5">✓</span>{{ line }}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reports tab -->
      <div v-if="selectedProject && activeTab === 'reports'">
        <div v-if="loadingReports" class="text-sm text-gray-400 py-4">{{ $t('projects.loading_reports') }}</div>
        <div v-else-if="reports.length === 0" class="text-sm text-gray-400 italic py-8 text-center">
          {{ $t('projects.no_reports') }}
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="report in reports"
            :key="report.date"
            class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-600 px-4 py-3 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-700 cursor-pointer transition-all"
            @click="selectedReport = report"
          >
            <div class="flex items-center justify-between mb-1.5">
              <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">📅 {{ report.date }}</div>
              <span class="text-xs text-gray-400">{{ $t('projects.click_detail') }}</span>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">{{ summaryPreview(report) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Report Detail Modal -->
  <Teleport to="body">
    <div
      v-if="selectedReport"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      @click.self="selectedReport = null"
    >
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 class="text-base font-bold text-gray-800 dark:text-gray-100">📅 {{ selectedReport.date }} {{ $t('projects.report_suffix') }}</h3>
          <button @click="selectedReport = null" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">✕</button>
        </div>
        <div
          class="markdown-body overflow-y-auto flex-1 text-gray-700 dark:text-gray-300 text-sm leading-relaxed"
          v-html="renderMarkdown(selectedReport)"
        ></div>
      </div>
    </div>
  </Teleport>

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
        <div class="space-y-3 text-sm">
          <div v-if="detailTask.description">
            <p class="text-xs font-semibold text-gray-400 uppercase mb-1">{{ $t('projects.description') }}</p>
            <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ detailTask.description }}</p>
          </div>
          <div v-if="detailTask.guidance">
            <p class="text-xs font-semibold text-gray-400 uppercase mb-1">{{ $t('projects.guidance') }}</p>
            <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-xs font-mono">{{ detailTask.guidance }}</p>
          </div>
          <div v-if="detailTask.acceptance_criteria">
            <p class="text-xs font-semibold text-gray-400 uppercase mb-1">{{ $t('projects.acceptance_criteria') }}</p>
            <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ detailTask.acceptance_criteria }}</p>
          </div>
          <div v-if="detailTask.result">
            <p class="text-xs font-semibold text-gray-400 uppercase mb-1">{{ $t('projects.result') }}</p>
            <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-xs">{{ detailTask.result }}</p>
          </div>
          <div class="flex gap-4 text-xs text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600 flex-wrap">
            <span>{{ $t('projects.status_label') }}<span class="font-medium text-gray-600 dark:text-gray-300">{{ detailTask.status }}</span></span>
            <span v-if="detailTask.assigned_agent_id">{{ $t('projects.assigned_label') }}{{ agentName(detailTask.assigned_agent_id) }}</span>
            <span>{{ $t('projects.updated_label') }}{{ new Date(detailTask.updated_at).toLocaleString('zh-CN') }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { usePincerStore } from '../stores/pincer'
import { fetchProjects, fetchProjectTasks, fetchProjectReports, fetchTasksByParent, fetchTasksByType } from '../api'

useI18n()
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
const selectedReport = ref(null)

// ── Hierarchy (Epic → Story → Task) ─────────────────────────
const epics = ref([])
const hierarchyLoading = ref(false)
const expandedEpics = ref(new Set())
const expandedStories = ref(new Set())
const stories = ref({})       // epic.id → Story[]
const storiesLoading = ref({}) // epic.id → bool
const childTasks = ref({})    // story.id → Task[]
const tasksLoading = ref({})  // story.id → bool

function epicTitle(t) { return t.title.replace(/^\[Epic\]\s*/i, '') }
function storyTitle(t) { return t.title.replace(/^\[Story\]\s*/i, '') }

function statusClass(s) {
  const m = {
    pending: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    running: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    review: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    done: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    failed: 'bg-red-100 dark:bg-red-900/30 text-red-500',
    rejected: 'bg-red-100 dark:bg-red-900/30 text-red-500',
  }
  return m[s] || 'bg-gray-100 text-gray-400'
}

function epicProgress(epic) {
  const children = stories.value[epic.id]
  if (!children?.length) return null
  const done = children.filter(t => t.status === 'done').length
  return { done, total: children.length, pct: Math.round(done / children.length * 100) }
}

function criteriaLines(text) {
  if (!text) return []
  return text.split('\n').map(l => l.replace(/^[-*]\s*|\[.\]\s*/g, '').trim()).filter(Boolean)
}

async function loadHierarchy() {
  hierarchyLoading.value = true
  // Reset expanded state when reloading
  expandedEpics.value = new Set()
  expandedStories.value = new Set()
  stories.value = {}
  childTasks.value = {}
  try {
    // Fetch all tasks, filter epics client-side
    const data = await fetchTasksByType('epic')
    const all = Array.isArray(data) ? data : (data.tasks || [])
    // Filter: must be epic type/title
    let epicList = all.filter(t => t.task_type === 'epic' || /^\[epic\]/i.test(t.title))
    // Filter by selected project (or unclassified when no project selected)
    if (selectedProject.value) {
      epicList = epicList.filter(t => t.project_id === selectedProject.value.id)
    } else {
      epicList = epicList.filter(t => !t.project_id)
    }
    epics.value = epicList
  } finally {
    hierarchyLoading.value = false
  }
}

async function toggleEpic(epicId) {
  if (expandedEpics.value.has(epicId)) {
    expandedEpics.value = new Set([...expandedEpics.value].filter(id => id !== epicId))
    return
  }
  expandedEpics.value = new Set([...expandedEpics.value, epicId])
  if (!stories.value[epicId]) {
    storiesLoading.value = { ...storiesLoading.value, [epicId]: true }
    try {
      const data = await fetchTasksByParent(epicId)
      const list = Array.isArray(data) ? data : (data.tasks || [])
      stories.value = { ...stories.value, [epicId]: list }
    } finally {
      storiesLoading.value = { ...storiesLoading.value, [epicId]: false }
    }
  }
}

async function toggleStory(storyId, epicId) {
  if (expandedStories.value.has(storyId)) {
    expandedStories.value = new Set([...expandedStories.value].filter(id => id !== storyId))
    return
  }
  expandedStories.value = new Set([...expandedStories.value, storyId])
  if (!childTasks.value[storyId]) {
    tasksLoading.value = { ...tasksLoading.value, [storyId]: true }
    try {
      const data = await fetchTasksByParent(storyId)
      const list = Array.isArray(data) ? data : (data.tasks || [])
      childTasks.value = { ...childTasks.value, [storyId]: list }
    } finally {
      tasksLoading.value = { ...tasksLoading.value, [storyId]: false }
    }
  }
}


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
  // Reset hierarchy state when switching projects
  epics.value = []
  expandedEpics.value = new Set()
  expandedStories.value = new Set()
  stories.value = {}
  childTasks.value = {}
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

function summaryPreview(report) {
  const text = report.summary || report.content || ''
  // strip markdown syntax for preview, take first ~3 non-empty lines
  const plain = text.replace(/[#*`_>~\[\]]/g, '').trim()
  const lines = plain.split('\n').filter(l => l.trim()).slice(0, 3)
  return lines.join(' · ')
}

function renderMarkdown(report) {
  const text = report.summary || report.content || ''
  const html = marked.parse(text)
  return DOMPurify.sanitize(html)
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

<style scoped>
/* Markdown content styles inside report modal */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 0.5em;
  color: #1f2937;
}
.dark .markdown-body :deep(h1),
.dark .markdown-body :deep(h2),
.dark .markdown-body :deep(h3) {
  color: #f3f4f6;
}
.markdown-body :deep(h1) { font-size: 1.1rem; }
.markdown-body :deep(h2) { font-size: 1rem; }
.markdown-body :deep(h3) { font-size: 0.9rem; }
.markdown-body :deep(p) {
  margin-bottom: 0.75em;
  line-height: 1.6;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.5em;
  margin-bottom: 0.75em;
}
.markdown-body :deep(li) { margin-bottom: 0.25em; }
.markdown-body :deep(code) {
  background: #f3f4f6;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.8em;
  font-family: monospace;
}
.dark .markdown-body :deep(code) {
  background: #374151;
}
.markdown-body :deep(pre) {
  background: #f3f4f6;
  padding: 0.75em 1em;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 0.75em;
}
.dark .markdown-body :deep(pre) {
  background: #1f2937;
}
.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
}
.markdown-body :deep(blockquote) {
  border-left: 3px solid #6366f1;
  padding-left: 0.75em;
  color: #6b7280;
  margin: 0.5em 0;
}
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 1em 0;
}
.dark .markdown-body :deep(hr) {
  border-top-color: #374151;
}
.markdown-body :deep(strong) { font-weight: 600; color: #111827; }
.dark .markdown-body :deep(strong) { color: #f9fafb; }
</style>
