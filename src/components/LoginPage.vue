<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center px-4">
    <div class="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
      <!-- Logo + Title -->
      <div class="flex flex-col items-center mb-8">
        <span class="text-4xl mb-3">🦀</span>
        <h1 class="text-2xl font-bold text-gray-800">Pincer Monitor</h1>
        <p class="text-sm text-gray-500 mt-1">连接到你的 Pincer Hub</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-5">
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

        <!-- Room ID -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Room ID
            <span class="text-gray-400 font-normal">(可选)</span>
          </label>
          <input
            v-model="form.roomId"
            type="text"
            placeholder="user:xxxx:default"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          <p class="text-xs text-gray-400 mt-1">不填则不显示群聊消息流</p>
        </div>

        <!-- Error -->
        <p v-if="error" class="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
          ⚠ {{ error }}
        </p>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition text-sm"
        >
          {{ loading ? '连接中…' : '连接' }}
        </button>
      </form>

      <!-- Footer note -->
      <p class="text-xs text-center text-gray-400 mt-6">
        配置保存在浏览器 localStorage，不会上传
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { saveConfig, getPincerBase, getApiKey, getRoomId } from '../config'
import { fetchAgents } from '../api'

const emit = defineEmits(['logged-in'])

const form = ref({
  url: getPincerBase(),
  apiKey: getApiKey(),
  roomId: getRoomId(),
})

const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  loading.value = true

  try {
    // Save first so getClient() uses the new values
    saveConfig({ url: form.value.url, apiKey: form.value.apiKey, roomId: form.value.roomId })

    // Test connection
    await fetchAgents()

    emit('logged-in')
  } catch (e) {
    error.value = `连接失败：${e.message}。请检查 URL 和 API Key 是否正确。`
  } finally {
    loading.value = false
  }
}
</script>
