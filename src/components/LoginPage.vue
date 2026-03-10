<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center px-4">
    <div class="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
      <!-- Logo + Title -->
      <div class="flex flex-col items-center mb-8">
        <span class="text-4xl mb-3">🦀</span>
        <h1 class="text-2xl font-bold text-gray-800">Pincer Monitor</h1>
        <p class="text-sm text-gray-500 mt-1">
          {{ step === 'connect' ? '连接到你的 Pincer Hub' : '选择监控的 Room' }}
        </p>
      </div>

      <!-- Step 1: Connect -->
      <form v-if="step === 'connect'" @submit.prevent="handleConnect" class="space-y-5">
        <!-- Pincer URL -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Pincer Hub URL
          </label>
          <input
            v-model="form.url"
            type="url"
            placeholder="http://10.0.1.10:8080"
            required
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        <!-- API Key -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <input
            v-model="form.apiKey"
            type="password"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            required
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        <!-- Error -->
        <p v-if="error" class="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
          ⚠ {{ error }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition text-sm"
        >
          {{ loading ? '连接中…' : '连接' }}
        </button>
      </form>

      <!-- Step 2: Select Room -->
      <div v-else-if="step === 'room'" class="space-y-4">
        <div v-if="rooms.length === 0" class="text-center text-gray-500 text-sm py-4">
          没有找到任何 Room
        </div>

        <div v-else class="space-y-2">
          <button
            v-for="room in rooms"
            :key="room.id"
            @click="handleSelectRoom(room.id)"
            class="w-full text-left border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-lg px-4 py-3 transition group"
          >
            <div class="font-medium text-gray-800 group-hover:text-indigo-700">{{ room.name }}</div>
            <div class="text-xs text-gray-400 font-mono mt-0.5 truncate">{{ room.id }}</div>
          </button>
        </div>

        <button
          @click="step = 'connect'; error = ''"
          class="w-full text-sm text-gray-400 hover:text-gray-600 py-1 transition"
        >
          ← 返回重新连接
        </button>
      </div>

      <!-- Footer -->
      <p class="text-xs text-center text-gray-400 mt-6">
        配置保存在浏览器 localStorage，不会上传
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { saveConnection, saveRoomId, saveHumanAgentId, getHumanAgentId, getPincerBase, getApiKey, BUILD_TIME_BASE } from '../config'
import { fetchAgents, fetchRooms, registerHuman } from '../api'

const emit = defineEmits(['logged-in'])

// Pre-fill URL: existing localStorage value or VITE_PINCER_BASE
const form = ref({
  url: getPincerBase() || BUILD_TIME_BASE,
  apiKey: getApiKey(),
})

const step = ref('connect')
const rooms = ref([])
const loading = ref(false)
const error = ref('')

async function handleConnect() {
  error.value = ''
  loading.value = true

  try {
    // Persist credentials so getClient() picks them up
    saveConnection({ url: form.value.url, apiKey: form.value.apiKey })

    // Verify connection
    await fetchAgents()

    // Fetch rooms for next step
    const data = await fetchRooms()
    rooms.value = Array.isArray(data) ? data : (data.rooms || [])

    // If only one room, auto-select it
    if (rooms.value.length === 1) {
      handleSelectRoom(rooms.value[0].id)
      return
    }

    step.value = 'room'
  } catch (e) {
    error.value = `连接失败：${e.message}。请检查 URL 和 API Key 是否正确。`
  } finally {
    loading.value = false
  }
}

function handleSelectRoom(roomId) {
  saveRoomId(roomId)
  // Register human agent if not already done
  if (!getHumanAgentId()) {
    registerHuman('You').then(data => {
      if (data?.id) saveHumanAgentId(data.id)
    }).catch(() => { /* non-fatal */ })
  }
  emit('logged-in')
}
</script>
