<template>
  <div class="bg-white rounded-xl shadow p-4">
    <div class="font-semibold text-gray-700 mb-3">任务看板</div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-gray-400 border-b">
            <th class="pb-2 pr-4">ID</th>
            <th class="pb-2 pr-4">Title</th>
            <th class="pb-2 pr-4">Status</th>
            <th class="pb-2 pr-4">Assigned</th>
            <th class="pb-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in store.tasks" :key="task.id" class="border-b hover:bg-gray-50">
            <td class="py-2 pr-4 font-mono text-xs text-gray-400">{{ task.id?.slice(0,8) }}</td>
            <td class="py-2 pr-4 text-gray-800 max-w-xs truncate">{{ task.title || task.description }}</td>
            <td class="py-2 pr-4">
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="statusClass(task.status)"
              >{{ task.status }}</span>
            </td>
            <td class="py-2 pr-4 font-mono text-xs text-gray-400">
              {{ task.assigned_agent_id?.slice(0,8) || '—' }}
            </td>
            <td class="py-2 text-xs text-gray-400">{{ formatTime(task.updated_at) }}</td>
          </tr>
          <tr v-if="!store.tasks.length">
            <td colspan="5" class="py-8 text-center text-gray-400">No active tasks</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { usePincerStore } from '../stores/pincer'

const store = usePincerStore()

function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function statusClass(status) {
  const map = {
    active: 'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}
</script>
