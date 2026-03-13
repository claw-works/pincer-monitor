<template>
  <div class="max-w-md">
    <!-- Already registered -->
    <div v-if="store.humanAgentId" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
          {{ initial }}
        </div>
        <div>
          <div class="font-semibold text-gray-800 dark:text-gray-200">{{ displayName }}</div>
          <div class="text-xs text-gray-400 font-mono">{{ store.humanAgentId.slice(0, 16) }}…</div>
        </div>
        <span class="ml-auto text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">{{ $t('profile.logged_in') }}</span>
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ $t('profile.logged_in_desc') }}
      </p>
      <div class="flex items-center gap-3">
        <button
          @click="logout"
          class="text-xs text-red-400 hover:text-red-600 transition"
        >
          {{ $t('profile.logout') }}
        </button>
        <span class="text-gray-200 dark:text-gray-600">|</span>
        <button
          @click="handleResetKey"
          :disabled="resetLoading"
          class="text-xs text-orange-400 hover:text-orange-600 disabled:opacity-50 transition"
        >
          {{ resetLoading ? '重置中…' : '🔑 重置 API Key' }}
        </button>
      </div>
      <p v-if="resetError" class="text-xs text-red-500">⚠ {{ resetError }}</p>
    </div>

    <!-- Not registered -->
    <div v-else class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
      <div>
        <h3 class="font-semibold text-gray-800 dark:text-gray-200 mb-1">{{ $t('profile.login_title') }}</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('profile.login_desc') }}</p>
      </div>

      <form @submit.prevent="register" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('profile.display_name') }}</label>
          <input
            v-model="name"
            type="text"
            :placeholder="$t('profile.name_placeholder')"
            required
            class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        <p v-if="error" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">⚠ {{ error }}</p>

        <button
          type="submit"
          :disabled="loading || !name.trim()"
          class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition text-sm"
        >
          {{ loading ? $t('profile.registering') : $t('profile.confirm_login') }}
        </button>
      </form>
    </div>
  </div>

  <!-- Reset Key Result Modal -->
  <Teleport to="body">
    <div
      v-if="showResetModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      @click.self="showResetModal = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div class="flex items-start justify-between">
          <h3 class="text-base font-bold text-gray-800 dark:text-gray-100">🔑 新 API Key 已生成</h3>
          <button @click="showResetModal = false" class="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          新 Key 已自动保存到本地。请复制并妥善保管，旧 Key 已失效。
        </p>
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 font-mono text-sm text-gray-800 dark:text-gray-200 break-all select-all">
          {{ newApiKey }}
        </div>
        <button
          @click="copyNewKey"
          class="w-full py-2 rounded-lg text-sm font-medium transition"
          :class="copied ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'"
        >
          {{ copied ? '✓ 已复制' : '复制 Key' }}
        </button>
        <p class="text-xs text-center text-gray-400">关闭后可在连接设置中查看当前 Key</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePincerStore } from '../stores/pincer'
import { registerHuman, resetApiKey } from '../api'
import { saveHumanAgentId, saveConnection, getPincerBase, saveIsHuman, getHumanName, saveHumanName } from '../config'

const { t } = useI18n()
const store = usePincerStore()
const name = ref('')
const loading = ref(false)
const error = ref('')

const displayName = computed(() => {
  // Priority: localStorage name > agent list name > humanAgentId prefix
  const savedName = getHumanName()
  if (savedName) return savedName
  const agent = store.agents.find(a => a.id === store.humanAgentId)
  return agent?.name || store.humanAgentId?.slice(0, 8) || ''
})

const initial = computed(() => displayName.value.charAt(0).toUpperCase())

async function register() {
  error.value = ''
  loading.value = true
  try {
    const agent = await registerHuman(name.value.trim())
    saveHumanAgentId(agent.id)
    store.humanAgentId = agent.id
    // Save name to localStorage so displayName shows it immediately
    if (agent.name) saveHumanName(agent.name)
    else saveHumanName(name.value.trim())
    saveIsHuman(true)
    store.isHuman = true
    await store.refreshAgents()
    // Start inbox WS now that humanAgentId is set
    store.connectInboxWS()
  } catch (e) {
    error.value = t('profile.register_error', { msg: e.message })
  } finally {
    loading.value = false
  }
}

function logout() {
  saveHumanAgentId('')
  store.humanAgentId = ''
  saveHumanName('')
  saveIsHuman(false)
  store.isHuman = false
}

// ── Human Identity Registration ───────────────────────────────
const humanName = ref('')
const registeringHuman = ref(false)
const registerHumanError = ref('')

async function registerHumanId() {
  if (!humanName.value.trim()) return
  registeringHuman.value = true
  registerHumanError.value = ''
  try {
    // POST /agents/register with type=human → v0.8.7 does upsert-by-name
    const data = await registerHuman(humanName.value.trim())
    if (data?.id) {
      saveHumanAgentId(data.id)
      store.humanAgentId = data.id
    }
    if (data?.name) saveHumanName(data.name)
    else saveHumanName(humanName.value.trim())
    saveIsHuman(true)
    store.isHuman = true
    humanName.value = ''
  } catch (e) {
    registerHumanError.value = e.message || '注册失败'
  } finally {
    registeringHuman.value = false
  }
}

function revokeHuman() {
  saveIsHuman(false)
  store.isHuman = false
}

// ── Reset API Key ─────────────────────────────────────────────
const showResetModal = ref(false)
const newApiKey = ref('')
const resetLoading = ref(false)
const resetError = ref('')
const copied = ref(false)

async function handleResetKey() {
  resetLoading.value = true
  resetError.value = ''
  newApiKey.value = ''
  copied.value = false
  try {
    const data = await resetApiKey()
    newApiKey.value = data.api_key
    // Auto-update localStorage
    saveConnection({ url: getPincerBase(), apiKey: data.api_key })
    showResetModal.value = true
  } catch (e) {
    resetError.value = e.message || '重置失败'
  } finally {
    resetLoading.value = false
  }
}

async function copyNewKey() {
  try {
    await navigator.clipboard.writeText(newApiKey.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // fallback: select text
  }
}
</script>
