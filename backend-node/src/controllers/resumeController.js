/**
 * resumeController.js
 * ───────────────────
 * Handles proxying resume-related requests from the frontend to the
 * Python FastAPI AI service (services-python).
 *
 * The Node backend acts as an orchestration relay — the frontend never
 * communicates with Python directly.
 */

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'

/**
 * POST /resume/upload
 * Receives multipart/form-data from the frontend and forwards it to
 * the Python service's /resume/upload endpoint.
 */
export async function uploadResume(req, res) {
    try {
        // req.file is populated by multer middleware (configured in the route)
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' })
        }

        const userId = req.body.user_id || 'local_user'

        // Build a FormData payload to forward to Python
        const { FormData, Blob } = await import('node-fetch')
        const fetch = (await import('node-fetch')).default

        const form = new FormData()
        form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname)
        form.append('user_id', userId)

        const pythonRes = await fetch(`${PYTHON_SERVICE_URL}/resume/upload`, {
            method: 'POST',
            body: form,
        })

        const data = await pythonRes.json()

        if (!pythonRes.ok) {
            return res.status(pythonRes.status).json({
                error: data.detail || 'Python service error during resume upload.',
            })
        }

        return res.json(data)

    } catch (err) {
        console.error('[resumeController] uploadResume error:', err)
        return res.status(500).json({ error: 'Failed to process resume upload.', details: err.message })
    }
}

/**
 * GET /resume/status/:userId
 * Proxies to Python service to check if a user has an indexed resume.
 */
export async function getResumeStatus(req, res) {
    try {
        const { userId } = req.params
        const fetch = (await import('node-fetch')).default

        const pythonRes = await fetch(`${PYTHON_SERVICE_URL}/resume/status/${userId}`)
        const data = await pythonRes.json()

        if (!pythonRes.ok) {
            return res.status(pythonRes.status).json({
                error: data.detail || 'Could not fetch resume status.',
            })
        }

        return res.json(data)

    } catch (err) {
        console.error('[resumeController] getResumeStatus error:', err)
        return res.status(500).json({ error: 'Failed to fetch resume status.', details: err.message })
    }
}

/**
 * POST /resume/query
 * Semantic search over a user's stored resume profile.
 * Used internally by other pillars (job matching, cover letters, etc.).
 */
export async function queryResume(req, res) {
    try {
        const { user_id = 'local_user', query, n_results = 5 } = req.body

        if (!query) {
            return res.status(400).json({ error: 'Query is required.' })
        }

        const fetch = (await import('node-fetch')).default

        const pythonRes = await fetch(`${PYTHON_SERVICE_URL}/resume/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id, query, n_results }),
        })

        const data = await pythonRes.json()

        if (!pythonRes.ok) {
            return res.status(pythonRes.status).json({
                error: data.detail || 'Python service error during resume query.',
            })
        }

        return res.json(data)

    } catch (err) {
        console.error('[resumeController] queryResume error:', err)
        return res.status(500).json({ error: 'Failed to query resume.', details: err.message })
    }
}
