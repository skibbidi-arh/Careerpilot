const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export const searchJobs = async (query) => {
    try {
        const response = await fetch(`${API_BASE}/jobs/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        })

        if (!response.ok) throw new Error('Network response was not ok')

        const data = await response.json()
        return data.jobs || []
    } catch (error) {
        console.error('Error fetching jobs:', error)
        return []
    }
}
