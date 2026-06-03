const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export const searchJobs = async (query) => {
    const response = await fetch(`${API_BASE}/jobs/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    })

    const data = await response.json()

    if (!response.ok) {
        // Throw with the server's error message so the UI can display it
        throw new Error(data.error || `Server error: ${response.status}`)
    }

    return data.jobs || []
}
