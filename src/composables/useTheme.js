import { ref } from 'vue'

const theme = ref(localStorage.getItem('pincer_theme') || 'light')

// Apply on module load so dark class is set before Vue mounts
if (theme.value === 'dark') {
  document.documentElement.classList.add('dark')
}

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    if (theme.value === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('pincer_theme', theme.value)
  }

  return { theme, toggleTheme }
}
