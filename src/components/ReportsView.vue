<template>
  <div class="flex h-full gap-4 p-4 overflow-hidden">

    <!-- Left pane: Job list -->
    <div class="w-72 flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h2 class="font-semibold text-gray-700 dark:text-gray-200 text-sm">📋 {{ $t('reports.jobs') }}</h2>
        <button
          @click="loadJobs"
          :disabled="jobsLoading"
          class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
        >{{ jobsLoading ? '…' : '↺' }}</button>
      </div>
      <div v-if="jobsLoading && !jobs.length" class="flex-1 flex items-center justify-center text-sm text-gray-400">
        {{ $t('reports.loading') }}
      </div>
      <div v-else-if="jobsError" class="flex-1 flex items-center justify-center text-sm text-red-400 px-4 text-center">
        ⚠ {{ jobsError }}
      </div>
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
            <span
              class="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
              :class="job.enabled ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'"
            ></span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ job.name || job.id.slice(0, 8) }}</div>
              <div v-if="job.cron_expr" class="text-xs text-gray-400 font-mono truncate mt-0.5">{{ job.cron_expr }}</div>
              <div v-if="job.agent_id" class="text-xs text-indigo-400 truncate mt-0.5">{{ agentName(job.agent_id) }}</div>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Right pane: Reports list + detail -->
    <div class="flex-1 flex flex-col min-w-0 gap-4 overflow-hidden">

      <!-- No job selected -->
      <div v-if="!selectedJob" class="flex-1 flex items-center justify-center text-sm text-gray-400">
        {{ $t('reports.select_job') }}
      </div>

      <template v-else>
        <!-- Reports list -->
        <div class="flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
             :class="selectedReport ? 'h-56 flex-shrink-0' : 'flex-1'">
          <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
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
          <div v-else class="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
            <button
              v-for="r in reports"
              :key="r.id"
              @click="openReport(r)"
              class="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
              :class="selectedReport?.id === r.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm text-gray-700 dark:text-gray-200 truncate font-medium">{{ r.title || $t('reports.untitled') }}</span>
                <span class="text-xs text-gray-400 flex-shrink-0">{{ formatDate(r.created_at) }}</span>
              </div>
            </button>
          </div>
          <!-- Pagination -->
          <div v-if="totalReports > pageSize" class="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <button
              @click="prevPage"
              :disabled="reportsOffset === 0"
              class="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 transition px-2 py-1"
            >← {{ $t('reports.prev') }}</button>
            <span class="text-xs text-gray-400">{{ reportsOffset + 1 }}–{{ Math.min(reportsOffset + pageSize, totalReports) }} / {{ totalReports }}</span>
            <button
              @click="nextPage"
              :disabled="reportsOffset + pageSize >= totalReports"
              class="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 transition px-2 py-1"
            >{{ $t('reports.next') }} →</button>
          </div>
        </div>

        <!-- Report detail -->
        <div v-if="selectedReport" class="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 class="font-semibold text-gray-700 dark:text-gray-200 text-sm truncate">{{ reportDetail?.title || $t('reports.untitled') }}</h3>
            <div class="flex items-center gap-3 flex-shrink-0 ml-2">
              <span class="text-xs text-gray-400">{{ formatDate(reportDetail?.created_at) }}</span>
              <button @click="selectedReport = null" class="text-xs text-gray-400 hover:text-gray-600 transition">✕</button>
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
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { usePincerStore } from '../stores/pincer'
import { fetchReportJobs, fetchJobReports, fetchReport } from '../api'

const { t } = useI18n()
const store = usePincerStore()

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
  } catch (e) {
    reports.value = []
  } finally {
    reportsLoading.value = false
  }
}

function selectJob(job) {
  selectedJob.value = job
  selectedReport.value = null
  reportDetail.value = null
  reportsOffset.value = 0
  loadReports()
}

async function openReport(r) {
  selectedReport.value = r
  reportDetail.value = null
  detailLoading.value = true
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
