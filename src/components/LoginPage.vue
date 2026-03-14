<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-8">
      <!-- Logo + Title -->
      <div class="flex flex-col items-center mb-8">
        <span class="text-5xl mb-3">🦀</span>
        <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ $t('app.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ step === 'connect' ? $t('login.connect_subtitle') : $t('login.select_room_subtitle') }}
        </p>
      </div>

      <!-- Step indicator -->
      <div class="flex items-center justify-center gap-2 mb-7">
        <div class="flex items-center gap-1.5">
          <div :class="step === 'connect' ? 'bg-indigo-600 text-white' : 'bg-green-500 text-white'"
               class="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors">
            {{ step === 'connect' ? '1' : '✓' }}
          </div>
          <span :class="step === 'connect' ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-green-500'"
                class="text-xs transition-colors">{{ $t('login.step_connect') }}</span>
        </div>
        <div class="w-8 h-px" :class="step === 'connect' ? 'bg-gray-200 dark:bg-gray-600' : 'bg-green-400'"></div>
        <div class="flex items-center gap-1.5">
          <div :class="step === 'room' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-400'"
               class="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors">2</div>
          <span :class="step === 'room' ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-400 dark:text-gray-500'"
                class="text-xs transition-colors">{{ $t('login.step_room') }}</span>
        </div>
      </div>

      <!-- Step 1: Connect -->
      <form v-if="step === 'connect'" @submit.prevent="handleConnect" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {{ $t('login.hub_url') }}
          </label>
          <input
            v-model="form.url"
            type="url"
            placeholder="https://your-hub.example.com"
            required
            class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {{ $t('login.api_key') }}
          </label>
          <div class="relative">
            <input
              v-model="form.apiKey"
              :type="showKey ? 'text' : 'password'"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
              class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
            <button
              type="button"
              @click="showKey = !showKey"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              tabindex="-1"
            >{{ showKey ? '🙈' : '👁' }}</button>
          </div>
        </div>

        <p v-if="error" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          ⚠ {{ error }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-2"
        >
          <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          {{ loading ? $t('login.connecting') : $t('login.connect') }}
        </button>
      </form>

      <!-- Step 2: Select Room -->
      <div v-else-if="step === 'room'" class="space-y-4">
        <div v-if="rooms.length === 0" class="text-center text-gray-500 dark:text-gray-400 text-sm py-6">
          {{ $t('login.no_rooms') }}
        </div>

        <div v-else class="space-y-2">
          <button
            v-for="room in rooms"
            :key="room.id"
            @click="handleSelectRoom(room.id)"
            class="w-full text-left border border-gray-200 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl px-4 py-3.5 transition group"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">💬</span>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-gray-800 dark:text-gray-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">{{ room.name }}</div>
                <div class="text-xs text-gray-400 font-mono mt-0.5 truncate">{{ room.id }}</div>
              </div>
              <span class="text-indigo-400 opacity-0 group-hover:opacity-100 transition text-sm">→</span>
            </div>
          </button>
        </div>

        <button
          @click="step = 'connect'; error = ''"
          class="w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1 transition"
        >
          {{ $t('login.back') }}
        </button>
      </div>

      <!-- Footer -->
      <p class="text-xs text-center text-gray-400 mt-7">
        {{ $t('login.disclaimer') }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { saveConnection, saveRoomId, getPincerBase, getApiKey, BUILD_TIME_BASE } from '../config'
import { fetchAgents, fetchRooms } from '../api'

const { t } = useI18n()
const emit = defineEmits(['logged-in'])

const form = ref({
  url: getPincerBase() || BUILD_TIME_BASE,
  apiKey: getApiKey(),
})

const step = ref('connect')
const rooms = ref([])
const loading = ref(false)
const error = ref('')
const showKey = ref(false)

async function handleConnect() {
  error.value = ''
  loading.value = true
  try {
    saveConnection({ url: form.value.url, apiKey: form.value.apiKey })
    await fetchAgents()
    const data = await fetchRooms()
    rooms.value = Array.isArray(data) ? data : (data.rooms || [])
    if (rooms.value.length === 1) {
      handleSelectRoom(rooms.value[0].id)
      return
    }
    step.value = 'room'
  } catch (e) {
    error.value = t('login.connect_error', { msg: e.message })
  } finally {
    loading.value = false
  }
}

function handleSelectRoom(roomId) {
  saveRoomId(roomId)
  emit('logged-in')
}
</script>
