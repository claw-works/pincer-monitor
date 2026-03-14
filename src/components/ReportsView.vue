<template>
  <!-- Mobile: step-based navigation; Desktop: two-pane side-by-side -->
  <div class="flex h-full overflow-hidden">

    <!-- ── LEFT: Job list ─────────────────────────────────────── -->
    <!-- Mobile: full-screen when mobileStep='jobs'; hidden otherwise -->
    <!-- Desktop: fixed sidebar w-64 always visible -->
    <div
      class="flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden transition-all"
      :class="[
        'md:w-64 md:block',
        mobileStep === 'jobs' ? 'w-full flex' : 'hidden md:flex',
      ]"
    >
      <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <h2 class="font-semibold text-gray-700 dark:text-gray-200 text-sm">📋 {{ $t('reports.jobs') }}</h2>
        <button @click="loadJobs" :disabled="jobsLoading" class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
          {{ jobsLoading ? '…' : '↺' }}
        </button>
      </div>
      <div v-if="jobsLoading && !jobs.length" class="flex-1 flex items-center justify-center text-sm text-gray-400">
        {{ $t('reports.loading') }}
      </div>
      <div v-else-if="jobsError" class="flex-1 flex items-center justify-center text-sm text-red-400 px-4 text-center">⚠ {{ jobsError }}</div>
      <div v-else-if="!jobs.length" class="flex-1 flex items-center justify-center text-sm text-gray-400 px-4 text-center">
        {{ $t('reports.no_jobs') }}
      </div>
      <div v-else class="flex-1 overflow-y-auto">
        <button
          v-for="job in jobs"
          :key="job.id"
          @click="selectJob(job)"
          class="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition group"
          :class="selectedJob?.id === job.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-l-indigo-400' : ''"
        >
          <div class="flex items-start gap-2">
            <span class="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" :class="job.enabled ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'"></span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ job.name || job.id.slice(0, 8) }}</div>
              <div v-if="job.cron_expr" class="text-xs text-gray-400 font-mono truncate mt-0.5">{{ job.cron_expr }}</div>
              <div v-if="job.agent_id" class="text-xs text-indigo-400 truncate mt-0.5">{{ agentName(job.agent_id) }}</div>
            </div>
            <span class="text-gray-300 dark:text-gray-600 text-xs md:hidden">›</span>
          </div>
        </button>
      </div>
    </div>

    <!-- ── RIGHT: Reports list + detail ──────────────────────── -->
    <div
      class="flex-1 flex flex-col min-w-0 overflow-hidden"
      :class="mobileStep === 'jobs' ? 'hidden md:flex' : 'flex'"
    >
      <!-- Mobile back bar -->
      <div class="md:hidden flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <button
          @click="mobileStep === 'detail' ? (mobileStep = 'reports', selectedReport = null) : (mobileStep = 'jobs')"
          class="text-indigo-500 text-sm font-medium flex items-center gap-1"
        >
          ← {{ mobileStep === 'detail' ? (selectedJob?.name || $t('reports.jobs')) : $t('reports.jobs') }}
        </button>
        <span class="text-gray-400 text-sm truncate flex-1">
          {{ mobileStep === 'detail' ? (reportDetail?.title || $t('reports.untitled')) : (selectedJob?.name || '') }}
        </span>
      </div>

      <!-- No job selected (desktop only) -->
      <div v-if="!selectedJob" class="flex-1 flex items-center justify-center text-sm text-gray-400">
        {{ $t('reports.select_job') }}
      </div>

      <template v-else>
        <!-- Reports grid — hidden on mobile when viewing detail -->
        <div
          class="flex flex-col bg-white dark:bg-gray-800 overflow-hidden"
          :class="[
            selectedReport ? 'md:h-56 md:flex-shrink-0' : 'flex-1',
            mobileStep === 'detail' ? 'hidden md:flex' : 'flex',
            'md:border-b md:border-gray-100 dark:md:border-gray-700',
          ]"
        >
          <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <h2 class="font-semibold text-gray-700 dark:text-gray-200 text-sm truncate">
              📄 {{ selectedJob.name || selectedJob.id.slice(0, 8) }}
            </h2>
            <span class="text-xs text-gray-400 ml-2 flex-shrink-0">{{ reports.length }} {{ $t('reports.count') }}</span>
          </div>
          <div v-if="reportsLoading && !reports.length" class="flex-1 flex items-center justify-center text-sm text-gray-400">
            {{ $t('reports.loading') }}
          </div>
          <div v-else-if="!reports.length" class="flex-1 flex items-center justify-center text-sm text-gray-400">
            {{ $t('reports.no_reports') }}
          </div>
          <div v-else class="flex-1 overflow-y-auto p-3">
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              <button
                v-for="r in reports"
                :key="r.id"
                @click="openReport(r)"
                class="text-left p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 hover:border-indigo-200 dark:hover:border-indigo-700 transition active:scale-95"
                :class="selectedReport?.id === r.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600' : 'bg-white dark:bg-gray-800'"
              >
                <div class="text-sm text-gray-700 dark:text-gray-200 font-medium line-clamp-2 mb-1">{{ r.title || $t('reports.untitled') }}</div>
                <div class="text-xs text-gray-400">{{ formatDate(r.created_at) }}</div>
              </button>
            </div>
          </div>
          <div v-if="totalReports > pageSize" class="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <button @click="prevPage" :disabled="reportsOffset === 0" class="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 transition px-2 py-1">← {{ $t('reports.prev') }}</button>
            <span class="text-xs text-gray-400">{{ reportsOffset + 1 }}–{{ Math.min(reportsOffset + pageSize, totalReports) }} / {{ totalReports }}</span>
            <button @click="nextPage" :disabled="reportsOffset + pageSize >= totalReports" class="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 transition px-2 py-1">{{ $t('reports.next') }} →</button>
          </div>
        </div>

        <!-- Report detail — full pane on mobile when mobileStep='detail' -->
        <div
          v-if="selectedReport || mobileStep === 'detail'"
          class="flex-1 flex flex-col bg-white dark:bg-gray-800 overflow-hidden"
          :class="mobileStep !== 'detail' ? 'hidden md:flex' : 'flex'"
        >
          <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <h3 class="font-semibold text-gray-700 dark:text-gray-200 text-sm truncate">{{ reportDetail?.title || $t('reports.untitled') }}</h3>
            <div class="flex items-center gap-3 flex-shrink-0 ml-2">
              <span class="text-xs text-gray-400">{{ formatDate(reportDetail?.created_at) }}</span>
              <button @click="selectedReport = null; mobileStep = 'reports'" class="text-xs text-gray-400 hover:text-gray-600 transition hidden md:block">✕</button>
            </div>
          </div>
          <div v-if="detailLoading" class="flex-1 flex items-center justify-center text-sm text-gray-400">
            {{ $t('reports.loading') }}
          </div>
          <div v-else class="flex-1 overflow-y-auto px-5 py-4 prose prose-sm dark:prose-invert max-w-none"
               v-html="renderedContent">
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { usePincerStore } from '../stores/pincer'
import { fetchReportJobs, fetchJobReports, fetchReport } from '../api'

const { t } = useI18n()
const store = usePincerStore()

// Mobile navigation state: 'jobs' | 'reports' | 'detail'
const mobileStep = ref('jobs')

// Jobs
const jobs = ref([])
const jobsLoading = ref(false)
const jobsError = ref('')
const selectedJob = ref(null)

// Reports list
const reports = ref([])
const totalReports = ref(0)
const reportsLoading = ref(false)
const reportsOffset = ref(0)
const pageSize = 20

// Report detail
const selectedReport = ref(null)
const reportDetail = ref(null)
const detailLoading = ref(false)

const agentName = (id) => {
  const a = store.agents.find(a => a.id === id)
  return a?.name || id?.slice(0, 8) || id
}

const renderedContent = computed(() => {
  if (!reportDetail.value?.content) return ''
  const raw = marked.parse(reportDetail.value.content)
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
})

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

async function loadJobs() {
  jobsLoading.value = true
  jobsError.value = ''
  try {
    const data = await fetchReportJobs()
    jobs.value = Array.isArray(data) ? data : (data.jobs || data.report_jobs || [])
  } catch (e) {
    jobsError.value = e.message || 'Failed to load jobs'
  } finally {
    jobsLoading.value = false
  }
}

async function loadReports() {
  if (!selectedJob.value) return
  reportsLoading.value = true
  try {
    const data = await fetchJobReports(selectedJob.value.id, { limit: pageSize, offset: reportsOffset.value })
    reports.value = Array.isArray(data) ? data : (data.reports || [])
    totalReports.value = data.total ?? reports.value.length
  } catch { reports.value = [] } finally {
    reportsLoading.value = false
  }
}

function selectJob(job) {
  selectedJob.value = job
  selectedReport.value = null
  reportDetail.value = null
  reportsOffset.value = 0
  mobileStep.value = 'reports'
  loadReports()
}

async function openReport(r) {
  selectedReport.value = r
  reportDetail.value = null
  detailLoading.value = true
  mobileStep.value = 'detail'
  try {
    const data = await fetchReport(r.id)
    reportDetail.value = data
  } catch (e) {
    reportDetail.value = { title: r.title, content: `Error: ${e.message}`, created_at: r.created_at }
  } finally {
    detailLoading.value = false
  }
}

function prevPage() {
  if (reportsOffset.value === 0) return
  reportsOffset.value = Math.max(0, reportsOffset.value - pageSize)
  loadReports()
}

function nextPage() {
  if (reportsOffset.value + pageSize >= totalReports.value) return
  reportsOffset.value += pageSize
  loadReports()
}

onMounted(() => loadJobs())
</script>
