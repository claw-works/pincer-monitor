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
      <button
        @click="logout"
        class="text-xs text-red-400 hover:text-red-600 transition"
      >
        {{ $t('profile.logout') }}
      </button>
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
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePincerStore } from '../stores/pincer'
import { registerHuman } from '../api'
import { saveHumanAgentId } from '../config'

const { t } = useI18n()
const store = usePincerStore()
const name = ref('')
const loading = ref(false)
const error = ref('')

const displayName = computed(() => {
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
}
</script>
