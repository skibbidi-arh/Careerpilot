import express from 'express'
import { execFile } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const router = express.Router()

router.post('/search', (req, res) => {
    const { query } = req.body

    if (!query) return res.status(400).json({ error: 'Query is required' })

    const scriptPath = path.resolve(__dirname, '../../../services-python/app/services/job_agent.py')
    const servicesRoot = path.resolve(__dirname, '../../../services-python')
    const isWindows = process.platform === 'win32'
    // Use the project's venv Python so all installed packages (pydantic, tavily, etc.) are available.
    // Falls back to system Python if PYTHON_EXECUTABLE is explicitly set.
    const venvPython = isWindows
        ? path.join(servicesRoot, 'venv', 'Scripts', 'python.exe')
        : path.join(servicesRoot, 'venv', 'bin', 'python')
    const pythonExecutable = process.env.PYTHON_EXECUTABLE || venvPython

    // Use execFile instead of exec to avoid shell interpretation of special
    // characters in the user's query (quotes, &, |, etc. would break exec).
    // Also bump maxBuffer so the Python script's stderr logs don't overflow,
    // and set a generous timeout for the web-scraping + AI extraction pipeline.
    execFile(
        pythonExecutable,
        [scriptPath, query],
        {
            maxBuffer: 10 * 1024 * 1024,   // 10 MB
            timeout: 120_000,               // 2 minutes
        },
        (error, stdout, stderr) => {
            // Log stderr always — it contains the Python script's progress messages
            if (stderr) {
                console.log(`[Python stderr]: ${stderr}`)
            }

            if (error) {
                console.error(`Error executing Python: ${error.message}`)
                // Distinguish timeout from other failures
                if (error.killed) {
                    return res.status(504).json({ error: 'AI agent timed out. Try a simpler query.' })
                }
                return res.status(500).json({ error: 'Failed to run AI agent', details: stderr || error.message })
            }

            try {
                const jsonStart = stdout.indexOf('---JSON_START---')
                const jsonEnd = stdout.indexOf('---JSON_END---')
                if (jsonStart === -1 || jsonEnd === -1) {
                    console.error('Python output markers not found. Raw output:', stdout)
                    return res.status(500).json({ error: 'Unexpected Python output format' })
                }

                const jsonStr = stdout.slice(jsonStart + '---JSON_START---'.length, jsonEnd).trim()
                const jobs = JSON.parse(jsonStr)
                res.json({ jobs })
            } catch (parseError) {
                console.error('Failed to parse Python output. Raw output was:', stdout)
                console.error(parseError)
                res.status(500).json({ error: 'Failed to parse job data' })
            }
        }
    )
})

export default router
