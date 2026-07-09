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

// ── Pillar 2: Resume Intelligence ──────────────────────────────────────────

/**
 * Upload a PDF or DOCX resume for indexing.
 * @param {File} file - The file object from an <input type="file"> or drop event.
 * @param {string} userId - Unique user identifier (default: 'local_user').
 */
export const uploadResume = async (file, userId = 'local_user') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', userId)

    const response = await fetch(`${API_BASE}/resume/upload`, {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type — browser sets it with boundary automatically
    })

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.error || `Upload failed: ${response.status}`)
    }

    return data
}

/**
 * Check whether a user's resume has been indexed.
 * @param {string} userId
 */
export const getResumeStatus = async (userId = 'local_user') => {
    const response = await fetch(`${API_BASE}/resume/status/${userId}`)
    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.error || `Status check failed: ${response.status}`)
    }

    return data
}

/**
 * Semantic query over the user's indexed resume.
 * @param {string} query - Natural language query.
 * @param {string} userId
 * @param {number} nResults - Number of chunks to return.
 */
export const queryResume = async (query, userId = 'local_user', nResults = 5) => {
    const response = await fetch(`${API_BASE}/resume/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, query, n_results: nResults }),
    })

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.error || `Query failed: ${response.status}`)
    }

    return data.results || []
}

