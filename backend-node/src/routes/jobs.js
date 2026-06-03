import express from 'express'
import { exec } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const router = express.Router()

router.post('/search', (req, res) => {
    const { query } = req.body

    if (!query) return res.status(400).json({ error: 'Query is required' })

    const scriptPath = path.resolve(__dirname, '../../../services-python/app/services/job_agent.py')
    const isWindows = process.platform === 'win32'
    const pythonExecutable = process.env.PYTHON_EXECUTABLE || (isWindows ? 'python' : 'python3')

    exec(`"${pythonExecutable}" "${scriptPath}" "${query}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing Python: ${error.message}`)
            console.error(stderr)
            return res.status(500).json({ error: 'Failed to run AI agent' })
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
    })
})

export default router
