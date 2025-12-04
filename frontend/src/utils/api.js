import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout (reduced for faster feedback)
})

// Add request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - Backend server may not be running')
    } else if (error.message === 'Network Error') {
      console.error('Network error - Cannot connect to backend at', API_BASE_URL)
    }
    return Promise.reject(error)
  }
)

// Emission tracking
export const trackEmission = async (activityType, durationSeconds, metadata = {}) => {
  const response = await api.post('/api/track-emission', {
    activity_type: activityType,
    duration_seconds: durationSeconds,
    metadata,
  })
  return response.data
}

export const getEmissions = async (date = 'today') => {
  const response = await api.get(`/api/emissions/${date}`)
  return response.data
}

export const getEmissionSummary = async (days = 7, includeDemo = false, allHistory = false) => {
  const params = new URLSearchParams({
    days: days.toString(),
    include_demo: includeDemo.toString(),
    ...(allHistory && { all_history: 'true' })
  })
  const response = await api.get(`/api/emissions/summary?${params}`)
  return response.data
}

// Code analysis
export const analyzeCode = async (code, language = 'python') => {
  // Use longer timeout for code analysis
  const response = await api.post('/api/analyze-code', {
    code,
    language,
  }, {
    timeout: 15000 // 15 seconds for code analysis
  })
  return response.data
}

export const uploadCode = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/api/upload-code', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 15000 // 15 seconds for file upload and analysis
  })
  return response.data
}

// System metrics
export const getSystemMetrics = async () => {
  const response = await api.get('/api/system-metrics')
  return response.data
}

export default api

