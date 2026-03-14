<template>
  <div class="max-w-md">
    <!-- Already registered -->
    <div v-if="store.humanAgentId" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
      <!-- Avatar + Name row -->
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
          {{ initial }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-800 dark:text-gray-200 text-base">{{ displayName }}</div>
          <div class="text-xs text-gray-400 font-mono truncate mt-0.5">{{ store.humanAgentId }}</div>
        </div>
        <span class="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2.5 py-1 rounded-full font-medium flex-shrink-0">
          ✓ {{ $t('profile.logged_in') }}
        </span>
      </div>

      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ $t('profile.logged_in_desc') }}
      </p>

      <div class="flex items-center gap-4 pt-1">
        <button @click="logout" class="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-400 transition">
          {{ $t('profile.logout') }}
        </button>
        <span class="text-gray-200 dark:text-gray-600">|</span>
        <button
          @click="handleResetKey"
          :disabled="resetLoading"
          class="text-xs text-orange-400 hover:text-orange-600 dark:hover:text-orange-400 disabled:opacity-50 transition"
        >
          {{ resetLoading ? $t('profile.resetting_key') : '🔑 ' + $t('profile.reset_key') }}
        </button>
      </div>
      <p v-if="resetError" class="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">⚠ {{ resetError }}</p>
    </div>

    <!-- Not registered yet -->
    <div v-else class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
      <!-- Header -->
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-2xl flex-shrink-0">
          👤
        </div>
        <div>
          <h3 class="font-semibold text-gray-800 dark:text-gray-200">{{ $t('profile.login_title') }}</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ $t('profile.login_desc') }}</p>
        </div>
      </div>

      <form @submit.prevent="register" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {{ $t('profile.display_name') }}
          </label>
          <input
            v-model="name"
            type="text"
            :placeholder="$t('profile.name_placeholder')"
            required
            autofocus
            class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        <p v-if="error" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">⚠ {{ error }}</p>

        <button
          type="submit"
          :disabled="loading || !name.trim()"
          class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-2"
        >
          <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          {{ loading ? $t('profile.registering') : $t('profile.confirm_login') }}
        </button>
      </form>
    </div>
  </div>

  <!-- Reset Key Modal -->
  <Teleport to="body">
    <div
      v-if="showResetModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      @click.self="showResetModal = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div class="flex items-start justify-between">
          <h3 class="text-base font-bold text-gray-800 dark:text-gray-100">🔑 {{ $t('profile.new_key_title') }}</h3>
          <button @click="showResetModal = false" class="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('profile.new_key_desc') }}</p>
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2.5 font-mono text-sm text-gray-800 dark:text-gray-200 break-all select-all border border-gray-200 dark:border-gray-600">
          {{ newApiKey }}
        </div>
        <button
          @click="copyNewKey"
          class="w-full py-2.5 rounded-lg text-sm font-semibold transition"
          :class="copied ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'"
        >
          {{ copied ? '✓ ' + $t('profile.copied') : $t('profile.copy_key') }}
        </button>
        <p class="text-xs text-center text-gray-400">{{ $t('profile.new_key_footer') }}</p>
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

// ── Registration form ─────────────────────────────────────────
const name = ref('')
const loading = ref(false)
const error = ref('')

const displayName = computed(() => {
  const saved = getHumanName()
  if (saved) return saved
  const agent = store.agents.find(a => a.id === store.humanAgentId)
  return agent?.name || store.humanAgentId?.slice(0, 8) || ''
})

const initial = computed(() => displayName.value.charAt(0).toUpperCase() || '?')

async function register() {
  error.value = ''
  loading.value = true
  try {
    const agent = await registerHuman(name.value.trim())
    saveHumanAgentId(agent.id)
    store.humanAgentId = agent.id
    saveHumanName(agent.name || name.value.trim())
    saveIsHuman(true)
    store.isHuman = true
    await store.refreshAgents()
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
    saveConnection({ url: getPincerBase(), apiKey: data.api_key })
    showResetModal.value = true
  } catch (e) {
    resetError.value = e.message || t('profile.reset_error')
  } finally {
    resetLoading.value = false
  }
}

async function copyNewKey() {
  try {
    await navigator.clipboard.writeText(newApiKey.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* ignore */ }
}
</script>
