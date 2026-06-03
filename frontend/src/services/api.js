const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export async function fetchJobs(query) {
  const response = await fetch(`${API_BASE}/jobs?search=${encodeURIComponent(query)}`)
  return response.json()
}
